import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Calculates similarity between two strings using Levenshtein distance
 * Returns a score between 0 and 1 (1 = exact match)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.9;
  }
  
  // Check if words match (for multi-word names)
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  
  // Check if any word matches exactly
  for (const w1 of words1) {
    for (const w2 of words2) {
      if (w1 === w2 && w1.length > 2) {
        return 0.85;
      }
    }
  }
  
  // Check if first letters match (common for nicknames)
  if (s1[0] === s2[0]) {
    // Calculate Levenshtein distance
    const matrix: number[][] = [];
    
    for (let i = 0; i <= s1.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= s2.length; j++) {
      matrix[0][j] = j;
    }
    
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
    const maxLength = Math.max(s1.length, s2.length);
    return 1 - distance / maxLength;
  }
  
  return 0;
}

/**
 * POST /api/contacts/search
 * Search contacts by name with similarity matching
 * Used by voice agent to find recipients by spoken name
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    const { query, user_id, limit = 5, min_similarity = 0.5 } = body;
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid query parameter' },
        { status: 400 }
      );
    }
    
    const searchQuery = query.trim().toLowerCase();
    console.log('🔍 Contact search query:', searchQuery);
    
    // Fetch all profiles for matching
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, phone_number, mpesa_number, gate_name, gate_id, wallet_balance, name');
    
    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      return NextResponse.json(
        { error: 'Failed to fetch contacts' },
        { status: 500 }
      );
    }
    
    // Also fetch IndexPay gates for additional contacts
    let indexPayGates: any[] = [];
    try {
      const formData = new FormData();
      formData.append('user_email', 'info@nsait.co.ke');
      
      const gatesResponse = await fetch('https://aps.co.ke/indexpay/api/get_gate_list.php', {
        method: 'POST',
        body: formData,
      });
      
      if (gatesResponse.ok) {
        const gatesText = await gatesResponse.text();
        if (gatesText.startsWith('{') || gatesText.startsWith('[')) {
          const gatesData = JSON.parse(gatesText);
          if (Array.isArray(gatesData)) {
            indexPayGates = gatesData[0]?.response || gatesData;
          } else if (gatesData?.response) {
            indexPayGates = gatesData.response;
          }
        }
      }
    } catch (err) {
      console.warn('⚠️ Could not fetch IndexPay gates:', err);
    }
    
    // Build contacts list with similarity scores
    const matches: Array<{
      id: string | null;
      name: string;
      email: string | null;
      phone: string;
      gate_name: string | null;
      gate_id: string | null;
      balance: number;
      source: string;
      similarity: number;
      match_type: string;
    }> = [];
    
    // Check local profiles
    for (const profile of profiles || []) {
      // Skip if this is the requesting user
      if (user_id && profile.id === user_id) continue;
      
      // Get display name from profile
      const displayName = profile.name || profile.email?.split('@')[0] || '';
      const email = profile.email || '';
      const phone = profile.phone_number || profile.mpesa_number || '';
      const gateName = profile.gate_name || '';
      
      // Calculate similarity for different fields
      let bestSimilarity = 0;
      let matchType = '';
      
      // Check name similarity
      if (displayName) {
        const nameSim = calculateSimilarity(searchQuery, displayName);
        if (nameSim > bestSimilarity) {
          bestSimilarity = nameSim;
          matchType = 'name';
        }
      }
      
      // Check email prefix similarity
      if (email) {
        const emailPrefix = email.split('@')[0];
        const emailSim = calculateSimilarity(searchQuery, emailPrefix);
        if (emailSim > bestSimilarity) {
          bestSimilarity = emailSim;
          matchType = 'email';
        }
      }
      
      // Check phone number (exact or partial match)
      if (phone && searchQuery.replace(/\D/g, '').length >= 4) {
        const cleanQuery = searchQuery.replace(/\D/g, '');
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.includes(cleanQuery) || cleanQuery.includes(cleanPhone)) {
          bestSimilarity = 0.95;
          matchType = 'phone';
        }
      }
      
      // Check gate name
      if (gateName) {
        const gateSim = calculateSimilarity(searchQuery, gateName);
        if (gateSim > bestSimilarity) {
          bestSimilarity = gateSim;
          matchType = 'gate_name';
        }
      }
      
      if (bestSimilarity >= min_similarity) {
        matches.push({
          id: profile.id,
          name: displayName || email?.split('@')[0] || 'Unknown',
          email: email,
          phone: phone,
          gate_name: gateName,
          gate_id: profile.gate_id,
          balance: parseFloat(String(profile.wallet_balance || 0)),
          source: 'local',
          similarity: bestSimilarity,
          match_type: matchType,
        });
      }
    }
    
    // Check IndexPay gates
    for (const gate of indexPayGates) {
      // Skip system/test gates
      if (gate.gate_name?.startsWith('gate_')) continue;
      if (gate.gate_name?.includes('test')) continue;
      
      // Skip if already matched from local profiles
      if (matches.some(m => m.gate_name === gate.gate_name)) continue;
      
      let displayName = gate.gate_description || gate.gate_name || '';
      if (displayName.startsWith('USER WALLET FOR ')) {
        displayName = displayName.replace('USER WALLET FOR ', '');
      }
      
      const nameSim = calculateSimilarity(searchQuery, displayName);
      const gateSim = calculateSimilarity(searchQuery, gate.gate_name || '');
      const bestSimilarity = Math.max(nameSim, gateSim);
      
      if (bestSimilarity >= min_similarity) {
        matches.push({
          id: null,
          name: displayName,
          email: null,
          phone: gate.gate_phone_number || '',
          gate_name: gate.gate_name,
          gate_id: gate.gate_id,
          balance: parseFloat(gate.account_balance || 0),
          source: 'indexpay',
          similarity: bestSimilarity,
          match_type: nameSim > gateSim ? 'name' : 'gate_name',
        });
      }
    }
    
    // Sort by similarity (highest first) and limit results
    matches.sort((a, b) => b.similarity - a.similarity);
    const topMatches = matches.slice(0, limit);
    
    console.log(`✅ Found ${matches.length} matches, returning top ${topMatches.length}`);
    
    // Determine if we have a confident match
    const hasConfidentMatch = topMatches.length > 0 && topMatches[0].similarity >= 0.8;
    const bestMatch = hasConfidentMatch ? topMatches[0] : null;
    
    return NextResponse.json({
      success: true,
      query: searchQuery,
      matches: topMatches,
      total_matches: matches.length,
      has_confident_match: hasConfidentMatch,
      best_match: bestMatch,
      message: hasConfidentMatch 
        ? `Found ${topMatches[0].name} with ${Math.round(topMatches[0].similarity * 100)}% confidence`
        : topMatches.length > 0 
          ? `Found ${topMatches.length} possible matches, please confirm`
          : 'No matching contacts found',
    });
    
  } catch (error: any) {
    console.error('Contact search error:', error);
    return NextResponse.json(
      { error: 'Failed to search contacts', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/contacts/search?q=name
 * Quick search endpoint for voice agent
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || searchParams.get('query') || '';
  const limit = parseInt(searchParams.get('limit') || '5');
  const userId = searchParams.get('user_id') || undefined;
  
  // Redirect to POST handler
  const fakeRequest = {
    json: async () => ({ query, limit, user_id: userId, min_similarity: 0.4 }),
  } as NextRequest;
  
  return POST(fakeRequest);
}
