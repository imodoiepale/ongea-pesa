import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Ensures the authenticated user has a gate, creates one if missing
// Call this on login or when user accesses protected routes
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Gate ensure - Starting...');
    
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

    // Check if user exists in profiles table
    const { data: userData, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, gate_id, gate_name')
      .eq('id', user.id)
      .single();

    // If user doesn't exist in profiles table, create them first
    if (fetchError && fetchError.code === 'PGRST116') {
      console.log('⚠️ User not found in profiles table');
      console.log('Note: The trigger should have created this. Check if trigger is set up.');
      
      // Try to insert user (will only work if RLS allows it)
      const { data: newUser, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          phone_number: '',
          wallet_balance: 0.00,
          daily_limit: '100000.00',
          active: 'true',
        })
        .select('id, email, gate_id, gate_name')
        .single();

      if (createError) {
        console.error('Error creating user entry:', createError);
        return NextResponse.json(
          { error: 'Failed to create user entry', details: createError.message },
          { status: 500 }
        );
      }

      // User entry created, now create gate for them
      const userEmail = newUser.email!;
      console.log(`Creating gate for newly created user: ${userEmail}`);
      
      // Extract gate_name from email and make it unique with user ID
      const newEmailPrefix = userEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_');
      const newUserIdShort = user.id.split('-')[0]; // First segment of UUID
      const newGateName = `${newEmailPrefix}_${newUserIdShort}`;
      
      // Prepare form data
      const newFormData = new FormData();
      newFormData.append('request', '7');
      newFormData.append('user_email', 'info@nsait.co.ke');
      newFormData.append('gate_name', newGateName);
      newFormData.append('gate_currency', 'KES');
      newFormData.append('gate_description', `USER WALLET FOR ${newGateName}`);
      newFormData.append('gate_account_name', '0');
      newFormData.append('gate_account_no', '0');
      newFormData.append('gate_bank_name', '0');
      newFormData.append('gate_bank_branch', '');
      newFormData.append('gate_swift_code', '');
      newFormData.append('pocket_name', 'ongeapesa_wallet');
      
      // Call external API
      const newGateResponse = await fetch('https://aps.co.ke/indexpay/api/get_transactions_2.php', {
        method: 'POST',
        body: newFormData,
      });
      
      if (newGateResponse.ok) {
        const newGateData = await newGateResponse.json();
        if (newGateData.status) {
          // Update user with gate info
          await supabase
            .from('profiles')
            .update({
              gate_id: newGateData.gate_id,
              gate_name: newGateData.gate_name,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);
          
          console.log(`✅ Gate created for new user: ${newGateData.gate_id} - ${newGateData.gate_name}`);
          
          return NextResponse.json({
            success: true,
            hasGate: true,
            message: 'User and gate created successfully',
            gate_id: newGateData.gate_id,
            gate_name: newGateData.gate_name,
            created: true,
            userCreated: true,
          });
        }
      }
      
      // If gate creation fails, still return success for user creation
      console.warn('User created but gate creation failed');
      return NextResponse.json({
        success: true,
        hasGate: false,
        message: 'User created but gate creation failed',
        created: false,
        userCreated: true,
      });
    }

    if (fetchError) {
      console.error('Error fetching user data:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch user data', details: fetchError.message },
        { status: 500 }
      );
    }

    // If user already has a gate, return success
    if (userData.gate_id && userData.gate_name) {
      console.log(`✅ User already has gate: ${userData.gate_id} - ${userData.gate_name}`);
      return NextResponse.json({
        success: true,
        hasGate: true,
        message: 'User already has a gate',
        gate_id: userData.gate_id,
        gate_name: userData.gate_name,
      });
    }

    // User exists but doesn't have a gate, create one
    if (!userData.email) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      );
    }

    console.log(`Creating gate for existing user: ${userData.email}`);

    // Extract gate_name from email and make it unique with user ID
    const emailPrefix = userData.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_');
    const userIdShort = user.id.split('-')[0]; // First segment of UUID
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

    console.log(`✅ Gate created: ${gateData.gate_id} - ${gateData.gate_name}`);

    // Update user with gate_id and gate_name
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        gate_id: gateData.gate_id,
        gate_name: gateData.gate_name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to update user with gate info:', updateError);
      return NextResponse.json(
        { error: 'Failed to save gate information to database' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      hasGate: true,
      message: 'Gate created successfully',
      gate_id: gateData.gate_id,
      gate_name: gateData.gate_name,
      created: true,
    });

  } catch (error: any) {
    console.error('❌ Gate ensure error:', error);
    console.error('Error stack:', error?.stack);
    console.error('Error message:', error?.message);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error?.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check if current user has a gate
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { data: userData, error } = await supabase
      .from('profiles')
      .select('gate_id, gate_name')
      .eq('id', user.id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      hasGate: !!(userData.gate_id && userData.gate_name),
      gate_id: userData.gate_id,
      gate_name: userData.gate_name,
    });

  } catch (error) {
    console.error('Gate check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
