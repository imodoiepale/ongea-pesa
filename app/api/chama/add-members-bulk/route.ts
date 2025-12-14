import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chama_id, members } = await request.json();

    if (!chama_id || !members || !Array.isArray(members) || members.length === 0) {
      return NextResponse.json(
        { error: 'chama_id and members array are required' },
        { status: 400 }
      );
    }

    // Verify user is admin of this chama
    const { data: chama } = await supabase
      .from('chamas')
      .select('id, creator_id, chama_type')
      .eq('id', chama_id)
      .single();

    if (!chama) {
      return NextResponse.json({ error: 'Chama not found' }, { status: 404 });
    }

    if (chama.creator_id !== user.id) {
      return NextResponse.json({ error: 'Only the admin can add members' }, { status: 403 });
    }

    // Get current members to check for duplicates and get next rotation position
    const { data: existingMembers } = await supabase
      .from('chama_members')
      .select('phone_number, rotation_position')
      .eq('chama_id', chama_id);

    const existingPhones = new Set(existingMembers?.map(m => m.phone_number) || []);
    const maxPosition = Math.max(...(existingMembers?.map(m => m.rotation_position) || [0]), 0);

    // Filter out duplicates and prepare members for insertion
    const membersToAdd: any[] = [];
    let position = maxPosition;

    for (const member of members) {
      if (!member.name || !member.phone) continue;
      
      // Normalize phone number
      const phone = member.phone.replace(/\s/g, '');
      
      if (existingPhones.has(phone)) continue;
      existingPhones.add(phone);
      
      position++;
      
      // Check if user exists in the system
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .or(`phone_number.eq.${phone},mpesa_number.eq.${phone}`)
        .single();

      membersToAdd.push({
        chama_id,
        user_id: existingUser?.id || null,
        name: member.name,
        phone_number: phone,
        email: member.email || '',
        role: 'member',
        rotation_position: position,
        status: existingUser ? 'active' : 'pending',
        pledge_amount: member.pledge_amount ? Math.ceil(parseFloat(member.pledge_amount)) : 0,
        joined_at: new Date().toISOString(),
      });
    }

    if (membersToAdd.length === 0) {
      return NextResponse.json({ 
        success: true, 
        added: 0, 
        message: 'No new members to add (all duplicates or invalid)' 
      });
    }

    // Insert all members
    const { data: addedMembers, error: insertError } = await supabase
      .from('chama_members')
      .insert(membersToAdd)
      .select();

    if (insertError) {
      console.error('Error adding members:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      added: addedMembers?.length || 0,
      skipped: members.length - (addedMembers?.length || 0),
      members: addedMembers,
    });
  } catch (error) {
    console.error('Error in bulk add members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
