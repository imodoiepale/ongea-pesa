import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Validate environment variables
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

    console.log('Requesting signed URL for agent:', agentId);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

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
          { error: 'Agent not found. Please check your NEXT_PUBLIC_AGENT_ID.' },
          { status: 404 }
        );
      } else {
        return NextResponse.json(
          { error: `ElevenLabs API error: ${response.status} ${response.statusText}` },
          { status: response.status }
        );
      }
    }

    const data = await response.json();
    
    if (!data.signed_url) {
      console.error('No signed URL in response:', data);
      return NextResponse.json(
        { error: 'Invalid response from ElevenLabs API - no signed URL received' },
        { status: 500 }
      );
    }

    console.log('Successfully generated signed URL');
    return NextResponse.json({ signedUrl: data.signed_url });
    
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
