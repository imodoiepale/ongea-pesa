// Enhanced MCP Server for Ongea Pesa with Sheng Integration
const { createSupabaseClient } = require('@supabase/supabase-js');

class OngeaPesaMCPServer {
  constructor() {
    this.supabase = createSupabaseClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  // Enhanced send_money tool with Sheng responses
  async send_money(params) {
    const { 
      user_id, 
      type, 
      amount, 
      phone, 
      till, 
      paybill, 
      account, 
      agent, 
      store, 
      bank_code,
      voice_command_text,
      confidence_score = 95,
      voice_verified = true 
    } = params;

    try {
      // 1. Check transaction limits
      const limitCheck = await this.checkTransactionLimits(user_id, type, amount);
      if (!limitCheck.allowed) {
        return {
          success: false,
          message: `Eish buda, ${limitCheck.reason}. Doh iko tight!`,
          sheng_response: "Kwani huna change kidogo?",
          error_code: "LIMIT_EXCEEDED"
        };
      }

      // 2. Create transaction record
      const transaction = await this.createTransaction({
        user_id,
        type,
        amount,
        phone,
        till,
        paybill,
        account,
        agent,
        store,
        bank_code,
        voice_command_text,
        confidence_score,
        voice_verified,
        status: 'pending'
      });

      // 3. Process with M-Pesa API (mock for now)
      const mpesaResult = await this.processMpesaTransaction(transaction);

      // 4. Update transaction status
      await this.updateTransactionStatus(
        transaction.id, 
        mpesaResult.success ? 'completed' : 'failed',
        mpesaResult.mpesa_transaction_id
      );

      // 5. Generate Sheng response based on transaction type
      const shengResponse = this.generateShengResponse(type, amount, mpesaResult.success);

      return {
        success: mpesaResult.success,
        transaction_id: transaction.id,
        message: shengResponse.message,
        sheng_response: shengResponse.sheng,
        mpesa_transaction_id: mpesaResult.mpesa_transaction_id,
        amount_processed: amount,
        type: type
      };

    } catch (error) {
      console.error('Send money error:', error);
      return {
        success: false,
        message: "Eish jamaa, system iko na shida kidogo. Jaribu tena!",
        sheng_response: "Pole buda, tusort hii haraka!",
        error: error.message
      };
    }
  }

  // Generate contextual Sheng responses
  generateShengResponse(type, amount, success) {
    const responses = {
      send_phone: {
        success: {
          message: `Tumeshinda buda! Pesa ${amount} imefika kwa msee haraka sana!`,
          sheng: "Poa sana mkuu, doh imeland!"
        },
        failure: {
          message: `Eish jamaa, pesa haijafika. System iko tight kidogo.`,
          sheng: "Pole buda, jaribu tena baadaye!"
        }
      },
      buy_goods_till: {
        success: {
          message: `Sawa sawa! Till imelipwa ${amount}. Msee ako sorted!`,
          sheng: "Fresh! Biashara imesonga mbele!"
        },
        failure: {
          message: `Aii msee, till haijalipiwa. Kuna shida kidogo.`,
          sheng: "Ngoja kidogo, tusort hii haraka!"
        }
      },
      paybill: {
        success: {
          message: `Poa! Bill ya ${amount} imelipwa. Umesorted kabisa!`,
          sheng: "Mkurugenzi! Bill imeclear!"
        },
        failure: {
          message: `Lakini buda, bill haijalipiwa. System ni tight.`,
          sheng: "Usistress, tutajaribu tena!"
        }
      },
      withdraw: {
        success: {
          message: `Haraka sana! Cash ${amount} iko ready kwa wakala!`,
          sheng: "Liquid cash iko sorted buda!"
        },
        failure: {
          message: `Eish mzee, cash haijatoka. Wakala ako na shida.`,
          sheng: "Pole, jaribu wakala mwingine!"
        }
      }
    };

    const typeResponses = responses[type] || responses.send_phone;
    return success ? typeResponses.success : typeResponses.failure;
  }

  // Create transaction with enhanced data
  async createTransaction(data) {
    const { data: transaction, error } = await this.supabase
      .from('transactions')
      .insert({
        ...data,
        initiated_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return transaction;
  }

  // Check transaction limits with Sheng responses
  async checkTransactionLimits(user_id, type, amount) {
    const { data: limits, error } = await this.supabase
      .from('transaction_limits')
      .select('*')
      .eq('user_id', user_id)
      .eq('is_active', true);

    if (error) throw error;

    // Check daily limit
    const { data: dailyTotal } = await this.supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', user_id)
      .gte('created_at', new Date().toISOString().split('T')[0])
      .eq('status', 'completed');

    const todayTotal = dailyTotal?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
    const dailyLimit = limits.find(l => l.limit_type === 'daily')?.max_amount || 50000;

    if (todayTotal + parseFloat(amount) > dailyLimit) {
      return {
        allowed: false,
        reason: `Daily limit ya ${dailyLimit} imeshindwa. Leo umeshatuma ${todayTotal}`
      };
    }

    // Check per transaction limit
    const perTxLimit = limits.find(l => l.limit_type === 'per_transaction')?.max_amount || 25000;
    if (parseFloat(amount) > perTxLimit) {
      return {
        allowed: false,
        reason: `Amount kubwa sana! Maximum ni ${perTxLimit} per transaction`
      };
    }

    return { allowed: true };
  }

  // Mock M-Pesa processing (replace with actual API)
  async processMpesaTransaction(transaction) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock success/failure (90% success rate)
    const success = Math.random() > 0.1;
    
    return {
      success,
      mpesa_transaction_id: success ? `ONG${Date.now()}` : null,
      error_message: success ? null : "Insufficient balance"
    };
  }

  // Update transaction status
  async updateTransactionStatus(transaction_id, status, mpesa_id = null) {
    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
      updateData.mpesa_transaction_id = mpesa_id;
    }

    const { error } = await this.supabase
      .from('transactions')
      .update(updateData)
      .eq('id', transaction_id);

    if (error) throw error;
  }

  // Get user transaction history with Sheng summaries
  async getUserTransactions(user_id, limit = 20) {
    const { data: transactions, error } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Add Sheng summaries
    return transactions.map(t => ({
      ...t,
      sheng_summary: this.getTransactionShengSummary(t)
    }));
  }

  // Generate Sheng transaction summaries
  getTransactionShengSummary(transaction) {
    const { type, amount, status } = transaction;
    
    const summaries = {
      send_phone: `Ulituma ${amount} kwa msee`,
      buy_goods_till: `Ulilipa till ${amount}`,
      paybill: `Bill ya ${amount} imelipwa`,
      withdraw: `Ulitoa ${amount} cash`
    };

    const statusSheng = {
      completed: "imesonga poa",
      failed: "haikuwork",
      pending: "inangoja"
    };

    return `${summaries[type] || 'Transaction'} - ${statusSheng[status]}`;
  }

  // Create user with default settings
  async createUser(phone, name) {
    const { data: user, error } = await this.supabase
      .from('users')
      .insert({
        phone,
        name,
        balance: 0,
        daily_limit: 50000,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    // Set up default limits
    await this.setupDefaultLimits(user.id);

    return {
      user_id: user.id,
      phone: user.phone,
      name: user.name,
      sheng_welcome: `Karibu ${name}! Umejoin Ongea Pesa family. Tuko sorted!`
    };
  }

  // Setup default transaction limits
  async setupDefaultLimits(user_id) {
    const defaultLimits = [
      { limit_type: 'daily', transaction_type: 'send_phone', max_amount: 30000 },
      { limit_type: 'daily', transaction_type: 'buy_goods_till', max_amount: 25000 },
      { limit_type: 'daily', transaction_type: 'paybill', max_amount: 50000 },
      { limit_type: 'per_transaction', transaction_type: 'send_phone', max_amount: 10000 },
      { limit_type: 'per_transaction', transaction_type: 'buy_goods_till', max_amount: 15000 }
    ];

    const limitsToInsert = defaultLimits.map(limit => ({
      user_id,
      ...limit,
      is_active: true
    }));

    const { error } = await this.supabase
      .from('transaction_limits')
      .insert(limitsToInsert);

    if (error) throw error;
  }
}

module.exports = OngeaPesaMCPServer;
