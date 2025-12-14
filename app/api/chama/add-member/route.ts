import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chama_id, name, phone, email, pledge_amount } = await request.json();

    if (!chama_id || !name || !phone) {
      return NextResponse.json({ error: 'Missing required fields: chama_id, name, phone' }, { status: 400 });
    }

    // Verify user is admin of this chama
    const { data: chama, error: chamaError } = await supabase
      .from('chamas')
      .select('*, members:chama_members(*)')
      .eq('id', chama_id)
      .single();

    if (chamaError || !chama) {
      return NextResponse.json({ error: 'Chama not found' }, { status: 404 });
    }

    if (chama.creator_id !== user.id) {
      return NextResponse.json({ error: 'Only the chama admin can add members' }, { status: 403 });
    }

    // Check if phone already exists in this chama
    const existingMember = chama.members?.find((m: any) => m.phone_number === phone);
    if (existingMember) {
      return NextResponse.json({ error: 'Member with this phone already exists' }, { status: 400 });
    }

    // Get next rotation position
    const maxPosition = Math.max(...(chama.members?.map((m: any) => m.rotation_position || 0) || [0]));

    // Check if user exists in system
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .or(`phone_number.eq.${phone},mpesa_number.eq.${phone}`)
      .single();

    // Add member
    const { data: member, error: memberError } = await supabase
      .from('chama_members')
      .insert({
        chama_id,
        user_id: existingUser?.id || null,
        name,
        phone_number: phone,
        email: email || '',
        role: 'member',
        rotation_position: maxPosition + 1,
        status: existingUser ? 'active' : 'pending',
        pledge_amount: pledge_amount ? Math.ceil(parseFloat(pledge_amount)) : 0,
        joined_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (memberError) {
      console.error('❌ Failed to add member:', memberError);
      return NextResponse.json({ error: 'Failed to add member', details: memberError.message }, { status: 500 });
    }

    console.log('✅ Member added to chama:', { chama_id, member_id: member.id, name });

    return NextResponse.json({
      success: true,
      member,
      message: `${name} added to chama`,
    });

  } catch (error: any) {
    console.error('❌ Add member error:', error);
    return NextResponse.json({ error: 'Failed to add member', details: error.message }, { status: 500 });
  }
}
