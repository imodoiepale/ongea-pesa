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

    let balance = profile?.wallet_balance || 0

    // If balance is 0, calculate from transactions as backup
    if (balance === 0) {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('type, amount, status')
        .eq('user_id', user.id)
        .eq('status', 'completed')

      if (transactions && transactions.length > 0) {
        balance = transactions.reduce((total, tx) => {
          if (tx.type === 'deposit' || tx.type === 'receive') {
            return total + parseFloat(tx.amount)
          } else {
            return total - parseFloat(tx.amount)
          }
        }, 0)
        
        console.log('💡 Calculated balance from transactions:', balance)
      }
    }

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
