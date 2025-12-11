import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Get the authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const { transaction_reference, transaction_id, gate_name } = await request.json();

        if (!gate_name) {
            return NextResponse.json(
                { error: 'Gate name is required' },
                { status: 400 }
            );
        }

        // console.log(`🔍 Verifying transaction: ${transaction_reference || transaction_id} for gate ${gate_name}`);

        // Set date range: today and tomorrow to catch recent and processing transactions
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const dateFrom = today.toISOString().split('T')[0]; // YYYY-MM-DD
        const dateTo = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

        // console.log(`📅 Date range: ${dateFrom} to ${dateTo}`);

        // Prepare form data for get_settlements API
        const formData = new FormData();
        formData.append('user_email', 'info@nsait.co.ke');
        formData.append('date_from', dateFrom);
        formData.append('date_to', dateTo);

        // Set up timeout for external API call
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds

        let settlementsResponse;
        try {
            settlementsResponse = await fetch('https://aps.co.ke/indexpay/api/get_settlements.php', {
                method: 'POST',
                body: formData,
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
        } catch (fetchError: any) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Verification request timed out',
                        status: 'pending'
                    },
                    { status: 408 }
                );
            }
            throw fetchError;
        }

        if (!settlementsResponse.ok) {
            console.error(`❌ Settlements API failed: ${settlementsResponse.status}`);
            return NextResponse.json(
                {
                    success: false,
                    error: 'Failed to fetch settlements',
                    status: 'pending'
                },
                { status: 500 }
            );
        }

        const settlementsData = await settlementsResponse.json();
        // console.log('📊 Settlements response:', JSON.stringify(settlementsData, null, 2));

        // Parse the settlements response
        // Format: [{ "transactions": [...], "email": "...", "date_from": "...", "date_to": "..." }]
        let transactions: any[] = [];

        if (Array.isArray(settlementsData) && settlementsData.length > 0) {
            const data = settlementsData[0];
            if (data.transactions && Array.isArray(data.transactions)) {
                transactions = data.transactions;
            }
        } else if (settlementsData.transactions && Array.isArray(settlementsData.transactions)) {
            transactions = settlementsData.transactions;
        }

        // console.log(`📝 Found ${transactions.length} transactions in date range`);

        // Filter transactions for this gate
        const gateTransactions = transactions.filter((tx: any) =>
            tx.Gate === gate_name || tx.gate === gate_name
        );

        // console.log(`🔐 Found ${gateTransactions.length} transactions for gate ${gate_name}`);

        // If we have a specific transaction reference, find it
        let matchedTransaction = null;
        if (transaction_reference) {
            matchedTransaction = gateTransactions.find((tx: any) =>
                tx.trx_ID === transaction_reference ||
                tx.trx_id === transaction_reference ||
                tx.TransactionID === transaction_reference
            );
        }

        // Determine status
        let verificationStatus = 'pending';
        let verificationMessage = 'Transaction is still processing';

        if (matchedTransaction) {
            const txStatus = (matchedTransaction.Status || matchedTransaction.status || '').toLowerCase();

            if (txStatus === 'success' || txStatus === 'completed') {
                verificationStatus = 'completed';
                verificationMessage = 'Transaction completed successfully';
            } else if (txStatus === 'failed') {
                verificationStatus = 'failed';
                verificationMessage = 'Transaction failed';
            } else if (txStatus === 'cancelled' || txStatus === 'canceled') {
                verificationStatus = 'cancelled';
                verificationMessage = 'Transaction was cancelled. You can try again.';
            } else if (txStatus === 'pending') {
                verificationStatus = 'pending';
                verificationMessage = 'Transaction is still processing';
            }
        }

        // Update local transaction record and balance if we have a transaction_id
        if (transaction_id && verificationStatus !== 'pending') {
            // ATOMIC UPDATE: Only update if status is NOT already completed
            // This prevents race conditions from double-crediting
            const { data: updatedTx, error: updateError } = await supabase
                .from('transactions')
                .update({
                    status: verificationStatus,
                    updated_at: new Date().toISOString(),
                    metadata: {
                        verified_at: new Date().toISOString(),
                        settlement_data: matchedTransaction || null
                    }
                })
                .eq('id', transaction_id)
                .eq('user_id', user.id)
                .neq('status', 'completed') // Only update if NOT already completed
                .select('amount')
                .single();

            if (updateError) {
                // If no rows updated, transaction was already completed
                if (updateError.code === 'PGRST116') {
                    console.log('⚠️ Transaction already completed, skipping balance update');
                } else {
                    console.error('⚠️ Failed to update transaction status:', updateError);
                }
            } else if (updatedTx && verificationStatus === 'completed') {
                // Transaction was updated (not already completed), now credit balance
                const depositAmount = parseFloat(updatedTx.amount) || 0;

                if (depositAmount > 0) {
                    // Get current balance
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('wallet_balance')
                        .eq('id', user.id)
                        .single();

                    const currentBalance = parseFloat(profile?.wallet_balance) || 0;
                    const newBalance = currentBalance + depositAmount;

                    // Update balance
                    const { error: balanceError } = await supabase
                        .from('profiles')
                        .update({
                            wallet_balance: newBalance,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', user.id);

                    if (balanceError) {
                        console.error('❌ Failed to update wallet balance:', balanceError);
                    } else {
                        console.log(`💰 Wallet credited: ${currentBalance} + ${depositAmount} = ${newBalance}`);
                    }
                }
            }
        }

        // Get updated balance to return
        let updatedBalance = 0;
        if (verificationStatus === 'completed') {
            const { data: updatedProfile } = await supabase
                .from('profiles')
                .select('wallet_balance')
                .eq('id', user.id)
                .single();
            updatedBalance = parseFloat(updatedProfile?.wallet_balance) || 0;
        }

        return NextResponse.json({
            success: true,
            status: verificationStatus,
            message: verificationMessage,
            transaction_found: !!matchedTransaction,
            transaction: matchedTransaction || null,
            updated_balance: updatedBalance,
            gate_transactions_count: gateTransactions.length,
            date_range: {
                from: dateFrom,
                to: dateTo
            }
        });

    } catch (error: any) {
        console.error('❌ Transaction verification error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to verify transaction',
                details: error?.message || 'Unknown error',
                status: 'pending'
            },
            { status: 500 }
        );
    }
}
