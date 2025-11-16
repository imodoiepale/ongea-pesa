import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Special endpoint for gate creation during signup (no auth required)
export async function POST(request: NextRequest) {
  try {
    const { email, userId } = await request.json();

    if (!email || !userId) {
      return NextResponse.json(
        { error: 'Email and userId are required' },
        { status: 400 }
      );
    }

    // Extract gate_name from email and make it unique with user ID
    const emailPrefix = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_');
    const userIdShort = userId.split('-')[0]; // First segment of UUID
    const gateName = `${emailPrefix}_${userIdShort}`;

    // Prepare form data for gate creation
    const formData = new FormData();
    formData.append('request', '7');
    formData.append('user_email', 'info@nsait.co.ke');
    formData.append('gate_name', gateName);
    formData.append('gate_currency', 'KES');
    formData.append('gate_description', `USER WALLET FOR ${gateName}`);
    formData.append('gate_account_name', '0');
    formData.append('gate_account_no', '0');
    formData.append('gate_bank_name', '0');
    formData.append('gate_bank_branch', '');
    formData.append('gate_swift_code', '');
    formData.append('pocket_name', 'ongeapesa_wallet');

    // Call the external API to create gate
    const gateResponse = await fetch('https://aps.co.ke/indexpay/api/get_transactions_2.php', {
      method: 'POST',
      body: formData,
    });

    if (!gateResponse.ok) {
      throw new Error('Failed to create gate with external API');
    }

    const gateData = await gateResponse.json();

    // Check if gate creation was successful
    if (!gateData.status) {
      return NextResponse.json(
        { error: gateData.Message || 'Gate creation failed' },
        { status: 400 }
      );
    }

    // Use service role client to bypass RLS for initial setup
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Update user with gate_id and gate_name
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        gate_id: gateData.gate_id,
        gate_name: gateData.gate_name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Failed to update profile with gate info:', updateError);
      return NextResponse.json(
        { error: 'Failed to save gate information to database' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Gate created successfully',
      gate_id: gateData.gate_id,
      gate_name: gateData.gate_name,
    });

  } catch (error) {
    console.error('Gate creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
