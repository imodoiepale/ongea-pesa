import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/contacts
 * Fetches contacts from:
 * 1. Local profiles table (users with gates)
 * 2. IndexPay gates list (for inter-wallet transfers)
 * 
 * Returns merged list of contacts that can receive money
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // 1. Fetch local profiles with gates (excluding current user)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, email, phone_number, mpesa_number, gate_name, gate_id, wallet_balance')
      .neq('id', user.id)
      .not('gate_name', 'is', null);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    // 2. Fetch gates from IndexPay API
    let indexPayGates: any[] = [];
    try {
      const formData = new FormData();
      formData.append('user_email', 'info@nsait.co.ke');

      const gatesResponse = await fetch('https://aps.co.ke/indexpay/api/get_gate_list.php', {
        method: 'POST',
        body: formData,
      });

      if (gatesResponse.ok) {
        const gatesData = await gatesResponse.json();
        if (Array.isArray(gatesData) && gatesData[0]?.response) {
          indexPayGates = gatesData[0].response;
        }
      }
    } catch (error) {
      console.error('Error fetching IndexPay gates:', error);
    }

    // 3. Merge and deduplicate contacts
    const contactsMap = new Map();

    // Add local profiles first (they have more complete info)
    if (profiles) {
      for (const profile of profiles) {
        const key = profile.gate_name || profile.id;
        contactsMap.set(key, {
          id: profile.id,
          name: profile.name || profile.email?.split('@')[0] || 'Unknown',
          email: profile.email,
          phone: profile.phone_number || profile.mpesa_number || '',
          gate_name: profile.gate_name,
          gate_id: profile.gate_id,
          balance: parseFloat(String(profile.wallet_balance || 0)),
          source: 'local',
          has_account: true,
          avatar: getInitials(profile.name || profile.email || 'U'),
        });
      }
    }

    // Add IndexPay gates that aren't already in local profiles
    for (const gate of indexPayGates) {
      // Skip if already in map or if it's a system/test gate
      if (contactsMap.has(gate.gate_name)) continue;
      if (gate.gate_name?.startsWith('gate_')) continue;
      if (gate.gate_name?.includes('test')) continue;

      // Extract display name from gate description or name
      let displayName = gate.gate_description || gate.gate_name || 'Unknown';
      if (displayName.startsWith('USER WALLET FOR ')) {
        displayName = displayName.replace('USER WALLET FOR ', '');
      }
      if (displayName.startsWith('Wallet Creation')) {
        displayName = gate.gate_name;
      }

      // Check if gate_name looks like a phone number
      const isPhoneGate = /^0[17]\d{8}$/.test(gate.gate_name);

      contactsMap.set(gate.gate_name, {
        id: null, // No local user ID
        name: displayName,
        email: null,
        phone: isPhoneGate ? gate.gate_name : (gate.gate_phone_number || ''),
        gate_name: gate.gate_name,
        gate_id: gate.gate_id,
        balance: parseFloat(gate.account_balance || 0),
        source: 'indexpay',
        has_account: false, // Not claimed yet
        avatar: getInitials(displayName),
      });
    }

    // Convert to array and sort by name
    const contacts = Array.from(contactsMap.values())
      .sort((a, b) => a.name.localeCompare(b.name));

    // Get current user's gate info for transfers
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('gate_name, gate_id')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      success: true,
      contacts,
      total: contacts.length,
      user_gate: currentUserProfile?.gate_name || null,
    });

  } catch (error: any) {
    console.error('Contacts API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contacts/transfer
 * Inter-wallet transfer between gates
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { recipient_gate_name, amount, description } = body;

    if (!recipient_gate_name || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: recipient_gate_name, amount' },
        { status: 400 }
      );
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Get sender's gate info and balance
    const { data: senderProfile, error: senderError } = await supabase
      .from('profiles')
      .select('gate_name, gate_id, wallet_balance')
      .eq('id', user.id)
      .single();

    if (senderError || !senderProfile?.gate_name) {
      return NextResponse.json(
        { error: 'Sender gate not found. Please set up your wallet first.' },
        { status: 400 }
      );
    }

    // Check balance
    const senderBalance = parseFloat(String(senderProfile.wallet_balance || 0));
    if (senderBalance < transferAmount) {
      return NextResponse.json(
        { 
          error: 'Insufficient funds',
          current_balance: senderBalance,
          required: transferAmount,
        },
        { status: 400 }
      );
    }

    // Call IndexPay inter-wallet transfer API
    const formData = new FormData();
    formData.append('user_email', 'info@nsait.co.ke');
    formData.append('request', '8'); // Inter-wallet transfer request type
    formData.append('from_gate', senderProfile.gate_name);
    formData.append('to_gate', recipient_gate_name);
    formData.append('amount', transferAmount.toString());
    formData.append('currency', 'KES');
    formData.append('description', description || `Transfer to ${recipient_gate_name}`);
    formData.append('pocket_name', 'ongeapesa_wallet');

    console.log('🔄 Initiating inter-wallet transfer:', {
      from: senderProfile.gate_name,
      to: recipient_gate_name,
      amount: transferAmount,
    });

    const transferResponse = await fetch('https://aps.co.ke/indexpay/api/get_transactions_2.php', {
      method: 'POST',
      body: formData,
    });

    if (!transferResponse.ok) {
      throw new Error('Transfer API request failed');
    }

    const transferResult = await transferResponse.json();
    console.log('📦 Transfer response:', transferResult);

    // Check if transfer was successful
    const isSuccess = transferResult.status === true || 
                      transferResult.bool_code === 'TRUE' ||
                      (Array.isArray(transferResult) && transferResult[0]?.status === true);

    if (!isSuccess) {
      return NextResponse.json(
        { 
          error: 'Transfer failed',
          details: transferResult.message || transferResult.Message || 'Unknown error',
        },
        { status: 400 }
      );
    }

    // Update local balance (deduct from sender)
    const newBalance = senderBalance - transferAmount;
    await supabase
      .from('profiles')
      .update({
        wallet_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    // Create transaction record
    const { data: transaction } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'transfer_out',
        amount: transferAmount,
        status: 'completed',
        voice_command_text: description || `Inter-wallet transfer to ${recipient_gate_name}`,
        external_ref: transferResult.trx_id || transferResult.transaction_id || '',
        metadata: {
          from_gate: senderProfile.gate_name,
          to_gate: recipient_gate_name,
          transfer_type: 'inter_wallet',
        },
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    // Try to credit recipient's local balance if they exist
    const { data: recipientProfile } = await supabase
      .from('profiles')
      .select('id, wallet_balance')
      .eq('gate_name', recipient_gate_name)
      .single();

    if (recipientProfile) {
      const recipientNewBalance = parseFloat(String(recipientProfile.wallet_balance || 0)) + transferAmount;
      await supabase
        .from('profiles')
        .update({
          wallet_balance: recipientNewBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', recipientProfile.id);

      // Create receive transaction for recipient
      await supabase
        .from('transactions')
        .insert({
          user_id: recipientProfile.id,
          type: 'transfer_in',
          amount: transferAmount,
          status: 'completed',
          voice_command_text: `Received from ${senderProfile.gate_name}`,
          external_ref: transferResult.trx_id || transferResult.transaction_id || '',
          metadata: {
            from_gate: senderProfile.gate_name,
            to_gate: recipient_gate_name,
            transfer_type: 'inter_wallet',
          },
          created_at: new Date().toISOString(),
        });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully sent KES ${transferAmount.toLocaleString()} to ${recipient_gate_name}`,
      transaction_id: transaction?.id,
      new_balance: newBalance,
      recipient_has_account: !!recipientProfile,
    });

  } catch (error: any) {
    console.error('Transfer error:', error);
    return NextResponse.json(
      { error: 'Transfer failed', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to get initials from name
function getInitials(name: string): string {
  if (!name) return 'U';
  const parts = name.split(/[\s._@-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}
