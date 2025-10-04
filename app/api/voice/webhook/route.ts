import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// n8n webhook URL and auth
const N8N_WEBHOOK_URL = 'https://primary-production-579c.up.railway.app/webhook/send_money'
const N8N_AUTH_TOKEN = process.env.N8N_WEBHOOK_AUTH_TOKEN || '' // Add this to .env.local

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
    
    console.log('Query Param - request:', fullRequest)
    console.log('Query Param - user_email:', userEmail)
    console.log('Query Param - user_id:', userId)
    
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
          console.error('❌ Failed to list users:', lookupError)
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
      console.log('⚠️ No user found - using test mode')
      console.log('Auth error:', authError?.message)
      
      // For testing: use your actual email if provided, otherwise mock
      userContext = {
        id: 'test-user-id',
        email: userEmail || 'test@ongeapesa.com',
        phone: '254712345678',
        full_name: 'Test User',
        created_at: new Date().toISOString(),
        test_mode: true,
      }
    }

    console.log('\n=== PREPARING N8N PAYLOAD ===')
    
    // ALWAYS use real user data - override any test data from ElevenLabs
    let finalUserId = userContext?.id
    let finalUserEmail = userContext?.email
    let finalUserPhone = userContext?.phone
    let finalUserName = userContext?.full_name
    
    // If we still don't have user, try to find from saved voice sessions
    if (!user) {
      console.log('⚠️ No user context found, checking ALL voice_sessions (no filters)...')
      try {
        // Query voice_sessions without RLS - just get the data
        const { data: allSessions, error: sessionsError } = await supabase
          .from('voice_sessions')
          .select(`
            user_id,
            session_id,
            created_at,
            status,
            expires_at
          `)
          .order('created_at', { ascending: false })
          .limit(10)
        
        console.log('Voice sessions query:')
        console.log('  Error:', sessionsError)
        console.log('  Sessions found:', allSessions?.length || 0)
        
        if (sessionsError) {
          console.error('❌ Error fetching sessions:', sessionsError)
        }
        
        if (allSessions && allSessions.length > 0) {
          console.log('✅ Found', allSessions.length, 'voice sessions')
          console.log('Sessions:', JSON.stringify(allSessions.slice(0, 3), null, 2))
          
          // Get the most recent session
          const recentSession = allSessions[0]
          console.log('✅ Most recent session:', recentSession.session_id, 'user_id:', recentSession.user_id)
          
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
      
      // Transaction details from ElevenLabs
      type: body.type,
      amount: body.amount ? parseFloat(body.amount) : 0,
      phone: body.phone || '',
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
    
    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(n8nPayload),
    })

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text()
      console.error('❌ n8n webhook failed')
      console.error('Status:', n8nResponse.status)
      console.error('Response:', errorText)
      return NextResponse.json(
        { error: 'Failed to process transaction', success: false },
        { status: 500 }
      )
    }

    const n8nResult = await n8nResponse.json()
    console.log('✅ n8n Response:', n8nResult)

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

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
