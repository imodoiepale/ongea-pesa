import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      chama_type = 'savings',
      contribution_amount,
      currency = 'KES',
      collection_frequency,
      collection_day,
      custom_frequency_days,
      rotation_type = 'sequential',
      total_cycles,
      late_fee_percentage = 5,
      grace_period_hours = 24,
      allow_partial_payments = true,
      require_all_before_payout = true,
      members = [],
    } = body;

    // For fundraising type, contribution_amount can be 0
    if (!name || !collection_frequency) {
      return NextResponse.json(
        { error: 'Missing required fields: name, collection_frequency' },
        { status: 400 }
      );
    }

    if (chama_type !== 'fundraising' && !contribution_amount) {
      return NextResponse.json(
        { error: 'contribution_amount is required for savings and collection types' },
        { status: 400 }
      );
    }

    console.log('🏦 Creating chama:', { name, contribution_amount, collection_frequency });

    // Calculate next collection date based on frequency
    const now = new Date();
    let nextCollectionDate = new Date(now);
    
    switch (collection_frequency) {
      case 'daily':
        nextCollectionDate.setDate(nextCollectionDate.getDate() + 1);
        break;
      case 'weekly':
        const daysUntilCollectionDay = ((collection_day || 1) - now.getDay() + 7) % 7 || 7;
        nextCollectionDate.setDate(nextCollectionDate.getDate() + daysUntilCollectionDay);
        break;
      case 'biweekly':
        nextCollectionDate.setDate(nextCollectionDate.getDate() + 14);
        break;
      case 'monthly':
        nextCollectionDate.setMonth(nextCollectionDate.getMonth() + 1);
        nextCollectionDate.setDate(collection_day || 1);
        break;
      case 'custom':
        nextCollectionDate.setDate(nextCollectionDate.getDate() + (custom_frequency_days || 14));
        break;
    }

    // Create chama
    const { data: chama, error: chamaError } = await supabase
      .from('chamas')
      .insert({
        name,
        description,
        chama_type,
        creator_id: user.id,
        contribution_amount: chama_type === 'fundraising' ? 0 : parseFloat(contribution_amount),
        currency,
        collection_frequency,
        collection_day: collection_day || null,
        custom_frequency_days: custom_frequency_days || null,
        rotation_type,
        total_cycles: total_cycles || null,
        late_fee_percentage,
        grace_period_hours,
        allow_partial_payments,
        require_all_before_payout,
        status: 'active',
        current_cycle: 1,
        next_collection_date: nextCollectionDate.toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (chamaError) {
      console.error('❌ Failed to create chama:', chamaError);
      return NextResponse.json(
        { error: 'Failed to create chama', details: chamaError.message },
        { status: 500 }
      );
    }

    // Get creator's profile for adding as first member
    const { data: creatorProfile } = await supabase
      .from('profiles')
      .select('phone_number, mpesa_number, email')
      .eq('id', user.id)
      .single();

    // Add creator as admin member
    const membersToAdd: any[] = [{
      chama_id: chama.id,
      user_id: user.id,
      name: 'You (Admin)',
      phone_number: creatorProfile?.mpesa_number || creatorProfile?.phone_number || '',
      email: creatorProfile?.email || '',
      role: 'admin',
      rotation_position: 1,
      status: 'active',
      pledge_amount: 0,
      joined_at: new Date().toISOString(),
    }];

    // Add initial members
    members.forEach((member: any, index: number) => {
      if (member.phone) {
        membersToAdd.push({
          chama_id: chama.id,
          user_id: null as any,
          name: member.name || `Member ${index + 2}`,
          phone_number: member.phone,
          email: member.email || '',
          role: 'member',
          rotation_position: index + 2,
          status: 'pending',
          pledge_amount: member.pledge_amount ? Math.ceil(parseFloat(member.pledge_amount)) : 0,
          joined_at: new Date().toISOString(),
        });
      }
    });

    const { error: membersError } = await supabase
      .from('chama_members')
      .insert(membersToAdd);

    if (membersError) {
      console.error('⚠️ Failed to add members:', membersError);
    }

    console.log('✅ Chama created:', chama.id, 'with', membersToAdd.length, 'members');

    return NextResponse.json({
      success: true,
      chama,
      members_added: membersToAdd.length,
      message: 'Chama created successfully',
    });

  } catch (error: any) {
    console.error('❌ Create chama error:', error);
    return NextResponse.json(
      { error: 'Failed to create chama', details: error.message },
      { status: 500 }
    );
  }
}
