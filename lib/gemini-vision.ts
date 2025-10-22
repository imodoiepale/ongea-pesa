import { GoogleGenAI } from '@google/genai';

export interface PaymentScanResult {
  type: 'send_phone' | 'buy_goods_pochi' | 'buy_goods_till' | 'paybill' | 'withdraw' | 'bank_to_mpesa' | 'bank_to_bank' | 'receipt' | 'qr';
  data: {
    // Core numbers - no business names needed
    phone?: string;           // For send_phone, buy_goods_pochi
    till?: string;            // For buy_goods_till
    paybill?: string;         // For paybill
    account?: string;         // For paybill, bank transactions
    agent?: string;           // For withdraw
    store?: string;           // For withdraw
    bankCode?: string;        // For bank transactions
    amount?: string;          // Optional amount if visible
    merchant?: string;        // Business/merchant name (optional)
    receiptData?: {
      vendor: string;
      amount: string;
      date: string;
      category: string;
    };
  };
  confidence: number;
  rawText?: string;
  alternatives?: PaymentScanResult[];  // Multiple payment methods detected
}

class GeminiVisionService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    // Initialize in browser only
    if (typeof window !== 'undefined') {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        console.error('NEXT_PUBLIC_GEMINI_API_KEY is required');
        return;
      }
      this.ai = new GoogleGenAI({
        apiKey: apiKey,
      });
      console.log('Gemini AI initialized successfully');
    }
  }

  async scanPaymentDocument(imageData: string, scanMode: string): Promise<PaymentScanResult> {
    if (!this.ai) {
      throw new Error('Gemini AI not initialized. Check API key.');
    }

    try {
      const prompt = this.getPromptForScanMode(scanMode);

      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: imageData,
            },
          },
          { text: prompt }
        ],
      });

      const result = response.text || '';
      return this.parseGeminiResponse(result, scanMode);
    } catch (error) {
      console.error('Gemini Vision Error:', error);
      throw new Error('Failed to process image with Gemini AI');
    }
  }

  async autoDetectPaymentType(imageData: string): Promise<PaymentScanResult | null> {
    if (!this.ai) {
      throw new Error('Gemini AI not initialized. Check API key.');
    }

    try {
      console.log('🚀 Starting Gemini API request...');
      const autoDetectPrompt = `
        CRITICAL MISSION: You are an elite OCR AI system specializing in Kenyan M-Pesa and banking documents.
        Analyze this image with MAXIMUM PRECISION and ACCURACY.
        
        === PATTERN DETECTION RULES ===
        
        1. POCHI LA BIASHARA (Buy Goods via Phone):
           - Formats: 254XXXXXXXXX, 07XXXXXXXX, 01XXXXXXXX, +254XXXXXXXXX
           - Context: "Pochi", "Pochi la Biashara", "Buy Goods", "Business Phone"
           - Keywords: "Pochi", "Biashara", "Business Number"
           - Type: buy_goods_pochi
           - Examples: 254712345678, 0712345678
        
        1b. SEND MONEY (Person to Person):
           - Formats: 254XXXXXXXXX, 07XXXXXXXX, 01XXXXXXXX, +254XXXXXXXXX
           - Context: "Send to", "Recipient", "Mobile Number", "Transfer"
           - Keywords: "Send", "Transfer", "Recipient" (NO "Pochi" or "Buy Goods")
           - Type: send_phone
           - Examples: 254712345678, 0712345678
        
        2. TILL NUMBERS (Buy Goods):
           - EXACTLY 6-7 digits (e.g., 832909, 174379, 4567891)
           - Context: "Till", "Store Number", "Buy Goods", "Lipa na M-Pesa", "Merchant Code"
           - Common on: Shop stickers, restaurant receipts, retail displays
           - NOT phone numbers, NOT dates, NOT amounts
        
        3. PAYBILL NUMBERS (Bill Payments):
           - EXACTLY 5-7 digits (e.g., 888880, 247247, 12345)
           - Context: "Paybill", "Business Number", "Pay Bill", "Service Provider"
           - Requires: Account/Reference number
           - Common: KPLC, Water bills, School fees, Rent
        
        4. ACCOUNT/REFERENCE NUMBERS:
           - Variable length: 6-15 characters (alphanumeric)
           - Context: "Account", "Acc No", "Reference", "Customer No", "Meter No"
           - Formats: 123456789, AC-123456, REF123, 01-234-567
        
        5. QR CODES:
           - Look for QR code visual patterns (black/white squares)
           - May contain encoded Till/Paybill + Amount + Merchant
        
        6. RECEIPTS:
           - Vendor/Business name at top
           - "Total", "Amount Due", "Balance" with currency
           - Date (DD/MM/YYYY or DD-MM-YYYY)
           - Items list with prices
        
        7. BANK DETAILS:
           - Bank name (KCB, Equity, Co-op, Standard Chartered, etc.)
           - Account number (10-16 digits)
           - Bank code (2-4 digits)
           - SWIFT/Branch codes
        
        8. AGENT/WITHDRAWAL:
           - Agent Number: 6-7 digits near "Agent", "Withdraw", "Cash Out"
           - Store Number: Accompanying identifier
        
        9. AMOUNTS:
           - Formats: KSh 1,234, Ksh 1234, 1,234/-, Kshs. 1234.50
           - Keywords: "Total", "Amount", "Pay", "Balance", "Due"
        
        === CHARACTER ACCURACY (CRITICAL) ===
        Distinguish carefully:
        - 0 (zero) ≠ O (letter O)
        - 1 (one) ≠ I (letter I) ≠ l (lowercase L)
        - 2 (two) ≠ Z (letter Z)
        - 5 (five) ≠ S (letter S)
        - 6 (six) ≠ G (letter G) ≠ b (lowercase b)
        - 8 (eight) ≠ B (letter B)
        - 9 (nine) ≠ g (lowercase g)
        
        === EDGE CASES TO HANDLE ===
        - Blurry/low quality images → Lower confidence
        - Handwritten numbers → Extra careful reading
        - Multiple payment options on one document → Prioritize most prominent
        - Faded/old receipts → Extract what's readable
        - Mixed languages (English/Swahili) → Parse both
        - Partial documents → Extract visible data only
        - Glare/shadows → Focus on readable areas
        
        === MERCHANT/BUSINESS NAMES ===
        - Extract EXACTLY as written (preserve capitalization)
        - Include: Shop names, Service providers, Companies
        - Examples: "KPLC", "Safaricom", "Naivas Supermarket", "Java House"
        
        === CONFIDENCE SCORING ===
        - 90-100%: Crystal clear, all digits readable, context confirms
        - 70-89%: Good quality, minor uncertainty on 1-2 characters
        - 50-69%: Readable but blurry/partial, multiple interpretations possible
        - 30-49%: Poor quality, guessing involved
        - 0-29%: Cannot reliably extract
        
        === OUTPUT FORMAT (JSON ONLY) ===
        
        IMPORTANT: If you detect MULTIPLE payment methods (e.g., 2 till numbers, 3 paybills), return ALL of them in the "alternatives" array.
        
        {
          "detected": true,
          "type": "send_phone|buy_goods_pochi|buy_goods_till|paybill|withdraw|bank_to_mpesa|bank_to_bank|receipt|qr",
          "confidence": 0-100,
          "data": {
            "phone": "254XXXXXXXXX",
            "till": "XXXXXX",
            "paybill": "XXXXX",
            "account": "XXXXXXXXXXX",
            "agent": "XXXXXX",
            "store": "XXXX",
            "bankCode": "XXX",
            "merchant": "Business Name",
            "amount": "KSh X,XXX",
            "receiptData": {
              "vendor": "Business Name",
              "amount": "KSh X,XXX",
              "date": "YYYY-MM-DD",
              "category": "groceries|fuel|restaurant|utilities|other"
            }
          },
          "alternatives": [
            {
              "type": "buy_goods_till",
              "confidence": 95,
              "data": {
                "till": "832909",
                "merchant": "Shop A"
              }
            },
            {
              "type": "buy_goods_till",
              "confidence": 92,
              "data": {
                "till": "174379",
                "merchant": "Shop B"
              }
            }
          ]
        }
        
        If NO payment information detected:
        {
          "detected": false,
          "confidence": 0
        }
        
        RESPOND WITH ONLY THE JSON OBJECT. NO EXPLANATIONS OR EXTRA TEXT.
      `;

      console.log('📡 Making network request to Gemini API...');
      const startTime = Date.now();

      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: imageData,
            },
          },
          { text: autoDetectPrompt }
        ],
      });

      const endTime = Date.now();
      console.log(`✅ Gemini API response received in ${endTime - startTime}ms`);

      const result = response.text || '';
      console.log('📝 Raw Gemini response:', result.substring(0, 200) + '...');

      const parsed = this.parseAutoDetectResponse(result);
      console.log('🔍 Parsed result:', parsed);

      if (parsed.detected && parsed.confidence > 70) {
        console.log('🎯 Payment detected with high confidence!');
        
        // Include alternatives if they exist
        const scanResult: PaymentScanResult = {
          type: parsed.type,
          data: parsed.data || {},
          confidence: parsed.confidence,
          rawText: result
        };
        
        // Add alternatives array if present
        if (parsed.alternatives && Array.isArray(parsed.alternatives) && parsed.alternatives.length > 0) {
          scanResult.alternatives = parsed.alternatives;
          console.log('✨ Alternatives detected:', parsed.alternatives.length);
        }
        
        return scanResult;
      }

      console.log('❌ No payment detected or low confidence');
      return null;
    } catch (error) {
      console.error('💥 Auto-detect error:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack?.substring(0, 500)
        });
      }
      throw error; // Re-throw to show in UI
    }
  }

  private parseAutoDetectResponse(response: string): any {
    try {
      let jsonStr = response.trim();

      if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
      } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
      }

      return JSON.parse(jsonStr);
    } catch (error) {
      return { detected: false, confidence: 0 };
    }
  }

  private getPromptForScanMode(scanMode: string): string {
    const prompts = {
      send_phone: `
        EXTRACT: Phone number for M-Pesa send money transaction.
        FIND: 254XXXXXXXXX or 07XXXXXXXX or 01XXXXXXXX format
        RETURN JSON:
        {
          "type": "send_phone",
          "phone": "254XXXXXXXXX",
          "amount": "KSh_amount_if_visible",
          "confidence": confidence_0_to_100
        }
      `,
      buy_goods_pochi: `
        EXTRACT: Pochi la Biashara phone number for buy goods.
        FIND: Phone number near "Pochi", "Buy Goods" text
        RETURN JSON:
        {
          "type": "buy_goods_pochi",
          "phone": "254XXXXXXXXX",
          "amount": "KSh_amount_if_visible",
          "confidence": confidence_0_to_100
        }
      `,
      buy_goods_till: `
        EXTRACT: Till number for buy goods transaction.
        FIND: 6-7 digits near "Till", "Buy Goods", "Lipa na M-Pesa"
        RETURN JSON:
        {
          "type": "buy_goods_till",
          "till": "exact_6_or_7_digits",
          "amount": "KSh_amount_if_visible",
          "confidence": confidence_0_to_100
        }
      `,
      paybill: `
        EXTRACT: Paybill number and account for bill payment.
        FIND: 6-7 digit paybill + account number
        RETURN JSON:
        {
          "type": "paybill",
          "paybill": "exact_6_or_7_digits",
          "account": "exact_account_number",
          "amount": "KSh_amount_if_visible",
          "confidence": confidence_0_to_100
        }
      `,
      withdraw: `
        EXTRACT: Agent and store numbers for M-Pesa withdrawal.
        FIND: Agent number (6-7 digits) + Store number near "Withdraw", "Cash Out", "Agent"
        RETURN JSON:
        {
          "type": "withdraw",
          "agent": "exact_6_or_7_digits",
          "store": "exact_store_number",
          "amount": "KSh_amount_if_visible",
          "confidence": confidence_0_to_100
        }
      `,
      bank_to_mpesa: `
        EXTRACT: Bank code and account for bank to M-Pesa transfer.
        FIND: Bank code (2-4 digits) + account number
        RETURN JSON:
        {
          "type": "bank_to_mpesa",
          "bankCode": "exact_bank_code",
          "account": "exact_account_number",
          "amount": "KSh_amount_if_visible",
          "confidence": confidence_0_to_100
        }
      `,
      bank_to_bank: `
        EXTRACT: Bank code and account for bank to bank transfer.
        FIND: Bank code + account number for bank transfer
        RETURN JSON:
        {
          "type": "bank_to_bank",
          "bankCode": "exact_bank_code",
          "account": "exact_account_number",
          "amount": "KSh_amount_if_visible",
          "confidence": confidence_0_to_100
        }
      `,
      till: `
        EXPERT OCR: Extract Till number details with EXTREME PRECISION.
        
        FIND THESE EXACT ELEMENTS:
        1. TILL NUMBER: Exactly 6-7 digits (e.g., 832909, 174379, 123456)
        2. BUSINESS NAME: Merchant/store name (exact spelling)
        3. AMOUNT: Currency amount if visible (with KSh/Ksh)
        4. CONTEXT: Look for "Till", "Store Number", "Lipa na M-Pesa" text
        
        CRITICAL ACCURACY RULES:
        - Read digits character-by-character: 0≠O, 1≠I≠l, 5≠S, 6≠G, 8≠B
        - NO approximation or guessing - exact digits only
        - Extract business name as written (preserve capitalization)
        - Include currency symbol with amounts
        
        RETURN EXACT JSON:
        {
          "type": "till",
          "till": "exact_6_or_7_digits",
          "merchant": "exact_business_name",
          "amount": "KSh_amount_if_visible",
          "confidence": confidence_0_to_100
        }
      `,
      qr: `
        Analyze this QR code image for M-Pesa payment information. Extract:
        - Till number or Paybill
        - Merchant name
        - Amount (if encoded)
        
        Return ONLY a JSON object with this structure:
        {
          "type": "qr",
          "till": "till_or_paybill",
          "merchant": "merchant_name",
          "amount": "amount_if_found",
          "confidence": confidence_score_0_to_100
        }
      `,
      receipt: `
        Analyze this receipt image and extract expense information:
        - Vendor/business name
        - Total amount
        - Date of transaction
        - Category (fuel, groceries, restaurant, etc.)
        
        Return ONLY a JSON object with this structure:
        {
          "type": "receipt",
          "receiptData": {
            "vendor": "business_name",
            "amount": "total_amount",
            "date": "YYYY-MM-DD",
            "category": "expense_category"
          },
          "confidence": confidence_score_0_to_100
        }
      `,
      bank: `
        Analyze this bank slip/document for account information:
        - Bank name
        - Account number
        - Account holder name
        - Any reference numbers
        
        Return ONLY a JSON object with this structure:
        {
          "type": "bank",
          "bank": "bank_name",
          "accountNumber": "account_number",
          "merchant": "account_holder_name",
          "confidence": confidence_score_0_to_100
        }
      `,
      pochi: `
        Analyze this image for Pochi la Biashara information:
        - Phone number (254xxxxxxxxx format)
        - Business name
        - Any reference information
        
        Return ONLY a JSON object with this structure:
        {
          "type": "pochi",
          "phone": "phone_number",
          "merchant": "business_name",
          "confidence": confidence_score_0_to_100
        }
      `
    };

    return prompts[scanMode as keyof typeof prompts] || prompts.paybill;
  }

  // Validate and format numbers for accuracy
  private validateAndFormatNumbers(data: any): any {
    const formatted = { ...data };

    // Validate Paybill numbers (6-7 digits)
    if (formatted.paybill) {
      formatted.paybill = formatted.paybill.replace(/[^0-9]/g, ''); // Remove non-digits
      if (formatted.paybill.length < 6 || formatted.paybill.length > 7) {
        console.warn('Invalid paybill length:', formatted.paybill);
      }
    }

    // Validate Till numbers (6-7 digits)
    if (formatted.till) {
      formatted.till = formatted.till.replace(/[^0-9]/g, ''); // Remove non-digits
      if (formatted.till.length < 6 || formatted.till.length > 7) {
        console.warn('Invalid till length:', formatted.till);
      }
    }

    // Validate Agent numbers (6-7 digits)
    if (formatted.agent) {
      formatted.agent = formatted.agent.replace(/[^0-9]/g, '');
      if (formatted.agent.length < 6 || formatted.agent.length > 7) {
        console.warn('Invalid agent length:', formatted.agent);
      }
    }

    // Format phone numbers
    if (formatted.phone) {
      let phone = formatted.phone.replace(/[^0-9]/g, '');
      if (phone.startsWith('0')) {
        phone = '254' + phone.substring(1); // Convert 07xx to 254xx
      }
      formatted.phone = phone;
    }

    // Format amounts
    if (formatted.amount) {
      // Ensure currency prefix
      if (!formatted.amount.includes('KSh') && !formatted.amount.includes('Ksh')) {
        const numericAmount = formatted.amount.replace(/[^0-9.,]/g, '');
        if (numericAmount) {
          formatted.amount = `KSh ${numericAmount}`;
        }
      }
    }

    return formatted;
  }

  private parseGeminiResponse(response: string, scanMode: string): PaymentScanResult {
    try {
      // Clean the response to extract JSON
      let jsonStr = response.trim();

      // Remove markdown code blocks if present
      if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
      } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
      }

      const parsed = JSON.parse(jsonStr);

      // Validate and structure the response
      const result: PaymentScanResult = {
        type: parsed.type || scanMode as any,
        data: {},
        confidence: Math.min(Math.max(parsed.confidence || 0, 0), 100),
        rawText: response
      };

      // Map parsed data to our structure with validation
      switch (parsed.type || scanMode) {
        case 'paybill':
          const paybillData = this.validateAndFormatNumbers({
            paybill: parsed.paybill,
            account: parsed.account,
            merchant: parsed.merchant,
            amount: parsed.amount
          });
          result.data = paybillData;
          break;
        case 'till':
          const tillData = this.validateAndFormatNumbers({
            till: parsed.till,
            merchant: parsed.merchant,
            amount: parsed.amount
          });
          result.data = tillData;
          break;
        case 'qr':
          const qrData = this.validateAndFormatNumbers({
            till: parsed.till,
            merchant: parsed.merchant,
            amount: parsed.amount
          });
          result.data = qrData;
          break;
        case 'receipt':
          result.data = {
            receiptData: parsed.receiptData
          };
          break;
        case 'bank':
          const bankData = this.validateAndFormatNumbers({
            bank: parsed.bank,
            accountNumber: parsed.accountNumber,
            merchant: parsed.merchant
          });
          result.data = bankData;
          break;
        case 'pochi':
          const pochiData = this.validateAndFormatNumbers({
            phone: parsed.phone,
            merchant: parsed.merchant
          });
          result.data = pochiData;
          break;
      }

      return result;
    } catch (error) {
      console.error('Failed to parse Gemini response:', error);
      // Return a fallback result
      return {
        type: scanMode as any,
        data: {},
        confidence: 0,
        rawText: response
      };
    }
  }
}

export const geminiVision = new GeminiVisionService();
