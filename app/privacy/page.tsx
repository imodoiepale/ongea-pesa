export default function PrivacyPolicy() {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm p-8 lg:p-12">
          
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-8">Last Updated: January 2025</p>
  
          <div className="prose prose-lg max-w-none">
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-700 leading-relaxed">
                Ongea Pesa ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our voice-powered payment platform.
              </p>
              <div className="mt-4 p-4 bg-green-50 border-l-4 border-green-500 rounded">
                <p className="text-sm text-gray-700">
                  <strong>Your Control:</strong> You have the right to access, correct, or delete your personal data at any time through your account settings or by contacting our support team.
                </p>
              </div>
            </section>
  
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mt-6 mb-3">2.1 Information You Provide</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Account Information:</strong> Name, email address, phone number, M-Pesa number</li>
                <li><strong>Payment Information:</strong> Transaction history, payment methods (encrypted), bank details</li>
                <li><strong>Voice Data:</strong> Voice recordings of your commands (stored temporarily for processing, then deleted within 30 days)</li>
                <li><strong>Identity Verification:</strong> Government ID, biometric data (face/fingerprint for authentication)</li>
              </ul>
  
              <h3 className="text-xl font-medium text-gray-800 mt-6 mb-3">2.2 Automatically Collected Information</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Device Information:</strong> IP address, device type, operating system, browser type</li>
                <li><strong>Usage Data:</strong> Features used, time spent, interaction patterns</li>
                <li><strong>Location Data:</strong> General location (city/country level) for fraud prevention</li>
                <li><strong>Transaction Metadata:</strong> Timestamps, transaction status, error logs</li>
              </ul>
            </section>
  
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
              
              <div className="bg-gray-50 rounded-lg p-6 mb-4">
                <h3 className="text-lg font-medium text-gray-800 mb-3">Primary Uses:</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Process voice-activated payments and transactions</li>
                  <li>Verify your identity and prevent fraud</li>
                  <li>Provide customer support and respond to inquiries</li>
                  <li>Improve our AI voice recognition and natural language processing</li>
                  <li>Send transaction confirmations and important account updates</li>
                  <li>Comply with legal obligations and regulatory requirements</li>
                </ul>
              </div>
  
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-800 mb-3">Marketing & Analytics:</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Send promotional offers (only if you opt-in)</li>
                  <li>Analyze usage patterns to improve our service</li>
                  <li>Personalize your experience based on preferences</li>
                </ul>
                <p className="text-sm text-gray-600 mt-3">
                  <strong>Note:</strong> You can opt-out of marketing communications at any time via account settings.
                </p>
              </div>
            </section>
  
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Voice Data & AI Processing</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Your voice commands are our top priority for security:
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span className="text-gray-700"><strong>Encryption:</strong> All voice data is encrypted in transit (TLS 1.3) and at rest (AES-256)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span className="text-gray-700"><strong>Temporary Storage:</strong> Voice recordings are stored only for processing (max 30 days), then permanently deleted</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span className="text-gray-700"><strong>No Third-Party Sharing:</strong> Voice data is NEVER shared with advertisers or sold to third parties</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span className="text-gray-700"><strong>AI Training:</strong> We may use anonymized transcripts (no voice recordings) to improve our AI models</span>
                  </li>
                </ul>
              </div>
            </section>
  
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Information Sharing & Disclosure</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We share your information only in these specific circumstances:
              </p>
              
              <div className="space-y-4">
                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="font-medium text-gray-800">Payment Processors</h3>
                  <p className="text-sm text-gray-600">M-Pesa, Safaricom, banks, and card networks to complete transactions</p>
                </div>
                
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-medium text-gray-800">Service Providers</h3>
                  <p className="text-sm text-gray-600">Cloud hosting (Vercel, Supabase), AI services (ElevenLabs, OpenAI), analytics (anonymized)</p>
                </div>
                
                <div className="border-l-4 border-red-500 pl-4">
                  <h3 className="font-medium text-gray-800">Legal Compliance</h3>
                  <p className="text-sm text-gray-600">Law enforcement, regulators, or courts when legally required (fraud investigations, court orders)</p>
                </div>
                
                <div className="border-l-4 border-purple-500 pl-4">
                  <h3 className="font-medium text-gray-800">Business Transfers</h3>
                  <p className="text-sm text-gray-600">In case of merger, acquisition, or sale (users will be notified in advance)</p>
                </div>
              </div>
  
              <p className="text-sm text-gray-600 mt-4 italic">
                We NEVER sell your personal data to third parties for marketing purposes.
              </p>
            </section>
  
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Security</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We implement industry-standard security measures:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-800 mb-2">Technical Safeguards</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• End-to-end encryption (TLS 1.3, AES-256)</li>
                    <li>• Two-factor authentication (2FA)</li>
                    <li>• Biometric authentication (Face ID, Fingerprint)</li>
                    <li>• Regular security audits & penetration testing</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-800 mb-2">Operational Safeguards</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Access controls (role-based permissions)</li>
                    <li>• Employee training on data protection</li>
                    <li>• Incident response plan</li>
                    <li>• Data breach notification (within 72 hours)</li>
                  </ul>
                </div>
              </div>
            </section>
  
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Your Rights (GDPR & Kenyan Data Protection Act)</h2>
              <div className="bg-green-50 rounded-lg p-6">
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">→</span>
                    <div>
                      <strong className="text-gray-800">Right to Access:</strong>
                      <span className="text-gray-600"> Request a copy of all data we hold about you</span>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">→</span>
                    <div>
                      <strong className="text-gray-800">Right to Rectification:</strong>
                      <span className="text-gray-600"> Correct inaccurate or incomplete information</span>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">→</span>
                    <div>
                      <strong className="text-gray-800">Right to Erasure:</strong>
                      <span className="text-gray-600"> Request deletion of your data (subject to legal obligations)</span>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">→</span>
                    <div>
                      <strong className="text-gray-800">Right to Data Portability:</strong>
                      <span className="text-gray-600"> Download your data in a machine-readable format</span>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">→</span>
                    <div>
                      <strong className="text-gray-800">Right to Object:</strong>
                      <span className="text-gray-600"> Opt-out of marketing communications and data processing</span>
                    </div>
                  </li>
                </ul>
                <p className="text-sm text-gray-600 mt-4">
                  To exercise any of these rights, email us at <a href="mailto:privacy@ongeapesa.com" className="text-green-600 hover:underline">privacy@ongeapesa.com</a>
                </p>
              </div>
            </section>
  
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Data Retention</h2>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-3 text-left">Data Type</th>
                    <th className="border p-3 text-left">Retention Period</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  <tr>
                    <td className="border p-3">Account Information</td>
                    <td className="border p-3">Until account closure + 7 years (tax/legal compliance)</td>
                  </tr>
                  <tr>
                    <td className="border p-3">Transaction Records</td>
                    <td className="border p-3">7 years (financial regulations)</td>
                  </tr>
                  <tr>
                    <td className="border p-3">Voice Recordings</td>
                    <td className="border p-3">30 days maximum, then permanently deleted</td>
                  </tr>
                  <tr>
                    <td className="border p-3">Usage Logs</td>
                    <td className="border p-3">2 years</td>
                  </tr>
                  <tr>
                    <td className="border p-3">Marketing Data</td>
                    <td className="border p-3">Until you opt-out or 3 years of inactivity</td>
                  </tr>
                </tbody>
              </table>
            </section>
  
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. International Data Transfers</h2>
              <p className="text-gray-700 leading-relaxed">
                Your data may be transferred to and processed in countries outside Kenya, including the EU and USA, where our service providers are located. We ensure adequate protection through:
              </p>
              <ul className="list-disc pl-6 mt-3 space-y-2 text-gray-700">
                <li>Standard Contractual Clauses (SCCs) approved by EU Commission</li>
                <li>Privacy Shield Framework compliance (for US transfers)</li>
                <li>Encryption and security measures meeting international standards</li>
              </ul>
            </section>
  
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Children's Privacy</h2>
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <p className="text-gray-700">
                  Ongea Pesa is not intended for users under 18 years old. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us immediately at <a href="mailto:privacy@ongeapesa.com" className="text-green-600 hover:underline">privacy@ongeapesa.com</a>.
                </p>
              </div>
            </section>
  
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Changes to This Policy</h2>
              <p className="text-gray-700 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any material changes via:
              </p>
              <ul className="list-disc pl-6 mt-3 space-y-1 text-gray-700">
                <li>Email notification to your registered email address</li>
                <li>In-app notification when you next log in</li>
                <li>Prominent notice on our website</li>
              </ul>
              <p className="text-sm text-gray-600 mt-3">
                Continued use of our service after changes constitutes acceptance of the updated policy.
              </p>
            </section>
  
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Contact Us</h2>
              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-700 mb-4">For privacy-related questions or concerns, contact our Data Protection Officer:</p>
                <div className="space-y-2 text-sm text-gray-700">
                  <p><strong>Email:</strong> <a href="mailto:privacy@ongeapesa.com" className="text-green-600 hover:underline">privacy@ongeapesa.com</a></p>
                  <p><strong>Phone:</strong> +254 700 123 456</p>
                  <p><strong>Address:</strong> Ongea Pesa Ltd, PO Box 12345-00100, Nairobi, Kenya</p>
                  <p><strong>Data Protection Officer:</strong> Sarah Mwangi</p>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  You also have the right to lodge a complaint with the Office of the Data Protection Commissioner (ODPC) in Kenya.
                </p>
              </div>
            </section>
  
          </div>
        </div>
      </div>
    );
  }