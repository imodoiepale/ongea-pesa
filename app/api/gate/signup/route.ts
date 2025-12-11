import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Special endpoint for gate creation during signup (no auth required)
export async function POST(request: NextRequest) {
  try {
    const { email, userId } = await request.json();

    console.log('🔧 Gate signup request for:', email, userId);

    if (!email || !userId) {
      return NextResponse.json(
        { error: 'Email and userId are required' },
        { status: 400 }
      );
    }

    // Use service role client to check/create profile and gate
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

    // Check if user already has a gate
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('gate_id, gate_name')
      .eq('id', userId)
      .single();

    if (existingProfile?.gate_id && existingProfile?.gate_name) {
      console.log('✅ User already has wallet:', existingProfile.gate_id);
      return NextResponse.json({
        success: true,
        message: 'Gate already exists',
        gate_id: existingProfile.gate_id,
        gate_name: existingProfile.gate_name,
        alreadyExists: true,
      });
    }

    // Extract gate_name from email and make it unique with user ID
    const emailPrefix = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_');
    const userIdShort = userId.split('-')[0]; // First segment of UUID
    const gateName = `${emailPrefix}_${userIdShort}`;

    console.log('🏗️ Creating new wallet:', gateName);

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
      const errorText = await gateResponse.text();
      console.error('❌ External API error:', gateResponse.status, errorText);
      throw new Error(`External API error: ${gateResponse.status}`);
    }

    const gateData = await gateResponse.json();
    console.log('📡 Gate API response:', gateData);

    // Check if gate creation was successful
    if (!gateData.status) {
      // Special case: If gate already exists, try to retrieve it
      if (gateData.Message && gateData.Message.includes('Selected Gate Exists')) {
        console.log('⚠️ Gate already exists externally, attempting to retrieve...');
        
        // If the response includes gate_id and gate_name, use them
        if (gateData.gate_id && gateData.gate_name) {
          console.log('✅ Gate info retrieved from error response:', gateData.gate_id, gateData.gate_name);
          
          // Update profile with existing gate info
          const { error: upsertError } = await supabaseAdmin
            .from('profiles')
            .upsert({
              id: userId,
              email: email,
              gate_id: gateData.gate_id,
              gate_name: gateData.gate_name,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'id'
            });

          if (upsertError) {
            console.error('❌ Failed to update profile:', upsertError);
            return NextResponse.json(
              { error: 'Failed to save existing gate information', details: upsertError.message },
              { status: 500 }
            );
          }

          console.log('✅ Existing wallet linked successfully:', gateData.gate_id, gateData.gate_name);

          return NextResponse.json({
            success: true,
            message: 'Existing gate linked successfully',
            gate_id: gateData.gate_id,
            gate_name: gateData.gate_name,
            wasExisting: true,
          });
        }
        
        // If gate_id and gate_name not in response, try to retrieve using request=6
        console.log('🔍 Gate info not in response, attempting to retrieve with request=6...');
        
        const retrieveFormData = new FormData();
        retrieveFormData.append('request', '6');
        retrieveFormData.append('user_email', 'info@nsait.co.ke');
        retrieveFormData.append('gate_name', gateName);
        
        try {
          const retrieveResponse = await fetch('https://aps.co.ke/indexpay/api/get_transactions_2.php', {
            method: 'POST',
            body: retrieveFormData,
          });
          
          if (retrieveResponse.ok) {
            const retrieveData = await retrieveResponse.json();
            console.log('📡 Gate retrieve response:', retrieveData);
            
            if (retrieveData.status && retrieveData.gate_id && retrieveData.gate_name) {
              // Successfully retrieved gate details
              const { error: upsertError } = await supabaseAdmin
                .from('profiles')
                .upsert({
                  id: userId,
                  email: email,
                  gate_id: retrieveData.gate_id,
                  gate_name: retrieveData.gate_name,
                  updated_at: new Date().toISOString(),
                }, {
                  onConflict: 'id'
                });

              if (upsertError) {
                console.error('❌ Failed to update profile with retrieved gate:', upsertError);
                return NextResponse.json(
                  { error: 'Failed to save retrieved gate information', details: upsertError.message },
                  { status: 500 }
                );
              }

              console.log('✅ Existing wallet retrieved and linked:', retrieveData.gate_id, retrieveData.gate_name);

              return NextResponse.json({
                success: true,
                message: 'Existing gate retrieved and linked successfully',
                gate_id: retrieveData.gate_id,
                gate_name: retrieveData.gate_name,
                wasExisting: true,
              });
            }
          }
        } catch (retrieveError) {
          console.error('Error retrieving gate details:', retrieveError);
        }
        
        // If all retrieval attempts fail, return helpful error
        console.error('❌ Could not retrieve gate details for existing gate');
        return NextResponse.json(
          { 
            error: 'Gate exists but could not retrieve details',
            message: 'Please contact support to link your existing wallet',
            gate_name: gateName
          },
          { status: 400 }
        );
      }
      
      console.error('❌ Gate creation failed:', gateData.Message);
      return NextResponse.json(
        { error: gateData.Message || 'Gate creation failed' },
        { status: 400 }
      );
    }

    // Ensure profile exists before updating
    const { error: upsertError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email: email,
        gate_id: gateData.gate_id,
        gate_name: gateData.gate_name,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      });

    if (upsertError) {
      console.error('❌ Failed to update profile:', upsertError);
      return NextResponse.json(
        { error: 'Failed to save gate information to database', details: upsertError.message },
        { status: 500 }
      );
    }

    console.log('✅ Wallet created successfully:', gateData.gate_id, gateData.gate_name);

    return NextResponse.json({
      success: true,
      message: 'Gate created successfully',
      gate_id: gateData.gate_id,
      gate_name: gateData.gate_name,
    });

  } catch (error: any) {
    console.error('❌ Gate creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    );
  }
}
