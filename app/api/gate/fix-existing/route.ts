import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Fix endpoint for users who have "Selected Gate Exists" error
 * This manually attempts to link their existing external gate to their profile
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Manual gate fix - Starting...');
    
    const supabase = await createClient();
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', user.id, user.email);

    // Get user profile
    const { data: userData, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, gate_id, gate_name')
      .eq('id', user.id)
      .single();

    if (fetchError || !userData || !userData.email) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // If user already has a gate, no fix needed
    if (userData.gate_id && userData.gate_name) {
      console.log('✅ User already has gate:', userData.gate_id, userData.gate_name);
      return NextResponse.json({
        success: true,
        message: 'User already has a gate - no fix needed',
        gate_id: userData.gate_id,
        gate_name: userData.gate_name,
        alreadyFixed: true,
      });
    }

    console.log('🔍 Attempting to retrieve existing gate for:', userData.email);

    // Generate the gate name that should exist
    const emailPrefix = userData.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_');
    const userIdShort = user.id.split('-')[0];
    const gateName = `${emailPrefix}_${userIdShort}`;

    console.log('Expected gate name:', gateName);

    // Try to "create" the gate - if it exists, the API will return its info
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

    const gateResponse = await fetch('https://aps.co.ke/indexpay/api/get_transactions_2.php', {
      method: 'POST',
      body: formData,
    });

    if (!gateResponse.ok) {
      throw new Error('External API request failed');
    }

    const gateData = await gateResponse.json();
    console.log('📡 Gate API response:', gateData);

    // Check if we got gate info back (either new or existing)
    if (gateData.gate_id && gateData.gate_name) {
      console.log('✅ Gate info retrieved:', gateData.gate_id, gateData.gate_name);
      
      // Update user profile with gate info
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          gate_id: gateData.gate_id,
          gate_name: gateData.gate_name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('❌ Failed to update profile:', updateError);
        return NextResponse.json(
          { error: 'Failed to link gate to profile', details: updateError.message },
          { status: 500 }
        );
      }

      const wasExisting = gateData.Message && gateData.Message.includes('Selected Gate Exists');

      console.log(`✅ Gate ${wasExisting ? 'linked' : 'created'} successfully:`, gateData.gate_id, gateData.gate_name);

      return NextResponse.json({
        success: true,
        message: wasExisting ? 'Existing gate linked successfully' : 'New gate created successfully',
        gate_id: gateData.gate_id,
        gate_name: gateData.gate_name,
        wasExisting,
        fixed: true,
      });
    }

    // If we got here, something went wrong
    console.error('❌ Could not retrieve or create gate:', gateData);
    return NextResponse.json(
      { error: 'Could not retrieve or create gate', details: gateData.Message || 'Unknown error' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('❌ Manual gate fix error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
