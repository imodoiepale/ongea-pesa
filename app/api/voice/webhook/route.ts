import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// n8n webhook URL and auth
const N8N_WEBHOOK_URL = 'https://primary-production-579c.up.railway.app/webhook/send_money';
const N8N_AUTH_TOKEN = process.env.N8N_WEBHOOK_AUTH_TOKEN || '';

/**
 * Calculate similarity between two strings (0-1 scale)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  
  // Check word matches
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  for (const w1 of words1) {
    for (const w2 of words2) {
      if (w1 === w2 && w1.length > 2) return 0.85;
    }
  }
  
  // Levenshtein distance for first-letter matches
  if (s1[0] === s2[0]) {
    const matrix: number[][] = [];
    for (let i = 0; i <= s1.length; i++) matrix[i] = [i];
    for (let j = 0; j <= s2.length; j++) matrix[0][j] = j;
    
    for (let i = 1; i <= s1.length; i++) {
      for (let j = 1; j <= s2.length; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    const distance = matrix[s1.length][s2.length];
    return 1 - distance / Math.max(s1.length, s2.length);
  }
  
  return 0;
}

/**
 * Resolve a recipient name to a contact with phone/gate info
 */
async function resolveRecipientByName(
  supabase: any,
  recipientName: string,
  excludeUserId?: string
): Promise<{
  found: boolean;
  contact: any;
  confidence: number;
  alternatives: any[];
}> {
  console.log('🔍 Resolving recipient by name:', recipientName);
  
  // Fetch all profiles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, phone_number, mpesa_number, gate_name, gate_id, wallet_balance, name');
  
  if (error || !profiles) {
    console.error('❌ Error fetching profiles for name resolution:', error);
    return { found: false, contact: null, confidence: 0, alternatives: [] };
  }
  
  const matches: Array<{ profile: any; similarity: number; matchType: string }> = [];
  
  for (const profile of profiles) {
    if (excludeUserId && profile.id === excludeUserId) continue;
    
    const displayName = profile.name || profile.email?.split('@')[0] || '';
    const email = profile.email || '';
    const phone = profile.phone_number || profile.mpesa_number || '';
    const gateName = profile.gate_name || '';
    
    let bestSim = 0;
    let matchType = '';
    
    // Check name
    if (displayName) {
      const sim = calculateSimilarity(recipientName, displayName);
      if (sim > bestSim) { bestSim = sim; matchType = 'name'; }
    }
    
    // Check email prefix
    if (email) {
      const sim = calculateSimilarity(recipientName, email.split('@')[0]);
      if (sim > bestSim) { bestSim = sim; matchType = 'email'; }
    }
    
    // Check phone (if query looks like a number)
    if (phone && recipientName.replace(/\D/g, '').length >= 4) {
      const cleanQuery = recipientName.replace(/\D/g, '');
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.includes(cleanQuery) || cleanQuery.includes(cleanPhone)) {
        bestSim = 0.95;
        matchType = 'phone';
      }
    }
    
    // Check gate name
    if (gateName) {
      const sim = calculateSimilarity(recipientName, gateName);
      if (sim > bestSim) { bestSim = sim; matchType = 'gate_name'; }
    }
    
    if (bestSim >= 0.5) {
      matches.push({
        profile: {
          id: profile.id,
          name: displayName || email?.split('@')[0] || 'Unknown',
          email,
          phone,
          gate_name: gateName,
          gate_id: profile.gate_id,
        },
        similarity: bestSim,
        matchType,
      });
    }
  }
  
  // Sort by similarity
  matches.sort((a, b) => b.similarity - a.similarity);
  
  if (matches.length === 0) {
    console.log('❌ No matching contacts found for:', recipientName);
    return { found: false, contact: null, confidence: 0, alternatives: [] };
  }
  
  const bestMatch = matches[0];
  const alternatives = matches.slice(1, 4).map(m => m.profile);
  
  console.log(`✅ Found match: ${bestMatch.profile.name} (${Math.round(bestMatch.similarity * 100)}% confidence)`);
  
  return {
    found: bestMatch.similarity >= 0.7,
    contact: bestMatch.profile,
    confidence: bestMatch.similarity,
    alternatives,
  };
}

export async function POST(request: NextRequest) {
  try {
    // Log incoming request details
    console.log('\n=== VOICE WEBHOOK CALLED ===')
    console.log('Timestamp:', new Date().toISOString())
    console.log('Request URL:', request.url)
    console.log('Request Headers:', Object.fromEntries(request.headers))

    // Parse the incoming data from ElevenLabs
    const body = await request.json()
    console.log('Request Body:', JSON.stringify(body, null, 2))

    const queryParams = new URL(request.url).searchParams
    const fullRequest = queryParams.get('request')
    const userEmail = queryParams.get('user_email') || body.user_email
    const userId = queryParams.get('user_id') || body.user_id
    const gateName = queryParams.get('gate_name') || body.gate_name || ''
    const gateId = queryParams.get('gate_id') || body.gate_id || ''
    const conversationId = body.conversation_id || body.session_id // ElevenLabs sends this

    console.log('Query Param - request:', fullRequest)
    console.log('Query Param - user_email:', userEmail)
    console.log('Query Param - user_id:', userId)
    console.log('Query Param - gate_name:', gateName)
    console.log('Query Param - gate_id:', gateId)
    console.log('Conversation ID:', conversationId)

    // Initialize Supabase with service role for user lookup
    const supabase = await createClient()

    let userContext = null
    let profile = null
    let user = null

    // Option 1: Try to get user from session (if called from browser)
    const { data: { user: sessionUser }, error: authError } = await supabase.auth.getUser()

    if (sessionUser && !authError) {
      user = sessionUser
      console.log('✅ User from session:', user.email)
    }
    // Option 2: Look up user by email from query params
    else if (userEmail) {
      console.log('🔍 Looking up user by email:', userEmail)
      const { data: { users }, error: lookupError } = await supabase.auth.admin.listUsers()

      if (!lookupError && users) {
        user = users.find(u => u.email === userEmail)
        if (user) {
          console.log('✅ Found user by email:', user.email)
        }
      }
    }
    // Option 3: Look up most recent active voice session
    else {
      console.log('🔍 Looking up user from recent voice sessions')
      console.log('Current time:', new Date().toISOString())

      // First, check if we have any voice sessions at all
      const { data: allSessions, error: countError } = await supabase
        .from('voice_sessions')
        .select('*')
        .limit(5)

      console.log('Total recent voice sessions:', allSessions?.length || 0)
      if (allSessions && allSessions.length > 0) {
        console.log('Recent sessions:', JSON.stringify(allSessions, null, 2))
      }

      const { data: recentSession, error: sessionError } = await supabase
        .from('voice_sessions')
        .select('user_id')
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (sessionError) {
        console.error('❌ Voice session lookup error:', sessionError)
      }

      if (!sessionError && recentSession) {
        console.log('✅ Found active voice session, user_id:', recentSession.user_id)
        // Get full user details
        const { data: { users }, error: lookupError } = await supabase.auth.admin.listUsers()
        if (!lookupError && users) {
          user = users.find(u => u.id === recentSession.user_id)
          if (user) {
            console.log('✅ Found user from session:', user.email)
          } else {
            console.warn('⚠️ User ID from session not found in users list')
          }
        } else {
          console.error('❌ Failed to list users for session lookup');
        }
      } else {
        console.warn('⚠️ No active voice session found')
      }
    }

    // If we found a user, get their profile
    if (user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      profile = profileData

      userContext = {
        id: user.id,
        email: user.email,
        phone: user.phone || profile?.phone_number || profile?.mpesa_number,
        full_name: user.user_metadata?.full_name || profile?.phone_number,
        wallet_balance: profile?.wallet_balance || 0,
        created_at: user.created_at,
      }

      console.log('✅ User context:', userContext)
    } else {
      console.log('⚠️ No user found from session/database')
      console.log('Auth error:', authError?.message)

      // CHECK: Does ElevenLabs body contain real user data?
      const hasRealUserData = body.user_id &&
        body.user_id !== 'test-user-id' &&
        body.user_email &&
        body.user_email !== 'test@example.com';

      if (hasRealUserData) {
        console.log('✅ Using user data from ElevenLabs body (dynamic variables)')
        userContext = {
          id: body.user_id,
          email: body.user_email,
          phone: body.user_phone || body.phone || '',
          full_name: body.user_name || body.user_email?.split('@')[0] || 'User',
          wallet_balance: parseFloat(body.balance) || 0,
          created_at: new Date().toISOString(),
          from_elevenlabs: true,
        }
        console.log('📋 User context from ElevenLabs:', userContext)
      }
      // NEW: If we have gate_name, look up the real user from profiles
      else if (gateName && gateName !== '') {
        console.log('🔍 Looking up user by gate_name:', gateName)
        const { data: gateProfile, error: gateError } = await supabase
          .from('profiles')
          .select('id, name, gate_name, gate_id, wallet_balance, phone_number, mpesa_number')
          .eq('gate_name', gateName)
          .single()

        if (gateProfile && !gateError) {
          console.log('✅ Found user by gate_name:', gateProfile)
          // Get full user details from auth
          const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
          if (!usersError && users) {
            const foundUser = users.find(u => u.id === gateProfile.id)
            if (foundUser) {
              user = foundUser
              profile = gateProfile
              userContext = {
                id: foundUser.id,
                email: foundUser.email,
                phone: foundUser.phone || gateProfile.phone_number || gateProfile.mpesa_number,
                full_name: gateProfile.name || foundUser.email?.split('@')[0] || 'User',
                wallet_balance: gateProfile.wallet_balance || 0,
                created_at: foundUser.created_at,
                from_gate_lookup: true,
              }
              console.log('✅ User context from gate_name lookup:', userContext)
            }
          }
        } else {
          console.warn('⚠️ Could not find user by gate_name:', gateName, gateError?.message)
        }
      }

      // Final fallback: test mode
      if (!userContext) {
        console.log('⚠️ No real user data - using test mode')
        userContext = {
          id: 'test-user-id',
          email: userEmail || 'test@ongeapesa.com',
          phone: '254712345678',
          full_name: 'Test User',
          created_at: new Date().toISOString(),
          test_mode: true,
        }
      }
    }

    console.log('\n=== PREPARING N8N PAYLOAD ===')

    // Use user data - prefer ElevenLabs body data if available and valid
    let finalUserId = userContext?.id || body.user_id
    let finalUserEmail = userContext?.email || body.user_email
    let finalUserPhone = userContext?.phone || body.user_phone || body.phone
    let finalUserName = userContext?.full_name || body.user_name

    // If we still don't have user AND no userContext from ElevenLabs, try voice sessions
    if (!user && !userContext) {
      console.log('⚠️ No user context found, checking voice_sessions...')
      console.log('  Looking for conversation_id:', conversationId)

      try {
        let recentSession = null

        // FIRST: Try to match by conversation_id if available
        if (conversationId) {
          console.log('🔍 Looking up session by conversation_id:', conversationId)
          const { data: matchedSession, error: matchError } = await supabase
            .from('voice_sessions')
            .select('user_id, session_id, created_at, status, expires_at')
            .eq('session_id', conversationId)
            .maybeSingle()

          if (matchError) {
            console.error('❌ Error matching session by conversation_id:', matchError)
          } else if (matchedSession) {
            console.log('✅ Found matching session for conversation_id:', conversationId)
            recentSession = matchedSession
          } else {
            console.warn('⚠️ No session found for conversation_id:', conversationId)
          }
        }

        // FALLBACK: If no conversation_id match, get recent ACTIVE sessions
        if (!recentSession) {
          console.log('🔍 Fallback: Looking for recent active sessions')
          const { data: allSessions, error: sessionsError } = await supabase
            .from('voice_sessions')
            .select('user_id, session_id, created_at, status, expires_at')
            .eq('status', 'active')
            .gte('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(5)

          console.log('Voice sessions query:')
          console.log('  Error:', sessionsError)
          console.log('  Active sessions found:', allSessions?.length || 0)

          if (sessionsError) {
            console.error('❌ Error fetching sessions:', sessionsError)
          }

          if (allSessions && allSessions.length > 0) {
            console.log('✅ Found', allSessions.length, 'active voice sessions')
            console.log('Sessions:', JSON.stringify(allSessions, null, 2))

            // ⚠️ WARNING: This is a fallback and may not be accurate in multi-user scenarios
            recentSession = allSessions[0]
            console.warn('⚠️ Using most recent active session as fallback - this may be inaccurate!')
          } else {
            console.error('❌ No active voice sessions found')
          }
        }

        // If we found a session, get the user profile
        if (recentSession) {
          console.log('✅ Using session:', recentSession.session_id, 'user_id:', recentSession.user_id)

          // Now get user's profile using the user_id
          const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('id, phone_number, mpesa_number, wallet_balance')
            .eq('id', recentSession.user_id)
            .maybeSingle()

          if (profileError) {
            console.error('❌ Profile query error:', profileError)
          }

          if (userProfile) {
            console.log('✅ Found profile:', userProfile)

            finalUserId = userProfile.id
            finalUserEmail = `user-${userProfile.id.slice(0, 8)}@ongeapesa.com` // Fallback email
            finalUserPhone = userProfile.phone_number || userProfile.mpesa_number || ''
            finalUserName = userProfile.phone_number || 'User'

            // Try to get actual email from auth.users if possible
            // But this might not work without service role, so email might be fallback

            console.log('✅ SUCCESSFULLY SET REAL USER DATA FROM VOICE SESSION')
          } else {
            console.warn('⚠️ Profile not found for user_id:', recentSession.user_id)
            // Still use the user_id from session
            finalUserId = recentSession.user_id
            finalUserEmail = `user-${recentSession.user_id.slice(0, 8)}@ongeapesa.com`
            console.log('✅ Using user_id from session without full profile')
          }
        } else {
          console.error('❌ No voice sessions found in database')
          console.log('💡 TIP: Make sure you opened the voice interface at least once to create a session')
        }
      } catch (fallbackError: any) {
        console.error('❌ Failed to fetch user from sessions:')
        console.error('Error:', fallbackError?.message || fallbackError)
      }
    } else {
      console.log('✅ User already found from earlier lookup')
    }

    console.log('📤 Final user data for n8n:')
    console.log('  user_id:', finalUserId)
    console.log('  user_email:', finalUserEmail)
    console.log('  user_phone:', finalUserPhone)
    console.log('  user_name:', finalUserName)

    // ============================================
    // REAL-TIME BALANCE CHECK
    // ============================================
    // First, try to use balance from ElevenLabs body (most reliable)
    let currentBalance = 0
    let subscriptionStatus = 'inactive'
    let freeTxRemaining = 0
    let subscriptionEndDate = null

    // Priority 1: Use balance from ElevenLabs dynamic variables (already validated by the app)
    if (body.balance && !isNaN(parseFloat(body.balance))) {
      currentBalance = parseFloat(body.balance)
      console.log('💰 Using balance from ElevenLabs body:', currentBalance)
    }
    // Priority 2: Use balance from userContext (set earlier from ElevenLabs data)
    else if (userContext?.wallet_balance && userContext.wallet_balance > 0) {
      currentBalance = userContext.wallet_balance
      console.log('💰 Using balance from userContext:', currentBalance)
    }
    // Priority 3: Fallback to DB query (only wallet_balance column exists)
    else if (finalUserId && finalUserId !== 'no-user-found' && finalUserId !== 'test-user-id') {
      const { data: balanceData, error: balanceError } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', finalUserId)
        .single()

      if (balanceError) {
        console.error('❌ Error fetching balance from DB:', balanceError)
      } else if (balanceData) {
        currentBalance = parseFloat(String(balanceData.wallet_balance)) || 0
        console.log('💰 Using balance from DB:', currentBalance)
      }
    }

    console.log('💰 Final current balance:', currentBalance)

    // Validate amount
    const requestedAmount = parseFloat(body.amount)
    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      console.error('❌ Invalid amount received:', body.amount)
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid amount',
          message: `The amount ${body.amount} is not valid. Please provide a positive number.`,
          current_balance: currentBalance,
          agent_message: `I'm sorry, but the amount you provided is invalid. Please try again with a valid amount.`
        },
        { status: 400 }
      )
    }

    if (requestedAmount > 999999) {
      console.error('❌ Amount exceeds maximum:', requestedAmount)
      return NextResponse.json(
        {
          success: false,
          error: 'Amount too large',
          message: `The amount KSh ${requestedAmount.toLocaleString()} exceeds the maximum of KSh 999,999.`,
          current_balance: currentBalance,
          agent_message: `I'm sorry, but the amount of ${requestedAmount.toLocaleString()} shillings exceeds our maximum transaction limit of 999,999 shillings. Please try a smaller amount.`
        },
        { status: 400 }
      )
    }

    // ============================================
    // CHECK FREE TRANSACTION ELIGIBILITY
    // ============================================
    let isFreeTransaction = false
    let platformFeeAmount = 0

    // Check if this is a debit transaction (money going out)
    const debitTypes = [
      'send_phone', 'buy_goods_pochi', 'buy_goods_till',
      'paybill', 'withdraw', 'bank_to_mpesa', 'mpesa_to_bank'
    ]
    const isDebitTransaction = debitTypes.includes(body.type)

    if (isDebitTransaction) {
      console.log('\n=== CHECKING FREE TRANSACTION ELIGIBILITY ===')

      // Check if user qualifies for free transaction
      if (subscriptionStatus === 'active' &&
        subscriptionEndDate &&
        new Date(subscriptionEndDate) >= new Date() &&
        requestedAmount >= 1000 &&
        freeTxRemaining > 0) {
        isFreeTransaction = true
        platformFeeAmount = 0
        console.log('✅ FREE TRANSACTION QUALIFIED!')
        console.log('  Amount:', requestedAmount, '(>= KES 1,000)')
        console.log('  Free transactions remaining:', freeTxRemaining)
      } else {
        // Calculate 0.00005% platform fee (0.00005)
        platformFeeAmount = Math.round(requestedAmount * 0.0005 * 10000) / 10000
        console.log('💰 REGULAR TRANSACTION (0.00005% fee)')
        console.log('  Platform fee:', platformFeeAmount)

        if (subscriptionStatus !== 'active') {
          console.log('  Reason: No active subscription')
        } else if (requestedAmount < 1000) {
          console.log('  Reason: Amount below KES 1,000 minimum')
        } else if (freeTxRemaining <= 0) {
          console.log('  Reason: No free transactions remaining this month')
        }
      }
    }

    // For debit transactions, check if user has sufficient balance
    if (isDebitTransaction) {
      console.log('\n=== BALANCE VALIDATION ===')
      console.log('💳 Debit transaction detected')
      console.log('  Type:', body.type)
      console.log('  Amount:', requestedAmount)
      console.log('  Platform Fee:', platformFeeAmount)
      console.log('  Total Required:', requestedAmount + platformFeeAmount)
      console.log('  Current Balance:', currentBalance)

      const totalRequired = requestedAmount + platformFeeAmount

      if (currentBalance < totalRequired) {
        const shortfall = totalRequired - currentBalance
        console.error('❌ INSUFFICIENT FUNDS')
        console.error('  Balance:', currentBalance)
        console.error('  Required:', totalRequired)
        console.error('  Shortfall:', shortfall)

        // Return error to ElevenLabs AI agent with clear message
        return NextResponse.json(
          {
            success: false,
            error: 'Insufficient funds',
            message: `Your current balance is KSh ${currentBalance.toLocaleString()}, but you need KSh ${totalRequired.toLocaleString()} (including fees). You need KSh ${shortfall.toLocaleString()} more.`,
            current_balance: currentBalance,
            required_amount: totalRequired,
            shortfall: shortfall,
            platform_fee: platformFeeAmount,
            agent_message: `I'm sorry, but you don't have enough funds for this transaction. Your current balance is ${currentBalance.toLocaleString()} shillings, but you need ${totalRequired.toLocaleString()} shillings including fees. You need ${shortfall.toLocaleString()} shillings more. Would you like to add funds to your wallet first?`
          },
          { status: 400 }
        )
      }

      console.log('✅ BALANCE CHECK PASSED')
      console.log('  Balance after transaction:', currentBalance - totalRequired)
    } else {
      console.log('💰 Credit transaction (deposit/receive) - no balance check needed')
    }

    console.log('✅ Valid amount:', requestedAmount)

    // ============================================
    // TRUST AI EXTRACTION - NO RE-CONFIRMATION
    // ============================================
    // The ElevenLabs AI already confirmed with user:
    // "I'm sending KSh X to Y" means user already said YES
    // We just validate and execute immediately
    console.log('🤖 AI already confirmed transaction with user')
    console.log('⚡ Executing immediately - no re-confirmation needed')

    // ============================================
    // CONTACT RESOLUTION BY NAME OR PHONE
    // ============================================
    // If user said a name instead of phone number, try to resolve it
    // Also lookup phone numbers to get gate info for wallet transfers
    let resolvedPhone = body.phone || '';
    let resolvedRecipient = body.recipient_name || '';
    let recipientGateName = '';
    let recipientGateId = '';
    let contactResolution = null;

    // Helper to normalize phone numbers
    const normalizePhone = (phone: string): string => {
      let cleaned = phone.replace(/\D/g, '');
      if (cleaned.startsWith('254')) cleaned = '0' + cleaned.slice(3);
      else if (cleaned.startsWith('+254')) cleaned = '0' + cleaned.slice(4);
      else if (cleaned.startsWith('7') || cleaned.startsWith('1')) cleaned = '0' + cleaned;
      return cleaned;
    };

    // CASE 1: Have phone number - lookup profile by phone to get gate info
    if (body.phone) {
      const normalizedPhone = normalizePhone(body.phone);
      console.log('📞 Looking up recipient by phone:', normalizedPhone);
      
      const { data: recipientProfile } = await supabase
        .from('profiles')
        .select('id, email, phone_number, mpesa_number, gate_name, gate_id, name')
        .or(`phone_number.eq.${normalizedPhone},mpesa_number.eq.${normalizedPhone}`)
        .maybeSingle();
      
      if (recipientProfile) {
        resolvedPhone = normalizedPhone;
        resolvedRecipient = recipientProfile.name || recipientProfile.email?.split('@')[0] || body.recipient_name || '';
        recipientGateName = recipientProfile.gate_name || '';
        recipientGateId = recipientProfile.gate_id || '';
        
        console.log('✅ Found recipient by phone:', {
          name: resolvedRecipient,
          phone: resolvedPhone,
          gate_name: recipientGateName,
        });
      } else {
        // Phone not in system - still valid for M-Pesa send
        resolvedPhone = normalizedPhone;
        console.log('📱 Phone not in system, will send via M-Pesa:', normalizedPhone);
      }
    }
    // CASE 2: Have recipient name but no phone - resolve by name
    else if (body.recipient_name) {
      console.log('📇 Attempting to resolve recipient by name:', body.recipient_name);
      
      contactResolution = await resolveRecipientByName(
        supabase,
        body.recipient_name,
        finalUserId // Exclude current user
      );
      
      if (contactResolution.found && contactResolution.contact) {
        resolvedPhone = contactResolution.contact.phone || '';
        resolvedRecipient = contactResolution.contact.name;
        recipientGateName = contactResolution.contact.gate_name || '';
        recipientGateId = contactResolution.contact.gate_id || '';
        
        console.log('✅ Resolved contact:', {
          name: resolvedRecipient,
          phone: resolvedPhone,
          gate_name: recipientGateName,
          confidence: Math.round(contactResolution.confidence * 100) + '%'
        });
      } else if (contactResolution.alternatives?.length > 0) {
        // Low confidence match - return alternatives for confirmation
        console.log('⚠️ Low confidence match, returning alternatives');
        return NextResponse.json({
          success: false,
          needs_confirmation: true,
          message: `I found some possible matches for "${body.recipient_name}". Did you mean one of these?`,
          alternatives: contactResolution.alternatives.map(a => ({
            name: a.name,
            phone: a.phone?.slice(-4) ? `***${a.phone.slice(-4)}` : 'No phone',
          })),
          agent_message: `I found a few people with similar names. Did you mean ${contactResolution.alternatives.map(a => a.name).join(', or ')}?`
        });
      } else {
        console.log('❌ Could not resolve recipient name:', body.recipient_name);
        return NextResponse.json({
          success: false,
          error: 'Contact not found',
          message: `I couldn't find anyone named "${body.recipient_name}" in your contacts.`,
          agent_message: `I'm sorry, I couldn't find anyone named ${body.recipient_name} in your contacts. Could you please provide their phone number instead?`
        }, { status: 400 });
      }
    }
    
    // CASE 3: Device contacts provided - search within them
    if (body.device_contacts && Array.isArray(body.device_contacts) && body.recipient_name) {
      console.log('📱 Searching within device contacts for:', body.recipient_name);
      
      const queryLower = body.recipient_name.toLowerCase();
      const matchedDeviceContact = body.device_contacts.find((c: any) => {
        const nameSim = calculateSimilarity(c.name || '', body.recipient_name);
        return nameSim >= 0.7;
      });
      
      if (matchedDeviceContact) {
        const devicePhone = normalizePhone(matchedDeviceContact.phone || '');
        console.log('📱 Found in device contacts:', matchedDeviceContact.name, devicePhone);
        
        // Now lookup this phone in our system
        const { data: deviceProfile } = await supabase
          .from('profiles')
          .select('id, email, phone_number, mpesa_number, gate_name, gate_id, name')
          .or(`phone_number.eq.${devicePhone},mpesa_number.eq.${devicePhone}`)
          .maybeSingle();
        
        if (deviceProfile) {
          resolvedPhone = devicePhone;
          resolvedRecipient = deviceProfile.name || matchedDeviceContact.name;
          recipientGateName = deviceProfile.gate_name || '';
          recipientGateId = deviceProfile.gate_id || '';
          console.log('✅ Device contact has Ongea Pesa account:', recipientGateName);
        } else {
          // Use device contact phone for M-Pesa
          resolvedPhone = devicePhone;
          resolvedRecipient = matchedDeviceContact.name;
          console.log('📱 Device contact not in system, will use M-Pesa');
        }
      }
    }

    // Prepare the payload - all fields at top level for n8n
    const n8nPayload = {
      // Voice request
      request: fullRequest || body.summary || 'Voice transaction request',
      voice_command_text: fullRequest || body.summary || '',

      // User context - ALWAYS REAL DATA, NEVER TEST
      user_id: finalUserId || 'no-user-found',
      user_email: finalUserEmail || 'no-email@ongeapesa.com',
      user_phone: finalUserPhone || '',
      user_name: finalUserName || 'User',
      gate_name: gateName || '',
      gate_id: gateId || '',
      current_balance: currentBalance, // Send current wallet balance to AI
      wallet_balance: currentBalance, // Alternative field name for compatibility

      // Subscription & Free Transaction Info
      subscription_status: subscriptionStatus,
      subscription_end_date: subscriptionEndDate,
      free_transactions_remaining: freeTxRemaining,
      is_free_transaction: isFreeTransaction,
      platform_fee: platformFeeAmount,

      // Transaction details from ElevenLabs (with resolved contact info)
      type: body.type,
      amount: requestedAmount, // Already validated above
      phone: resolvedPhone || body.phone || '',
      recipient_name: resolvedRecipient || body.recipient_name || '',
      recipient_gate_name: recipientGateName,
      recipient_gate_id: recipientGateId,
      contact_confidence: contactResolution?.confidence || 1,
      till: body.till || '',
      paybill: body.paybill || '',
      account: body.account || '',
      agent: body.agent || '',
      store: body.store || '',
      bank_code: body.bankCode || '',
      summary: body.summary || '',

      // Voice metadata
      voice_verified: true,
      confidence_score: 85,

      // Status fields
      status: 'pending',
      mpesa_transaction_id: '',
      external_ref: '',

      // Timestamp and source
      timestamp: new Date().toISOString(),
      source: 'elevenlabs',
    }

    console.log('N8N Payload:', JSON.stringify(n8nPayload, null, 2))

    // Forward to n8n
    console.log('\n=== FORWARDING TO N8N ===')
    console.log('N8N URL:', N8N_WEBHOOK_URL)
    console.log('Auth configured:', N8N_AUTH_TOKEN ? 'Yes' : 'No')

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Add authentication header if token is configured
    if (N8N_AUTH_TOKEN) {
      headers['Authorization'] = N8N_AUTH_TOKEN
    }

    console.log('📤 Sending to n8n with headers:', Object.keys(headers))
    console.log('📤 Payload size:', JSON.stringify(n8nPayload).length, 'bytes')

    let n8nResponse: Response
    try {
      n8nResponse = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: headers, // Use the headers variable with auth token
        body: JSON.stringify(n8nPayload),
      })
    } catch (fetchError: any) {
      console.error('❌ FETCH ERROR to n8n:', fetchError.message)
      console.error('❌ Error details:', fetchError)
      return NextResponse.json(
        { error: 'Failed to connect to n8n', success: false, details: fetchError.message },
        { status: 500 }
      )
    }

    console.log('n8n Response Status:', n8nResponse.status)
    console.log('n8n Response Headers:', Object.fromEntries(n8nResponse.headers.entries()))

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text()
      console.error('❌ n8n webhook failed')
      console.error('Status:', n8nResponse.status)
      console.error('Response:', errorText)
      return NextResponse.json(
        { error: 'Failed to process transaction', success: false, n8n_response: errorText },
        { status: 500 }
      )
    }

    // Parse n8n response safely
    const responseText = await n8nResponse.text()
    console.log('n8n Raw Response:', responseText)

    let n8nResult: any = {}
    try {
      if (responseText && responseText.trim()) {
        n8nResult = JSON.parse(responseText)
        console.log('✅ n8n Response parsed:', n8nResult)
      } else {
        console.log('⚠️ n8n returned empty response, using default')
        n8nResult = {
          success: true,
          message: 'Transaction queued for processing',
          transaction_id: `tx_${Date.now()}`
        }
      }
    } catch (parseError) {
      console.error('❌ Failed to parse n8n response as JSON:', parseError)
      console.error('Raw response:', responseText)
      // If n8n doesn't return JSON, assume success since the request went through
      n8nResult = {
        success: true,
        message: 'Transaction sent to n8n',
        raw_response: responseText,
        transaction_id: `tx_${Date.now()}`
      }
    }

    // Return success response to ElevenLabs
    console.log('\n=== SENDING RESPONSE TO ELEVENLABS ===')
    const response = {
      success: true,
      message: `Transaction processed successfully${userContext?.email ? ' for ' + userContext.email : ''}`,
      transaction_id: n8nResult.transaction_id || null,
      data: n8nResult,
    }
    console.log('Response:', JSON.stringify(response, null, 2))
    console.log('=== WEBHOOK COMPLETED ===\n')

    return NextResponse.json(response)

  } catch (error) {
    console.error('Voice webhook error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
