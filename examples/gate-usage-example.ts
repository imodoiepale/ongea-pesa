// Example: How to use gate_id and gate_name in your application

import { createClient } from '@/lib/supabase/server';

// ========================================
// Example 1: Get User's Gate Information
// ========================================
export async function getUserGateInfo(userId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('users')
    .select('gate_id, gate_name, email')
    .eq('id', userId)
    .single();
    
  if (error) {
    console.error('Error fetching gate info:', error);
    return null;
  }
  
  return {
    gateId: data.gate_id,
    gateName: data.gate_name,
    email: data.email,
  };
}

// ========================================
// Example 2: Make Payment Using Gate
// ========================================
export async function makeGatePayment(userId: string, amount: number, recipient: string) {
  const gateInfo = await getUserGateInfo(userId);
  
  if (!gateInfo?.gateId) {
    throw new Error('User does not have a payment gate');
  }
  
  // Call external payment API using gate_id
  const formData = new FormData();
  formData.append('request', '1'); // Example: payment request type
  formData.append('gate_id', gateInfo.gateId.toString());
  formData.append('amount', amount.toString());
  formData.append('recipient', recipient);
  
  const response = await fetch('https://aps.co.ke/indexpay/api/get_transactions_2.php', {
    method: 'POST',
    body: formData,
  });
  
  const result = await response.json();
  return result;
}

// ========================================
// Example 3: Check Gate Balance
// ========================================
export async function getGateBalance(userId: string) {
  const gateInfo = await getUserGateInfo(userId);
  
  if (!gateInfo?.gateId) {
    throw new Error('User does not have a payment gate');
  }
  
  // Call external API to get gate balance
  const formData = new FormData();
  formData.append('request', '5'); // Example: balance check request type
  formData.append('gate_id', gateInfo.gateId.toString());
  
  const response = await fetch('https://aps.co.ke/indexpay/api/get_transactions_2.php', {
    method: 'POST',
    body: formData,
  });
  
  const result = await response.json();
  return {
    balance: result.balance || 0,
    currency: 'KES',
    gateName: gateInfo.gateName,
  };
}

// ========================================
// Example 4: Get Gate Transactions
// ========================================
export async function getGateTransactions(userId: string, limit: number = 10) {
  const gateInfo = await getUserGateInfo(userId);
  
  if (!gateInfo?.gateId) {
    throw new Error('User does not have a payment gate');
  }
  
  // Call external API to get transactions
  const formData = new FormData();
  formData.append('request', '3'); // Example: get transactions request type
  formData.append('gate_id', gateInfo.gateId.toString());
  formData.append('limit', limit.toString());
  
  const response = await fetch('https://aps.co.ke/indexpay/api/get_transactions_2.php', {
    method: 'POST',
    body: formData,
  });
  
  const result = await response.json();
  return result.transactions || [];
}

// ========================================
// Example 5: Create Gate for Existing User (Manual)
// ========================================
export async function createGateForUser(userId: string, email: string) {
  const supabase = await createClient();
  
  // Check if user already has a gate
  const { data: user } = await supabase
    .from('users')
    .select('gate_id')
    .eq('id', userId)
    .single();
    
  if (user?.gate_id) {
    return {
      success: false,
      message: 'User already has a gate',
      gateId: user.gate_id,
    };
  }
  
  // Call the gate creation API
  const response = await fetch('/api/gate/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
  
  return await response.json();
}

// ========================================
// Example 6: Sync Gate Balance to Wallet
// ========================================
export async function syncGateBalanceToWallet(userId: string) {
  const supabase = await createClient();
  
  // Get gate balance
  const gateBalance = await getGateBalance(userId);
  
  // Update wallet balance in users table
  const { error } = await supabase
    .from('users')
    .update({
      balance: gateBalance.balance,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
    
  if (error) {
    throw new Error(`Failed to sync balance: ${error.message}`);
  }
  
  return {
    success: true,
    balance: gateBalance.balance,
    currency: gateBalance.currency,
  };
}

// ========================================
// Example 7: React Hook for Gate Info
// ========================================
/*
// Usage in a React component:

import { useState, useEffect } from 'react';

export function useGateInfo() {
  const [gateInfo, setGateInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    async function fetchGateInfo() {
      try {
        const response = await fetch('/api/gate/info');
        const data = await response.json();
        setGateInfo(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchGateInfo();
  }, []);
  
  return { gateInfo, loading, error };
}

// In your component:
function WalletDashboard() {
  const { gateInfo, loading, error } = useGateInfo();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <h2>Your Wallet</h2>
      <p>Gate ID: {gateInfo.gateId}</p>
      <p>Gate Name: {gateInfo.gateName}</p>
    </div>
  );
}
*/

// ========================================
// Example 8: API Route to Get Gate Info
// ========================================
/*
// File: app/api/gate/info/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    const { data: userData, error } = await supabase
      .from('users')
      .select('gate_id, gate_name, email')
      .eq('id', user.id)
      .single();
      
    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch gate info' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      gateId: userData.gate_id,
      gateName: userData.gate_name,
      email: userData.email,
      hasGate: !!userData.gate_id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
*/

// ========================================
// Example 9: Check if User Has Gate
// ========================================
export async function userHasGate(userId: string): Promise<boolean> {
  const supabase = await createClient();
  
  const { data } = await supabase
    .from('users')
    .select('gate_id')
    .eq('id', userId)
    .single();
    
  return !!data?.gate_id;
}

// ========================================
// Example 10: Retry Failed Gate Creation
// ========================================
export async function retryGateCreation(userId: string) {
  const supabase = await createClient();
  
  // Get user's email
  const { data: user } = await supabase
    .from('users')
    .select('email, gate_id')
    .eq('id', userId)
    .single();
    
  if (!user?.email) {
    throw new Error('User email not found');
  }
  
  if (user.gate_id) {
    return {
      success: false,
      message: 'User already has a gate',
    };
  }
  
  // Call gate creation API
  const response = await fetch('/api/gate/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: user.email,
      userId: userId,
    }),
  });
  
  return await response.json();
}

// ========================================
// Type Definitions
// ========================================
export interface GateInfo {
  gateId: number;
  gateName: string;
  email: string;
}

export interface GateBalance {
  balance: number;
  currency: string;
  gateName: string;
}

export interface GateTransaction {
  id: string;
  amount: number;
  type: string;
  status: string;
  createdAt: string;
}
