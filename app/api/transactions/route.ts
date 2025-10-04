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

    // Get all transactions for user
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (txError) {
      console.error('Error fetching transactions:', txError)
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      )
    }

    // Calculate balance from transactions
    let calculatedBalance = 0
    
    for (const tx of transactions || []) {
      if (tx.status === 'completed') {
        if (tx.type === 'deposit' || tx.type === 'receive') {
          // Add money
          calculatedBalance += parseFloat(tx.amount)
        } else {
          // Subtract money (sends, payments, withdrawals)
          calculatedBalance -= parseFloat(tx.amount)
        }
      }
    }

    return NextResponse.json({
      success: true,
      transactions: transactions || [],
      calculatedBalance: calculatedBalance,
    })

  } catch (error) {
    console.error('Transactions API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
