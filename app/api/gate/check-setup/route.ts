import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Diagnostic endpoint to check gate setup
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    const checks = {
      environment: {
        NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      authentication: {
        isAuthenticated: !!user,
        userId: user?.id || null,
        userEmail: user?.email || null,
        authError: authError?.message || null,
      },
      database: {
        checked: false,
        userExists: false,
        hasGate: false,
        gateId: null,
        gateName: null,
        error: null,
      }
    };

    // If user is authenticated, check database
    if (user) {
      try {
        const { data: userData, error: dbError } = await supabase
          .from('profiles')
          .select('id, email, gate_id, gate_name')
          .eq('id', user.id)
          .single();

        checks.database.checked = true;
        
        if (dbError) {
          checks.database.error = dbError.message;
          checks.database.userExists = false;
        } else {
          checks.database.userExists = true;
          checks.database.hasGate = !!(userData.gate_id && userData.gate_name);
          checks.database.gateId = userData.gate_id;
          checks.database.gateName = userData.gate_name;
        }
      } catch (dbErr: any) {
        checks.database.error = dbErr.message;
      }
    }

    return NextResponse.json(checks, { status: 200 });

  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Diagnostic check failed',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
