/**
 * Escrow & Chama Test Examples
 * 
 * This file contains example test scenarios for the Escrow and Chama systems.
 * Run these tests to verify the functionality of both systems.
 */

// ============================================
// ESCROW TEST SCENARIOS
// ============================================

/**
 * Test 1: Simple Two-Party Escrow
 * Buyer purchases item from seller with escrow protection
 */
export async function testSimpleEscrow() {
  console.log('🧪 Test 1: Simple Two-Party Escrow');
  
  // Step 1: Create escrow
  const createResponse = await fetch('/api/escrow/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'iPhone 15 Purchase',
      description: 'Buying iPhone 15 Pro Max from seller',
      escrow_type: 'two_party',
      total_amount: 150000,
      currency: 'KES',
      buyer_phone: '0712345678',
      seller_phone: '0723456789',
      auto_release_days: 7, // Auto-release after 7 days if no dispute
    }),
  });
  
  const { escrow } = await createResponse.json();
  console.log('✅ Escrow created:', escrow.id);
  
  // Step 2: Fund escrow
  const fundResponse = await fetch('/api/escrow/fund', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      escrow_id: escrow.id,
      amount: 150000,
    }),
  });
  
  const fundResult = await fundResponse.json();
  console.log('💰 STK sent:', fundResult.stk_reference);
  
  // Step 3: After buyer confirms delivery, release funds
  const releaseResponse = await fetch('/api/escrow/release', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      escrow_id: escrow.id,
    }),
  });
  
  const releaseResult = await releaseResponse.json();
  console.log('✅ Funds released:', releaseResult.released_amount);
  
  return { escrow, fundResult, releaseResult };
}

/**
 * Test 2: Milestone-Based Escrow
 * Project with multiple deliverables
 */
export async function testMilestoneEscrow() {
  console.log('🧪 Test 2: Milestone-Based Escrow');
  
  const createResponse = await fetch('/api/escrow/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Website Development Project',
      description: 'Build complete e-commerce website',
      escrow_type: 'milestone',
      total_amount: 100000,
      currency: 'KES',
      buyer_phone: '0712345678',
      seller_phone: '0723456789',
      arbitrator_phone: '0734567890',
      requires_multi_sig: false,
      milestones: [
        { title: 'Design Phase', amount: '25000', description: 'UI/UX mockups' },
        { title: 'Frontend Development', amount: '35000', description: 'Build UI components' },
        { title: 'Backend & Integration', amount: '30000', description: 'API and database' },
        { title: 'Testing & Launch', amount: '10000', description: 'QA and deployment' },
      ],
    }),
  });
  
  const { escrow } = await createResponse.json();
  console.log('✅ Milestone escrow created with 4 milestones');
  
  // Fund full amount
  await fetch('/api/escrow/fund', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ escrow_id: escrow.id, amount: 100000 }),
  });
  
  // Release milestone 1 after design approval
  const milestone1Release = await fetch('/api/escrow/release', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      escrow_id: escrow.id,
      milestone_id: 'milestone-1-id', // Replace with actual ID
    }),
  });
  
  console.log('✅ Milestone 1 released');
  
  return { escrow };
}

/**
 * Test 3: Multi-Signature Escrow
 * Requires 2-of-3 approvals to release
 */
export async function testMultiSigEscrow() {
  console.log('🧪 Test 3: Multi-Signature Escrow');
  
  const createResponse = await fetch('/api/escrow/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'High-Value Equipment Purchase',
      description: 'Industrial equipment requiring multiple approvals',
      escrow_type: 'two_party',
      total_amount: 500000,
      currency: 'KES',
      buyer_phone: '0712345678',
      seller_phone: '0723456789',
      arbitrator_phone: '0734567890',
      requires_multi_sig: true,
      required_signatures: 2, // 2 of 3 must approve
      lock_days: 3, // Funds locked for 3 days minimum
    }),
  });
  
  const { escrow } = await createResponse.json();
  console.log('✅ Multi-sig escrow created (2-of-3 required)');
  
  return { escrow };
}

/**
 * Test 4: Escrow with Dispute
 */
export async function testEscrowDispute() {
  console.log('🧪 Test 4: Escrow Dispute Flow');
  
  // Assume escrow exists and is funded
  const escrow_id = 'existing-escrow-id';
  
  // Buyer raises dispute
  const disputeResponse = await fetch('/api/escrow/dispute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      escrow_id,
      reason: 'Item not as described',
      description: 'The product received does not match the listing photos',
      evidence: [
        { type: 'image', url: 'https://example.com/evidence1.jpg' },
        { type: 'text', content: 'Chat screenshot showing seller claims' },
      ],
    }),
  });
  
  const disputeResult = await disputeResponse.json();
  console.log('⚠️ Dispute raised:', disputeResult.dispute_id);
  
  return { disputeResult };
}

// ============================================
// CHAMA TEST SCENARIOS
// ============================================

/**
 * Test 5: Create Chama with 30 Members
 * Full chama setup with bulk member addition
 */
export async function testCreateChama() {
  console.log('🧪 Test 5: Create Chama with 30 Members');
  
  // Generate 30 test members
  const members = [];
  for (let i = 1; i <= 30; i++) {
    members.push({
      name: `Member ${i}`,
      phone: `07${String(10000000 + i).slice(1)}`, // 0710000001, 0710000002, etc.
      email: `member${i}@test.com`,
    });
  }
  
  const createResponse = await fetch('/api/chama/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Office Merry-Go-Round',
      description: 'Monthly savings group for office colleagues',
      contribution_amount: 5000,
      currency: 'KES',
      collection_frequency: 'monthly',
      collection_day: 25,
      rotation_type: 'sequential',
      total_cycles: 30, // Each member gets payout once
      late_fee_percentage: 5,
      grace_period_hours: 48,
      allow_partial_payments: false,
      require_all_before_payout: true,
      members,
    }),
  });
  
  const { chama, members_added } = await createResponse.json();
  console.log(`✅ Chama created with ${members_added} members`);
  console.log(`💰 Expected collection per cycle: KES ${5000 * 30} = KES 150,000`);
  
  return { chama };
}

/**
 * Test 6: Start Collection & Track 30 STK Pushes
 */
export async function testBulkCollection(chama_id: string) {
  console.log('🧪 Test 6: Bulk STK Collection (30 members)');
  
  // Start collection - sends 30 STK pushes
  const startResponse = await fetch('/api/chama/start-collection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chama_id }),
  });
  
  const { cycle_id, stk_sent, stk_failed, results } = await startResponse.json();
  console.log(`📱 STK pushes sent: ${stk_sent} success, ${stk_failed} failed`);
  
  // Poll status every 5 seconds
  let allComplete = false;
  let pollCount = 0;
  const maxPolls = 60; // 5 minutes max
  
  while (!allComplete && pollCount < maxPolls) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const pollResponse = await fetch(`/api/chama/poll-stk?cycle_id=${cycle_id}`);
    const status = await pollResponse.json();
    
    console.log(`📊 Poll ${pollCount + 1}: ${status.completed}/${status.total_members} paid, KES ${status.collected_amount} collected`);
    
    if (status.all_completed) {
      allComplete = true;
      console.log('✅ All members have paid!');
    }
    
    pollCount++;
  }
  
  return { cycle_id, results };
}

/**
 * Test 7: Retry Failed STK
 */
export async function testRetryStk(cycle_id: string, member_id: string) {
  console.log('🧪 Test 7: Retry Failed STK');
  
  const retryResponse = await fetch('/api/chama/retry-stk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cycle_id, member_id }),
  });
  
  const result = await retryResponse.json();
  console.log(`🔄 Retry attempt ${result.attempt}/${result.max_attempts}: ${result.success ? 'Success' : 'Failed'}`);
  
  return result;
}

/**
 * Test 8: Distribute Funds to Recipient
 */
export async function testDistribute(cycle_id: string) {
  console.log('🧪 Test 8: Distribute Collected Funds');
  
  const distributeResponse = await fetch('/api/chama/distribute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cycle_id }),
  });
  
  const result = await distributeResponse.json();
  console.log(`💸 Distributed KES ${result.amount} to ${result.recipient.name}`);
  console.log(`📅 Next collection: ${result.next_collection_date}`);
  
  return result;
}

/**
 * Test 9: Random Rotation Shuffle
 */
export async function testShuffleRotation(chama_id: string) {
  console.log('🧪 Test 9: Shuffle Rotation Order');
  
  const shuffleResponse = await fetch('/api/chama/shuffle-rotation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chama_id }),
  });
  
  const { new_order } = await shuffleResponse.json();
  console.log('🔀 New rotation order:');
  new_order.forEach((m: any) => console.log(`  ${m.position}. ${m.name}`));
  
  return { new_order };
}

/**
 * Test 10: Full Chama Cycle (End-to-End)
 */
export async function testFullChamaCycle() {
  console.log('🧪 Test 10: Full Chama Cycle (End-to-End)');
  console.log('='.repeat(50));
  
  // 1. Create chama
  const { chama } = await testCreateChama();
  console.log('\n');
  
  // 2. Start collection
  const { cycle_id } = await testBulkCollection(chama.id);
  console.log('\n');
  
  // 3. Distribute funds
  const distribution = await testDistribute(cycle_id);
  console.log('\n');
  
  console.log('='.repeat(50));
  console.log('✅ FULL CYCLE COMPLETE');
  console.log(`   Chama: ${chama.name}`);
  console.log(`   Collected: KES ${distribution.amount}`);
  console.log(`   Recipient: ${distribution.recipient.name}`);
  console.log(`   Next Cycle: ${distribution.next_cycle}`);
  
  return { chama, cycle_id, distribution };
}

// ============================================
// RUN ALL TESTS
// ============================================

export async function runAllTests() {
  console.log('🚀 Running Escrow & Chama Tests');
  console.log('='.repeat(60));
  
  try {
    // Escrow tests
    await testSimpleEscrow();
    await testMilestoneEscrow();
    await testMultiSigEscrow();
    
    // Chama tests
    await testFullChamaCycle();
    
    console.log('\n✅ ALL TESTS PASSED');
  } catch (error) {
    console.error('❌ TEST FAILED:', error);
  }
}

// Export for use in test runners
export default {
  testSimpleEscrow,
  testMilestoneEscrow,
  testMultiSigEscrow,
  testEscrowDispute,
  testCreateChama,
  testBulkCollection,
  testRetryStk,
  testDistribute,
  testShuffleRotation,
  testFullChamaCycle,
  runAllTests,
};
