'use client';

import { useState } from 'react';

export default function Support() {
  const [selectedCategory, setSelectedCategory] = useState('general');

  const faqs = {
    general: [
      {
        q: "How does voice payment work?",
        a: "Simply activate the microphone and say commands like 'Send 1000 to 0712345678' or 'Check my balance'. Our AI understands both English and Swahili commands and executes them securely after your confirmation."
      },
      {
        q: "Is my voice data stored?",
        a: "Voice recordings are stored temporarily (max 30 days) for processing, then permanently deleted. We use encrypted transcripts to improve our AI, but never share your voice recordings."
      },
      {
        q: "What languages are supported?",
        a: "Currently English and Swahili. We're adding more Kenyan languages soon (Kikuyu, Luo, Kalenjin)."
      }
    ],
    billing: [
      {
        q: "How much does Ongea Pesa charge?",
        a: "We charge a small service fee on transactions (0.3%-2% based on amount). Subscription plans start at 99 KES/month for 500 voice minutes. Free tier available with 50 minutes/month."
      },
      {
        q: "Are M-Pesa fees separate?",
        a: "Yes. M-Pesa, banks, and other payment providers charge their own fees independently. Our fees are clearly shown before you confirm any transaction."
      },
      {
        q: "Can I cancel my subscription?",
        a: "Yes, anytime from account settings. Cancellation takes effect at the end of your billing period. No refunds for unused portion."
      }
    ],
    security: [
      {
        q: "How secure are transactions?",
        a: "We use bank-grade encryption (TLS 1.3, AES-256), biometric authentication, and fraud detection. Every transaction requires your explicit confirmation via voice or PIN."
      },
      {
        q: "What if someone copies my voice?",
        a: "Our AI analyzes voice patterns, device fingerprints, and behavioral biometrics. Deepfakes are flagged. High-value transactions require additional PIN/biometric verification."
      },
      {
        q: "What if I say the wrong amount?",
        a: "The system always confirms transaction details before executing. You must verbally confirm or tap 'Confirm' after reviewing the details on screen."
      }
    ],
    technical: [
      {
        q: "Why is my transaction pending?",
        a: "Most transactions complete in 30 seconds. Delays can occur due to network issues or payment provider processing. Transactions auto-cancel after 10 minutes if unprocessed."
      },
      {
        q: "Voice command not recognized?",
        a: "Ensure you're in a quiet environment, speak clearly, and check your internet connection. Try rephrasing commands (e.g., 'Send money to...' instead of 'Transfer...')."
      },
      {
        q: "Can I use Ongea Pesa offline?",
        a: "No, an active internet connection is required for voice processing and transaction execution."
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">How Can We Help?</h1>
          <p className="text-lg text-gray-600">Find answers to common questions or contact our support team</p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <input
              type="text"
              placeholder="Search for help..."
              className="w-full px-6 py-4 text-lg border border-gray-300 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <button className="absolute right-4 top-1/2 transform -translate-y-1/2 text-green-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-3 mb-8 justify-center">
          {[
            { id: 'general', label: 'General', icon: '💬' },
            { id: 'billing', label: 'Billing & Pricing', icon: '💳' },
            { id: 'security', label: 'Security', icon: '🔒' },
            { id: 'technical', label: 'Technical', icon: '⚙️' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                selectedCategory === cat.id
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {/* FAQs */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs[selectedCategory as keyof typeof faqs].map((faq, idx) => (
              <details key={idx} className="group border-b border-gray-200 pb-4">
                <summary className="flex justify-between items-center cursor-pointer list-none">
                  <span className="text-lg font-medium text-gray-900">{faq.q}</span>
                  <span className="text-green-600 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-3 text-gray-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Contact Options */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <div className="text-4xl mb-4">📧</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Support</h3>
            <p className="text-sm text-gray-600 mb-4">Average response: 2-4 hours</p>
            <a href="mailto:support@ongeapesa.com" className="text-green-600 hover:underline">
              support@ongeapesa.com
            </a>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Live Chat</h3>
            <p className="text-sm text-gray-600 mb-4">Available 24/7</p>
            <button className="text-green-600 hover:underline">
              Start Chat
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <div className="text-4xl mb-4">📞</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Phone Support</h3>
            <p className="text-sm text-gray-600 mb-4">Mon-Fri, 8AM-8PM EAT</p>
            <a href="tel:+254700123456" className="text-green-600 hover:underline">
              +254 700 123 456
            </a>
          </div>
        </div>

        {/* Status Page */}
        <div className="bg-green-50 rounded-2xl p-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-3"></div>
            <h3 className="text-xl font-semibold text-gray-900">All Systems Operational</h3>
          </div>
          <p className="text-gray-600 mb-4">Check our status page for real-time service updates</p>
          <a href="/status" className="text-green-600 hover:underline">
            View Status Page →
          </a>
        </div>

      </div>
    </div>
  );
}