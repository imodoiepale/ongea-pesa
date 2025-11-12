import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Backfill endpoint to create gates for all users without them
// This should be called by an admin or run as a one-time migration
export async function POST(request: NextRequest) {
  try {
    // Use service role client to access all users
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

    // Get all users without gates
    const { data: usersWithoutGates, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, gate_id, gate_name')
      .or('gate_id.is.null,gate_name.is.null');

    if (fetchError) {
      console.error('Error fetching users:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    if (!usersWithoutGates || usersWithoutGates.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All users already have gates',
        processed: 0,
      });
    }

    const results = {
      total: usersWithoutGates.length,
      successful: 0,
      failed: 0,
      errors: [] as any[],
    };

    // Process each user
    for (const user of usersWithoutGates) {
      if (!user.email) {
        results.failed++;
        results.errors.push({
          userId: user.id,
          error: 'No email found',
        });
        continue;
      }

      try {
        // Extract gate_name from email
        const gateName = user.email.split('@')[0];

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
          throw new Error('External API request failed');
        }

        const gateData = await gateResponse.json();

        // Check if gate creation was successful
        if (!gateData.status) {
          throw new Error(gateData.Message || 'Gate creation failed');
        }

        // Update user with gate_id and gate_name
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            gate_id: gateData.gate_id,
            gate_name: gateData.gate_name,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (updateError) {
          throw new Error(`Database update failed: ${updateError.message}`);
        }

        results.successful++;
        console.log(`Gate created for user ${user.email}: gate_id=${gateData.gate_id}`);

      } catch (error: any) {
        results.failed++;
        results.errors.push({
          userId: user.id,
          email: user.email,
          error: error.message,
        });
        console.error(`Failed to create gate for user ${user.email}:`, error);
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return NextResponse.json({
      success: true,
      message: 'Backfill completed',
      results,
    });

  } catch (error) {
    console.error('Backfill error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check how many users need gates
export async function GET(request: NextRequest) {
  try {
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

    // Count users without gates
    const { count, error } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .or('gate_id.is.null,gate_name.is.null');

    if (error) {
      return NextResponse.json(
        { error: 'Failed to count users' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      usersNeedingGates: count || 0,
      message: count === 0 
        ? 'All users have gates!' 
        : `${count} user(s) need gates`,
    });

  } catch (error) {
    console.error('Count error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
