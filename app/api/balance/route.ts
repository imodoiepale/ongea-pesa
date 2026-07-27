import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile with wallet balance
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_balance, phone_number, mpesa_number')
      .eq('id', user.id)
      .single()

    // If profile doesn't exist, create it
    if (profileError && profileError.code === 'PGRST116') {
      console.log('⚠️ Profile not found, creating one for user:', user.id)
      
      // Create profile with proper defaults
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email || '',
          wallet_balance: 0,
          daily_limit: 100000,
          monthly_limit: 500000,
          kyc_verified: false,
          wallet_type: 'wallet',
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('wallet_balance, phone_number, mpesa_number')
        .single()
      
      if (createError) {
        console.error('❌ Error creating profile:', createError)
        console.error('Error details:', JSON.stringify(createError, null, 2))
        
        // Try to fetch again in case it was created by trigger
        const { data: retryProfile } = await supabase
          .from('profiles')
          .select('wallet_balance, phone_number, mpesa_number')
          .eq('id', user.id)
          .single()
        
        if (retryProfile) {
          profile = retryProfile
          console.log('✅ Profile found on retry')
        } else {
          return NextResponse.json(
            { error: 'Failed to create profile', details: createError },
            { status: 500 }
          )
        }
      } else {
        profile = newProfile
        console.log('✅ Profile created successfully')
      }
    } else if (profileError) {
      console.error('❌ Error fetching profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch balance' },
        { status: 500 }
      )
    }

    // Single source of truth: profiles.wallet_balance is maintained by DB triggers
    // (update_wallet_balance / update_wallet_balance_on_status_change) on every
    // transaction that reaches 'completed'. Do NOT recompute from transactions here —
    // that created an inconsistent third behavior that diverged from the stored ledger.
    const balance = profile?.wallet_balance || 0

    return NextResponse.json({
      success: true,
      balance: balance,
      phone: profile?.phone_number,
      mpesa: profile?.mpesa_number,
    })

  } catch (error) {
    console.error('Balance API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
