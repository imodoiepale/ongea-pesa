import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    console.log('Generating signed URL for user:', user.email);

    // Fetch user profile including balance, gate_name, and gate_id
    let userBalance = 0;
    let userName = user.user_metadata?.name || user.email?.split('@')[0] || 'User';
    let gateName = '';
    let gateId = '';

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('wallet_balance, name, gate_name, gate_id')
        .eq('id', user.id)
        .single();

      if (profile && !profileError) {
        userBalance = profile.wallet_balance || 0;
        userName = profile.name || userName;
        gateName = profile.gate_name || '';
        gateId = profile.gate_id || '';
        console.log('Fetched user profile:', { balance: userBalance, userName, gateName, gateId });
      }
    } catch (balanceError) {
      console.error('Failed to fetch profile, using defaults:', balanceError);
    }

    // Extract user name from email (before @)
    const userNameFromEmail = user.email?.split('@')[0] || 'User';
    // Use profile name if available, otherwise fall back to email-based name
    const finalUserName = userName || userNameFromEmail;

    // Get environment variables
    const agentId = process.env.NEXT_PUBLIC_AGENT_ID;
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!agentId) {
      console.error('NEXT_PUBLIC_AGENT_ID is not configured');
      return NextResponse.json(
        { error: 'Agent ID not configured. Please set NEXT_PUBLIC_AGENT_ID in environment variables.' },
        { status: 500 }
      );
    }

    if (!apiKey) {
      console.error('ELEVENLABS_API_KEY is not configured');
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured. Please set ELEVENLABS_API_KEY in environment variables.' },
        { status: 500 }
      );
    }

    console.log('Requesting signed URL for agent:', agentId, 'with userId:', user.id);

    // Prepare dynamic variables for ElevenLabs
    const dynamicVariables = {
      user_id: user.id,
      user_email: user.email || '',
      balance: userBalance.toString(),
      user_name: finalUserName,
      gate_name: gateName,
      gate_id: gateId
    };

    // Build URL with query parameters (ElevenLabs expects GET, not POST)
    const elevenLabsUrl = new URL('https://api.elevenlabs.io/v1/convai/conversation/get-signed-url');
    elevenLabsUrl.searchParams.append('agent_id', agentId);

    // Add dynamic variables as query parameters
    Object.entries(dynamicVariables).forEach(([key, value]) => {
      elevenLabsUrl.searchParams.append(key, value);
    });

    console.log('🌐 ElevenLabs Request (GET with query params):');
    console.log('   Full URL:', elevenLabsUrl.toString());
    console.log('   Dynamic Variables:', dynamicVariables);

    const response = await fetch(elevenLabsUrl.toString(), {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      const errorMessage = `ElevenLabs API Error: ${response.status} ${response.statusText} - ${errorBody}`;
      console.error(errorMessage);

      // Return more specific error messages
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Invalid ElevenLabs API key. Please check your ELEVENLABS_API_KEY.' },
          { status: 401 }
        );
      } else if (response.status === 404) {
        return NextResponse.json(
          { error: `Agent not found. Please verify NEXT_PUBLIC_AGENT_ID: ${agentId}` },
          { status: 404 }
        );
      } else {
        return NextResponse.json(
          { error: `ElevenLabs API error: ${response.statusText}`, details: errorBody },
          { status: response.status }
        );
      }
    }

    const data = await response.json();

    if (!data.signed_url) {
      console.error('No signed URL in response:', data);
      return NextResponse.json(
        { error: 'No signed URL received from ElevenLabs' },
        { status: 500 }
      );
    }

    // Extract session ID from signed URL if available
    const signedUrl = data.signed_url;
    let sessionId = 'session-' + Date.now(); // Fallback session ID

    try {
      const urlObj = new URL(signedUrl);
      const pathParts = urlObj.pathname.split('/');
      sessionId = pathParts[pathParts.length - 1] || sessionId;
    } catch (e) {
      console.warn('Could not extract session ID from URL:', e);
    }

    // Save voice session with user context
    try {
      await supabase
        .from('voice_sessions')
        .insert({
          user_id: user.id,
          session_id: sessionId,
          agent_id: agentId,
          signed_url: signedUrl,
          status: 'active',
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
        });

      console.log('Saved voice session:', sessionId, 'for user:', user.email);
    } catch (dbError: any) {
      console.error('Failed to save voice session:', dbError);
      // Continue anyway - don't fail the request
    }

    console.log('Successfully generated signed URL for user:', user.email);

    // Return signed URL with user context including balance and gate info
    return NextResponse.json({
      signedUrl: data.signed_url,
      userId: user.id,
      userEmail: user.email,
      balance: userBalance,
      gateName: gateName,
      gateId: gateId,
    });

  } catch (error: any) {
    console.error('Error generating signed URL:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate signed URL',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
