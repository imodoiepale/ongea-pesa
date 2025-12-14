import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Start Collection - Sends STK push to all chama members
 * This is the core function that initiates bulk M-Pesa collection
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chama_id, project_id } = await request.json();

    if (!chama_id) {
      return NextResponse.json({ error: 'Missing chama_id' }, { status: 400 });
    }

    // Get chama with members
    const { data: chama, error: chamaError } = await supabase
      .from('chamas')
      .select('*, members:chama_members(*)')
      .eq('id', chama_id)
      .single();

    if (chamaError || !chama) {
      return NextResponse.json({ error: 'Chama not found' }, { status: 404 });
    }

    // Verify user is admin
    if (chama.creator_id !== user.id) {
      return NextResponse.json({ error: 'Only admin can start collection' }, { status: 403 });
    }

    // Check if there's already an active collection
    const { data: activeCycle } = await supabase
      .from('chama_cycles')
      .select('*')
      .eq('chama_id', chama_id)
      .in('status', ['collecting', 'collected'])
      .single();

    if (activeCycle) {
      return NextResponse.json({ 
        error: 'There is already an active collection cycle',
        cycle_id: activeCycle.id 
      }, { status: 400 });
    }

    const activeMembers = chama.members?.filter((m: any) => m.status === 'active') || [];
    
    if (activeMembers.length === 0) {
      return NextResponse.json({ error: 'No active members to collect from' }, { status: 400 });
    }

    // Determine next recipient based on rotation
    const sortedMembers = [...activeMembers].sort((a: any, b: any) => 
      (a.rotation_position || 0) - (b.rotation_position || 0)
    );
    const recipientIndex = chama.current_rotation_index % sortedMembers.length;
    const recipient = sortedMembers[recipientIndex];

    // Calculate expected amount based on chama type
    const isFundraising = chama.chama_type === 'fundraising';
    const expectedAmount = isFundraising
      ? activeMembers.reduce((sum: number, m: any) => sum + (m.pledge_amount || 0), 0)
      : chama.contribution_amount * activeMembers.length;

    console.log('🏦 Starting chama collection:', {
      chama_id,
      chama_name: chama.name,
      chama_type: chama.chama_type || 'savings',
      members: activeMembers.length,
      amount_per_member: isFundraising ? 'varies (pledges)' : chama.contribution_amount,
      expected_total: expectedAmount,
      recipient: recipient.name,
    });

    // Create collection cycle
    const collectionEnd = new Date();
    collectionEnd.setHours(collectionEnd.getHours() + chama.grace_period_hours);

    const { data: cycle, error: cycleError } = await supabase
      .from('chama_cycles')
      .insert({
        chama_id,
        project_id: project_id || null,
        cycle_number: chama.current_cycle,
        collection_start: new Date().toISOString(),
        collection_end: collectionEnd.toISOString(),
        recipient_member_id: recipient.id,
        recipient_phone: recipient.phone_number,
        expected_amount: expectedAmount,
        status: 'collecting',
        members_pending: activeMembers.length,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (cycleError) {
      console.error('❌ Failed to create cycle:', cycleError);
      return NextResponse.json({ error: 'Failed to create collection cycle' }, { status: 500 });
    }

    // Send STK push to each member
    const stkResults: any[] = [];
    const stkRequests: any[] = [];

    for (const member of activeMembers) {
      console.log(`📱 Sending STK to ${member.name} (${member.phone_number})`);

      // Determine amount for this member (pledge for fundraising, fixed for others)
      const memberAmount = isFundraising 
        ? Math.ceil(member.pledge_amount || 0) 
        : Math.ceil(chama.contribution_amount);

      if (memberAmount <= 0) {
        console.log(`⚠️ Skipping ${member.name} - no amount set`);
        continue;
      }

      // Create STK request record first
      const { data: stkRecord } = await supabase
        .from('chama_stk_requests')
        .insert({
          chama_id,
          cycle_id: cycle.id,
          member_id: member.id,
          phone_number: member.phone_number,
          amount: memberAmount,
          status: 'pending',
          attempt_count: 1,
          last_attempt_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      // Initiate STK push
      try {
        const formData = new FormData();
        formData.append('user_email', 'info@nsait.co.ke');
        formData.append('request', '1');
        formData.append('transaction_intent', 'Deposit');
        formData.append('phone', member.phone_number.replace(/\s/g, ''));
        formData.append('amount', memberAmount.toString());
        formData.append('currency', 'KES');
        formData.append('gate_name', 'ongeapesa');
        formData.append('pocket_name', `chama_${chama_id}`);
        formData.append('payment_mode', 'MPESA');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch('https://aps.co.ke/indexpay/api/gate_deposit.php', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const data = await response.json();
        
        // Parse response
        let accountNumber = '';
        let trxId = '';
        let success = false;

        if (data.mpesapayment && Array.isArray(data.mpesapayment)) {
          for (const item of data.mpesapayment) {
            if (item.bool_code?.toUpperCase() === 'TRUE') success = true;
            if (item.trx_id) trxId = item.trx_id;
            if (item.account_number) accountNumber = item.account_number;
          }
        }

        // Update STK record
        if (stkRecord) {
          await supabase
            .from('chama_stk_requests')
            .update({
              status: success ? 'sent' : 'failed',
              checkout_request_id: trxId,
              account_number: accountNumber,
              error_message: success ? null : 'STK push failed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', stkRecord.id);
        }

        stkResults.push({
          member_id: member.id,
          member_name: member.name,
          phone: member.phone_number,
          success,
          account_number: accountNumber,
          stk_id: stkRecord?.id,
        });

      } catch (stkError: any) {
        console.error(`❌ STK failed for ${member.name}:`, stkError.message);
        
        if (stkRecord) {
          await supabase
            .from('chama_stk_requests')
            .update({
              status: 'failed',
              error_message: stkError.message,
              updated_at: new Date().toISOString(),
            })
            .eq('id', stkRecord.id);
        }

        stkResults.push({
          member_id: member.id,
          member_name: member.name,
          phone: member.phone_number,
          success: false,
          error: stkError.message,
        });
      }

      // Small delay between STK pushes to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Update cycle with initial results
    const successCount = stkResults.filter(r => r.success).length;
    const failedCount = stkResults.filter(r => !r.success).length;

    await supabase
      .from('chama_cycles')
      .update({
        members_pending: successCount,
        members_failed: failedCount,
      })
      .eq('id', cycle.id);

    console.log('✅ Collection started:', {
      cycle_id: cycle.id,
      stk_sent: successCount,
      stk_failed: failedCount,
    });

    return NextResponse.json({
      success: true,
      cycle_id: cycle.id,
      message: `STK push sent to ${successCount} members`,
      total_members: activeMembers.length,
      stk_sent: successCount,
      stk_failed: failedCount,
      recipient: {
        name: recipient.name,
        phone: recipient.phone_number,
      },
      results: stkResults,
    });

  } catch (error: any) {
    console.error('❌ Start collection error:', error);
    return NextResponse.json({ error: 'Failed to start collection', details: error.message }, { status: 500 });
  }
}
