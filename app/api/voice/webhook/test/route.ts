import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/voice/webhook/test
 * Test endpoint to verify webhook is accessible from ElevenLabs
 */
export async function GET(request: NextRequest) {
  console.log('🧪 TEST ENDPOINT CALLED - Webhook is accessible')
  console.log('Timestamp:', new Date().toISOString())
  console.log('Request URL:', request.url)
  console.log('Request Headers:', Object.fromEntries(request.headers))
  
  return NextResponse.json({
    success: true,
    message: 'Webhook endpoint is accessible and working',
    timestamp: new Date().toISOString(),
    server: 'Ongea Pesa Voice Webhook',
    version: '1.0.0'
  })
}

/**
 * POST /api/voice/webhook/test
 * Test POST request from ElevenLabs
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('🧪 TEST POST ENDPOINT CALLED')
    console.log('Timestamp:', new Date().toISOString())
    console.log('Request URL:', request.url)
    console.log('Request Headers:', Object.fromEntries(request.headers))
    console.log('Request Body:', JSON.stringify(body, null, 2))
    
    return NextResponse.json({
      success: true,
      message: 'POST test successful - webhook can receive data',
      received_data: body,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Test POST error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process test request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
