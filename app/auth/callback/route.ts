import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')
  const origin = requestUrl.origin

  // Handle errors
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error_description || error)}`
    )
  }

  // Exchange code for session
  if (code) {
    const supabase = await createClient()
    const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`
      )
    }

    // After successful email confirmation, ensure user has a wallet/gate
    if (sessionData?.user) {
      console.log('✅ Email confirmed for user:', sessionData.user.email)
      
      try {
        // Check if user already has a gate
        const { data: profile } = await supabase
          .from('profiles')
          .select('gate_id, gate_name')
          .eq('id', sessionData.user.id)
          .single()

        // Create gate if user doesn't have one
        if (!profile?.gate_id || !profile?.gate_name) {
          console.log('🔧 Creating wallet for new user:', sessionData.user.email)
          
          // Call gate creation endpoint
          const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`
          const gateResponse = await fetch(`${baseUrl}/api/gate/signup`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: sessionData.user.email,
              userId: sessionData.user.id
            })
          })

          if (gateResponse.ok) {
            const gateData = await gateResponse.json()
            console.log('✅ Wallet created:', gateData.gate_id, gateData.gate_name)
          } else {
            const gateError = await gateResponse.json()
            console.error('❌ Wallet creation failed:', gateError)
            // Don't block login if gate creation fails
          }
        } else {
          console.log('✅ User already has wallet:', profile.gate_id, profile.gate_name)
        }
      } catch (gateError) {
        console.error('⚠️ Gate check/creation error (non-blocking):', gateError)
        // Don't block the auth flow if gate creation fails
      }
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${origin}/`)
}
