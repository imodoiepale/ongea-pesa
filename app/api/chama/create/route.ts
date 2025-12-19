import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createEntityGateAndPocket } from '@/lib/services/gateService';

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
      schedule_type = 'manual',
      scheduled_date,
      scheduled_time,
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

    console.log('🏦 Creating chama:', { name, contribution_amount, collection_frequency, schedule_type });

    // Calculate next collection date based on frequency and schedule
    const now = new Date();
    let nextCollectionDate: Date | null = null;
    
    // Handle scheduling
    if (schedule_type === 'now') {
      // Will start collection immediately after creation
      nextCollectionDate = new Date(now);
    } else if (schedule_type === 'later' && scheduled_date) {
      // Use the scheduled date/time
      nextCollectionDate = new Date(scheduled_date);
      if (scheduled_time) {
        const [hours, minutes] = scheduled_time.split(':').map(Number);
        nextCollectionDate.setHours(hours, minutes, 0, 0);
      }
    } else if (collection_frequency === 'one-time') {
      // One-time collections are manual by default
      nextCollectionDate = null;
    } else {
      // Calculate next collection date based on frequency
      nextCollectionDate = new Date(now);
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
        default:
          // Manual - no scheduled date
          nextCollectionDate = null;
      }
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
        next_collection_date: nextCollectionDate ? nextCollectionDate.toISOString() : null,
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

    // Create Gate and Pocket for this chama
    console.log('🏦 Creating gate and pocket for chama:', chama.id);
    const gateResult = await createEntityGateAndPocket(
      'chama',
      chama.id,
      name,
      description || `Chama: ${name}`
    );

    if (gateResult.success) {
      // Update chama with gate and pocket info
      await supabase
        .from('chamas')
        .update({
          gate_id: gateResult.gate_id,
          gate_name: gateResult.gate_name,
          pocket_id: gateResult.pocket_id,
          pocket_name: gateResult.pocket_name,
        })
        .eq('id', chama.id);
      
      console.log('✅ Gate created:', gateResult.gate_name);
    } else {
      console.warn('⚠️ Failed to create gate:', gateResult.error);
      // Continue without gate - can be retried later
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

    // Use service client to bypass RLS for member insertion
    // Use upsert to handle duplicate phone numbers gracefully
    const serviceClient = createServiceClient();
    let insertedMembers: any[] = [];
    let membersError: any = null;

    // Insert members one by one to handle duplicates gracefully
    for (const member of membersToAdd) {
      const { data, error } = await serviceClient
        .from('chama_members')
        .upsert(member, { 
          onConflict: 'chama_id,phone_number',
          ignoreDuplicates: true 
        })
        .select()
        .single();
      
      if (data) {
        insertedMembers.push(data);
      } else if (error && !error.message.includes('duplicate')) {
        console.warn('⚠️ Failed to add member:', member.name, error.message);
      }
    }

    if (insertedMembers.length === 0 && membersToAdd.length > 0) {
      membersError = { message: 'No members could be added' };
    }

    if (membersError) {
      console.error('⚠️ Failed to add members:', membersError);
      return NextResponse.json({
        success: true,
        chama,
        members_added: 0,
        members_error: membersError.message,
        message: 'Chama created but members failed to add',
      });
    }

    console.log('✅ Chama created:', chama.id, 'with', insertedMembers?.length || 0, 'members');

    return NextResponse.json({
      success: true,
      chama,
      members_added: insertedMembers?.length || 0,
      members: insertedMembers,
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
