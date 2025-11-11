import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Platform fee percentage
const PLATFORM_FEE_PERCENTAGE = 0.005; // 0.5%

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // TODO: Add admin role check
    // For now, any authenticated user can access
    // In production, check if user has 'admin' or 'creator' role

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'month';
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    // Calculate date range based on period
    let startDate: Date;
    let endDate: Date;

    if (period === 'day') {
      const day = parseInt(searchParams.get('day') || new Date().getDate().toString());
      startDate = new Date(year, month - 1, day, 0, 0, 0);
      endDate = new Date(year, month - 1, day, 23, 59, 59);
    } else if (period === 'week') {
      // Last 7 days
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
    } else if (period === 'year') {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59);
    } else {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
    }

    console.log('📊 Fetching revenue summary:', {
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    // Fetch all completed transactions in the period
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (txError) {
      console.error('❌ Error fetching transactions:', txError);
      throw txError;
    }

    // Calculate revenue metrics
    let totalRevenue = 0;
    let transactionCount = 0;
    let totalTransactionValue = 0;
    const uniqueUsers = new Set<string>();
    const byTransactionType: Record<string, { count: number; revenue: number; total_value: number }> = {};
    const dailyBreakdown: Record<string, { revenue: number; transactions: number }> = {};

    transactions?.forEach(tx => {
      const amount = parseFloat(String(tx.amount));
      const txType = tx.type;
      
      // Platform fee calculation (0.5% on all transactions except deposits)
      let platformFee = 0;
      if (txType !== 'deposit') {
        platformFee = amount * PLATFORM_FEE_PERCENTAGE;
        totalRevenue += platformFee;
      }

      // Track metrics
      transactionCount++;
      totalTransactionValue += amount;
      uniqueUsers.add(tx.user_id);

      // By transaction type
      if (!byTransactionType[txType]) {
        byTransactionType[txType] = { count: 0, revenue: 0, total_value: 0 };
      }
      byTransactionType[txType].count++;
      byTransactionType[txType].revenue += platformFee;
      byTransactionType[txType].total_value += amount;

      // Daily breakdown
      const date = new Date(tx.created_at).toISOString().split('T')[0];
      if (!dailyBreakdown[date]) {
        dailyBreakdown[date] = { revenue: 0, transactions: 0 };
      }
      dailyBreakdown[date].revenue += platformFee;
      dailyBreakdown[date].transactions++;
    });

    // Convert daily breakdown to array and sort by date
    const dailyArray = Object.entries(dailyBreakdown)
      .map(([date, data]) => ({
        date,
        revenue: Math.round(data.revenue * 100) / 100,
        transactions: data.transactions,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Round revenue to 2 decimal places
    totalRevenue = Math.round(totalRevenue * 100) / 100;

    const response = {
      success: true,
      period: `${year}-${month.toString().padStart(2, '0')}`,
      date_range: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      },
      summary: {
        total_revenue: totalRevenue,
        platform_fees: totalRevenue, // Same as total revenue for now
        transaction_count: transactionCount,
        transaction_value: Math.round(totalTransactionValue * 100) / 100,
        unique_users: uniqueUsers.size,
        average_transaction: transactionCount > 0 
          ? Math.round((totalTransactionValue / transactionCount) * 100) / 100
          : 0,
        average_revenue_per_transaction: transactionCount > 0
          ? Math.round((totalRevenue / transactionCount) * 100) / 100
          : 0,
      },
      by_transaction_type: Object.entries(byTransactionType).map(([type, data]) => ({
        type,
        count: data.count,
        revenue: Math.round(data.revenue * 100) / 100,
        total_value: Math.round(data.total_value * 100) / 100,
        percentage: transactionCount > 0 
          ? Math.round((data.count / transactionCount) * 10000) / 100
          : 0,
      })),
      daily_breakdown: dailyArray,
    };

    console.log('✅ Revenue summary generated:', {
      total_revenue: totalRevenue,
      transactions: transactionCount,
      users: uniqueUsers.size,
    });

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ Revenue summary error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate revenue summary',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
