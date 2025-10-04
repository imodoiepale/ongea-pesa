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
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_balance, phone_number, mpesa_number')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch balance' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      balance: profile?.wallet_balance || 0,
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
