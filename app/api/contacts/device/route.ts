import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Normalize phone number to Kenyan format (07XXXXXXXX or 01XXXXXXXX)
 */
function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('254')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('+254')) {
    cleaned = '0' + cleaned.slice(4);
  } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
    cleaned = '0' + cleaned;
  }
  
  return cleaned;
}

/**
 * Calculate similarity between two strings
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  
  for (const w1 of words1) {
    for (const w2 of words2) {
      if (w1 === w2 && w1.length > 2) return 0.85;
      if (w1.startsWith(w2) || w2.startsWith(w1)) return 0.7;
    }
  }
  
  if (s1[0] === s2[0]) return 0.5;
  return 0;
}

interface DeviceContact {
  name: string;
  phone: string;
  email?: string;
}

/**
 * POST /api/contacts/device
 * 
 * Receives device contacts from PWA and finds matching recipients
 * by searching both phone numbers and names.
 * 
 * Body: {
 *   contacts: DeviceContact[] - Array of device contacts
 *   query?: string - Optional name to search for
 * }
 * 
 * Returns matched contacts with their Ongea Pesa profile info
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    const { contacts, query } = body as {
      contacts: DeviceContact[];
      query?: string;
    };
    
    if (!contacts || !Array.isArray(contacts)) {
      return NextResponse.json(
        { error: 'Missing or invalid contacts array' },
        { status: 400 }
      );
    }
    
    console.log('📱 Processing device contacts:', contacts.length);
    console.log('🔍 Search query:', query || 'none');
    
    // Normalize all phone numbers from device contacts
    const normalizedContacts = contacts.map(c => ({
      ...c,
      normalizedPhone: normalizePhoneNumber(c.phone),
    }));
    
    // Extract all phone numbers for bulk lookup
    const phoneNumbers = normalizedContacts
      .map(c => c.normalizedPhone)
      .filter(p => /^0[17]\d{8}$/.test(p));
    
    console.log('📞 Valid phone numbers to lookup:', phoneNumbers.length);
    
    // Fetch profiles that match any of these phone numbers
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, phone_number, mpesa_number, gate_name, gate_id, wallet_balance, name');
    
    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      return NextResponse.json(
        { error: 'Failed to fetch profiles' },
        { status: 500 }
      );
    }
    
    // Build a map of phone numbers to profiles for quick lookup
    const phoneToProfile = new Map<string, any>();
    for (const profile of profiles || []) {
      const phone1 = normalizePhoneNumber(profile.phone_number || '');
      const phone2 = normalizePhoneNumber(profile.mpesa_number || '');
      
      if (phone1) phoneToProfile.set(phone1, profile);
      if (phone2) phoneToProfile.set(phone2, profile);
    }
    
    // Match device contacts with profiles
    const matchedContacts: Array<{
      device_contact: DeviceContact;
      profile: any;
      match_type: 'phone' | 'name';
      similarity: number;
    }> = [];
    
    for (const contact of normalizedContacts) {
      // First try phone number match (most reliable)
      const profileByPhone = phoneToProfile.get(contact.normalizedPhone);
      
      if (profileByPhone) {
        matchedContacts.push({
          device_contact: contact,
          profile: {
            id: profileByPhone.id,
            name: profileByPhone.name || profileByPhone.email?.split('@')[0] || contact.name,
            email: profileByPhone.email,
            phone: contact.normalizedPhone,
            gate_name: profileByPhone.gate_name,
            gate_id: profileByPhone.gate_id,
            has_account: true,
          },
          match_type: 'phone',
          similarity: 1,
        });
      }
    }
    
    console.log('✅ Matched by phone:', matchedContacts.length);
    
    // If query provided, filter and sort by name similarity
    let results = matchedContacts;
    
    if (query && query.length >= 2) {
      // Also search by name in device contacts
      const queryLower = query.toLowerCase();
      
      // Score all contacts by name similarity to query
      const scoredResults = normalizedContacts.map(contact => {
        const nameSimilarity = calculateSimilarity(contact.name, query);
        const profileMatch = matchedContacts.find(
          m => m.device_contact.normalizedPhone === contact.normalizedPhone
        );
        
        return {
          device_contact: contact,
          profile: profileMatch?.profile || null,
          match_type: profileMatch ? 'phone' as const : 'name' as const,
          similarity: nameSimilarity,
          has_profile: !!profileMatch,
        };
      });
      
      // Filter by minimum similarity and sort
      results = scoredResults
        .filter(r => r.similarity >= 0.5)
        .sort((a, b) => {
          // Prioritize contacts with profiles
          if (a.has_profile && !b.has_profile) return -1;
          if (!a.has_profile && b.has_profile) return 1;
          // Then by similarity
          return b.similarity - a.similarity;
        })
        .slice(0, 10)
        .map(r => ({
          device_contact: r.device_contact,
          profile: r.profile || {
            id: null,
            name: r.device_contact.name,
            email: r.device_contact.email || null,
            phone: r.device_contact.normalizedPhone,
            gate_name: null,
            gate_id: null,
            has_account: false,
          },
          match_type: r.match_type,
          similarity: r.similarity,
        }));
      
      console.log('🔍 Filtered by query:', results.length);
    }
    
    // Find best match if query provided
    const bestMatch = query && results.length > 0 ? results[0] : null;
    const hasConfidentMatch = bestMatch && bestMatch.similarity >= 0.8 && bestMatch.profile?.has_account;
    
    return NextResponse.json({
      success: true,
      total_device_contacts: contacts.length,
      matched_with_profiles: matchedContacts.length,
      results: results.slice(0, 20),
      query: query || null,
      best_match: bestMatch,
      has_confident_match: hasConfidentMatch,
      message: hasConfidentMatch
        ? `Found ${bestMatch.profile.name} (${bestMatch.profile.phone})`
        : results.length > 0
          ? `Found ${results.length} possible matches`
          : 'No matching contacts found',
    });
    
  } catch (error: any) {
    console.error('Device contacts API error:', error);
    return NextResponse.json(
      { error: 'Failed to process device contacts', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/contacts/device/search?q=name&phone=0712345678
 * 
 * Quick search for a single contact by name or phone
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || searchParams.get('query') || '';
  const phone = searchParams.get('phone') || '';
  
  if (!query && !phone) {
    return NextResponse.json(
      { error: 'Missing query (q) or phone parameter' },
      { status: 400 }
    );
  }
  
  try {
    const supabase = await createClient();
    
    // If phone number provided, do direct lookup
    if (phone) {
      const normalizedPhone = normalizePhoneNumber(phone);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, email, phone_number, mpesa_number, gate_name, gate_id, name')
        .or(`phone_number.eq.${normalizedPhone},mpesa_number.eq.${normalizedPhone}`)
        .maybeSingle();
      
      if (error) {
        console.error('Phone lookup error:', error);
      }
      
      if (profile) {
        return NextResponse.json({
          success: true,
          found: true,
          contact: {
            id: profile.id,
            name: profile.name || profile.email?.split('@')[0] || 'Unknown',
            email: profile.email,
            phone: normalizedPhone,
            gate_name: profile.gate_name,
            gate_id: profile.gate_id,
            has_account: true,
          },
          confidence: 1,
        });
      }
      
      // Phone not found in system
      return NextResponse.json({
        success: true,
        found: false,
        contact: {
          id: null,
          name: 'Unknown',
          phone: normalizedPhone,
          gate_name: null,
          has_account: false,
        },
        confidence: 0,
        message: 'Phone number not registered with Ongea Pesa',
      });
    }
    
    // Name search - delegate to search endpoint
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, phone_number, mpesa_number, gate_name, gate_id, name');
    
    if (error) {
      return NextResponse.json({ error: 'Failed to search' }, { status: 500 });
    }
    
    const matches = (profiles || [])
      .map(profile => {
        const displayName = profile.name || profile.email?.split('@')[0] || '';
        const similarity = calculateSimilarity(displayName, query);
        return { profile, similarity, displayName };
      })
      .filter(m => m.similarity >= 0.5)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);
    
    if (matches.length === 0) {
      return NextResponse.json({
        success: true,
        found: false,
        message: `No contacts found matching "${query}"`,
      });
    }
    
    const best = matches[0];
    return NextResponse.json({
      success: true,
      found: best.similarity >= 0.7,
      contact: {
        id: best.profile.id,
        name: best.displayName,
        email: best.profile.email,
        phone: best.profile.phone_number || best.profile.mpesa_number || '',
        gate_name: best.profile.gate_name,
        gate_id: best.profile.gate_id,
        has_account: true,
      },
      confidence: best.similarity,
      alternatives: matches.slice(1).map(m => ({
        name: m.displayName,
        phone: m.profile.phone_number || m.profile.mpesa_number || '',
      })),
    });
    
  } catch (error: any) {
    console.error('Contact search error:', error);
    return NextResponse.json(
      { error: 'Search failed', details: error.message },
      { status: 500 }
    );
  }
}
