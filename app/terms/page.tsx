export default function TermsOfService() {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm p-8 lg:p-12">
          
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-500 mb-8">Last Updated: January 2025</p>
  
          <div className="prose prose-lg max-w-none">
  
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                By accessing or using Ongea Pesa ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service.
              </p>
              <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                <p className="text-sm text-gray-700">
                  <strong>Important:</strong> These Terms constitute a legally binding agreement. Please read them carefully before using our service.
                </p>
              </div>
            </section>
  
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Service Description</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Ongea Pesa is a voice-powered payment platform that enables users to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Execute M-Pesa transactions using voice commands in English and Swahili</li>
                <li>Send money, pay bills, buy goods, and withdraw cash via voice</li>
                <li>Manage payment methods and view transaction history</li>
                <li>Access AI-powered financial insights and analytics</li>
              </ul>
              <p className="text-sm text-gray-600 mt-4 italic">
                Ongea Pesa acts as a facilitator; actual transactions are processed by third-party payment providers (M-Pesa, banks, card networks).
              </p>
            </section>
  
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Pricing & Fees</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mt-6 mb-3">3.1 Transaction Fees</h3>
              <div className="bg-green-50 rounded-lg p-6 mb-4">
                <p className="text-gray-700 mb-3">
                  Ongea Pesa charges a service fee on all outgoing transactions:
                </p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-green-200">
                      <th className="text-left py-2">Transaction Amount</th>
                      <th className="text-left py-2">Ongea Pesa Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-green-100">
                      <td className="py-2">1 - 1,000 KES</td>
                      <td className="py-2 font-medium">1% (min 5 KES)</td>
                    </tr>
                    <tr className="border-b border-green-100">
                      <td className="py-2">1,001 - 10,000 KES</td>
                      <td className="py-2 font-medium">0.8% (min 10 KES)</td>
                    </tr>
                    <tr className="border-b border-green-100">
                      <td className="py-2">10,001 - 50,000 KES</td>
                      <td className="py-2 font-medium">0.5% (min 80 KES)</td>
                    </tr>
                    <tr>
                      <td className="py-2">Above 50,000 KES</td>
                      <td className="py-2 font-medium">0.3% (max 500 KES)</td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-xs text-gray-600 mt-3">
                  <strong>Note:</strong> M-Pesa and other payment providers charge their own separate fees, which are not controlled by Ongea Pesa.
                </p>
              </div>
  
              <h3 className="text-xl font-medium text-gray-800 mt-6 mb-3">3.2 Subscription Plans (Voice Minutes)</h3>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="border border-gray-200 rounded-lg p-5">
                  <h4 className="font-semibold text-gray-800 mb-2">Free Tier</h4>
                  <p className="text-2xl font-bold text-green-600 mb-2">0 KES/month</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>✓ 5 voice minutes/month</li>
                    <li>✓ Unlimited transactions</li>
                    <li>✓ 2% transaction fee</li>
                    <li>✓ Community support</li>
                  </ul>
                </div>
  
                <div className="border-2 border-green-500 rounded-lg p-5 relative">
                  <span className="absolute -top-3 left-4 bg-green-500 text-white text-xs px-3 py-1 rounded-full">POPULAR</span>
                  <h4 className="font-semibold text-gray-800 mb-2">Basic Plan</h4>
                  <p className="text-2xl font-bold text-green-600 mb-2">799 KES/month</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>✓ 50 voice minutes/month</li>
                    <li>✓ Unlimited transactions</li>
                    <li>✓ 1% transaction fee</li>
                    <li>✓ Email support</li>
                  </ul>
                </div>
  
                <div className="border border-gray-200 rounded-lg p-5">
                  <h4 className="font-semibold text-gray-800 mb-2">Pro Plan</h4>
                  <p className="text-2xl font-bold text-green-600 mb-2">2,499 KES/month</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>✓ 200 voice minutes/month</li>
                    <li>✓ Unlimited transactions</li>
                    <li>✓ 0.9% transaction fee</li>
                    <li>✓ Priority support</li>
                    <li>✓ Analytics dashboard</li>
                  </ul>
                </div>
  
                <div className="border border-gray-200 rounded-lg p-5">
                  <h4 className="font-semibold text-gray-800 mb-2">Business Plan</h4>
                  <p className="text-2xl font-bold text-green-600 mb-2">4,999 KES/month</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>✓ Unlimited voice minutes</li>
                    <li>✓ Unlimited transactions</li>
                    <li>✓ 0.7% transaction fee</li>
                    <li>✓ Dedicated support</li>
                    <li>✓ Multi-user accounts</li>
                    <li>✓ API access</li>
                  </ul>
                </div>
              </div>
  
              <h3 className="text-xl font-medium text-gray-800 mt-6 mb-3">3.3 Premium Add-Ons</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Voice Receipts via WhatsApp:</strong> 499 KES/month</li>
                <li><strong>Advanced Analytics Dashboard:</strong> 999 KES/month</li>
                <li><strong>Multi-User Business Accounts:</strong> 3,299 KES/month (up to 5 users)</li>
              </ul>
  
              <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                <p className="text-sm text-gray-700">
                  <strong>Billing:</strong> Subscriptions are billed monthly in advance. You can cancel anytime; cancellation takes effect at the end of your current billing period.
                </p>
              </div>
            </section>
  
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. User Responsibilities</h2>
              
              <h3 className="text-lg font-medium text-gray-800 mb-3">You agree to:</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Use the Service only for lawful purposes</li>
                <li>Not share your account with others</li>
                <li>Verify transaction details before confirming payments</li>
                <li>Report unauthorized transactions within 24 hours</li>
                <li>Comply with all applicable laws and regulations</li>
              </ul>
  
              <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">You agree NOT to:</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Use the Service for fraudulent or illegal activities</li>
                <li>Attempt to reverse-engineer or hack the platform</li>
                <li>Use automated tools (bots) to access the Service</li>
                <li>Violate any intellectual property rights</li>
                <li>Transmit malware or harmful code</li>
                <li>Impersonate another person or entity</li>
              </ul>
            </section>
  
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Transaction Processing & Limits</h2>
              
              <h3 className="text-lg font-medium text-gray-800 mb-3">5.1 Transaction Limits</h3>
              <table className="w-full border-collapse text-sm mb-4">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-3 text-left">Account Tier</th>
                    <th className="border p-3 text-left">Daily Limit</th>
                    <th className="border p-3 text-left">Per Transaction</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border p-3">Unverified</td>
                    <td className="border p-3">10,000 KES</td>
                    <td className="border p-3">5,000 KES</td>
                  </tr>
                  <tr>
                    <td className="border p-3">Verified (Basic KYC)</td>
                    <td className="border p-3">70,000 KES</td>
                    <td className="border p-3">35,000 KES</td>
                  </tr>
                  <tr>
                    <td className="border p-3">Verified (Full KYC)</td>
                    <td className="border p-3">300,000 KES</td>
                    <td className="border p-3">150,000 KES</td>
                  </tr>
                  <tr>
                    <td className="border p-3">Business Account</td>
                    <td className="border p-3">1,000,000 KES</td>
                    <td className="border p-3">500,000 KES</td>
                  </tr>
                </tbody>
              </table>
  
              <h3 className="text-lg font-medium text-gray-800 mb-3">5.2 Transaction Processing</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Processing Time:</strong> Most transactions complete within 7 seconds to 15 seconds</li>
                <li><strong>Confirmation:</strong> You'll receive SMS/in-app notification upon completion</li>
                <li><strong>Failed Transactions:</strong> Automatically refunded within 2-4 hours</li>
                <li><strong>Disputes:</strong> Report within 7 days; investigation takes up to 2 business days</li>
              </ul>
            </section>
  
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Voice Command Accuracy & Liability</h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <p className="text-gray-700 mb-3">
                  <strong>Important Notice:</strong> While our AI voice recognition is highly accurate, errors can occur. You are responsible for:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Reviewing the interpreted command before confirming</li>
                  <li>Speaking clearly in a quiet environment</li>
                  <li>Confirming transaction details (amount, recipient) verbally or via UI</li>
                </ul>
                <p className="text-sm text-gray-600 mt-3">
                  Ongea Pesa is NOT liable for transactions executed based on incorrectly interpreted voice commands that you confirmed.
                </p>
              </div>
            </section>
  
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Refunds & Cancellations</h2>
              
              <h3 className="text-lg font-medium text-gray-800 mb-3">Transaction Refunds:</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Ongea Pesa service fees are <strong>non-refundable</strong> once a transaction is processed</li>
                <li>Failed transactions are automatically refunded (minus any third-party fees)</li>
                <li>Fraudulent transactions may be refunded after investigation</li>
              </ul>
  
              <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">Subscription Cancellations:</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Cancel anytime from account settings</li>
                <li>Cancellation takes effect at the end of current billing period</li>
                <li>No pro-rated refunds for unused portion of subscription</li>
                <li>Unused voice minutes do NOT roll over to next month</li>
              </ul>
            </section>
  
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Intellectual Property</h2>
              <p className="text-gray-700 leading-relaxed">
                All content, features, and functionality of Ongea Pesa (including but not limited to software, AI models, UI design, logos, and trademarks) are owned by Ongea Pesa Ltd and protected by international copyright, trademark, and other intellectual property laws.
              </p>
              <p className="text-sm text-gray-600 mt-3">
                You may not copy, modify, distribute, sell, or lease any part of our Service without explicit written permission.
              </p>
            </section>
  
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Limitation of Liability</h2>
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <p className="text-gray-700 mb-3">
                  <strong>TO THE MAXIMUM EXTENT PERMITTED BY LAW:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Ongea Pesa is NOT liable for any indirect, incidental, or consequential damages</li>
                  <li>Our total liability for any claim is limited to the fees you paid in the last 12 months (max 10,000 KES)</li>
                  <li>We are NOT responsible for third-party payment processor failures (M-Pesa, banks)</li>
                  <li>We do NOT guarantee uninterrupted or error-free service</li>
                </ul>
                <p className="text-sm text-gray-600 mt-3">
                  You use the Service at your own risk. We provide the platform "AS IS" without warranties of any kind.
                </p>
              </div>
            </section>
  
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Account Termination</h2>
              
              <h3 className="text-lg font-medium text-gray-800 mb-3">We may suspend or terminate your account if:</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>You violate these Terms of Service</li>
                <li>We suspect fraudulent or illegal activity</li>
                <li>You provide false information</li>
                <li>You fail to pay subscription fees</li>
                <li>We are required to do so by law</li>
              </ul>
  
              <p className="text-sm text-gray-600 mt-4">
                You may close your account at any time via settings. Upon closure, you will no longer have access to transaction history (export recommended).
              </p>
            </section>
  
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Dispute Resolution</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                Any disputes arising from these Terms shall be resolved through:
              </p>
              <ol className="list-decimal pl-6 space-y-2 text-gray-700">
                <li><strong>Informal Negotiation:</strong> Contact our support team first</li>
                <li><strong>Mediation:</strong> If unresolved, submit to mediation under Kenyan law</li>
                <li><strong>Arbitration:</strong> Binding arbitration in Nairobi, Kenya (NCIA rules)</li>
              </ol>
              <p className="text-sm text-gray-600 mt-3">
                These Terms are governed by the laws of Kenya. Jurisdiction: Nairobi, Kenya.
              </p>
            </section>
  
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Changes to Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                We reserve the right to modify these Terms at any time. Material changes will be communicated via email and in-app notification at least 30 days before taking effect. Continued use after changes constitutes acceptance.
              </p>
            </section>
  
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Contact Information</h2>
              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-700 mb-4">For questions about these Terms, contact us:</p>
                <div className="space-y-2 text-sm text-gray-700">
                  <p><strong>Legal Department:</strong> <a href="mailto:legal@ongeapesa.com" className="text-green-600 hover:underline">legal@ongeapesa.com</a></p>
                  <p><strong>Phone:</strong> +254 700 123 456</p>
                  <p><strong>Address:</strong> Ongea Pesa Ltd, PO Box 12345-00100, Nairobi, Kenya</p>
                </div>
              </div>
            </section>
  
          </div>
        </div>
      </div>
    );
  }