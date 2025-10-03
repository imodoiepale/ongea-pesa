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
    receiptData?: {
      vendor: string;
      amount: string;
      date: string;
      category: string;
    };
  };
  confidence: number;
  rawText?: string;
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
        model: "gemini-2.5-pro",
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
        CRITICAL: You are an expert OCR system for Kenyan payment documents. Analyze this image with extreme precision.
        
        LOOK FOR THESE EXACT PATTERNS:
        1. PHONE NUMBERS: 254XXXXXXXXX or 07XXXXXXXX or 01XXXXXXXX (for sending to individuals or Pochi la Biashara)
        2. TILL NUMBERS: Exactly 6-7 digits near "Till", "Store Number", "Buy Goods" or "Lipa na M-Pesa"
        3. PAYBILL NUMBERS: Exactly 6-7 digits near "Paybill" or "Business Number" 
        4. ACCOUNT NUMBERS: Digits after "Account", "Acc No", "Reference" (for paybill or bank)
        5. AGENT NUMBERS: 6-7 digits near "Agent", "Withdraw" or "Cash Out"
        6. STORE NUMBERS: Digits near "Store Number" for withdrawals
        7. BANK CODES: 2-4 digit codes for bank transactions
        8. AMOUNTS: Numbers with "KSh", "Ksh", "/-" or currency symbols
        
        ACCURACY REQUIREMENTS:
        - Read ALL digits exactly as shown - no guessing or approximation
        - Distinguish between similar characters: 0 vs O, 1 vs I vs l, 5 vs S, 6 vs G, 8 vs B
        - For unclear digits, mark confidence lower rather than guess
        - Preserve exact spacing and formatting in account numbers
        - Extract merchant names exactly as written
        
        RETURN FORMAT - JSON ONLY:
        {
          "detected": true,
          "type": "send_phone|buy_goods_pochi|buy_goods_till|paybill|withdraw|bank_to_mpesa|bank_to_bank",
          "confidence": confidence_score_0_to_100,
          "data": {
            "phone": "254XXXXXXXXX",
            "till": "exact_6_7_digits",
            "paybill": "exact_6_7_digits",
            "account": "exact_account_number",
            "agent": "exact_6_7_digits",
            "store": "exact_store_number",
            "bankCode": "bank_code",
            "amount": "KSh_amount_if_visible"
          }
        }
        
        If no payment info found:
        {
          "detected": false,
          "confidence": 0
        }
      `;

      console.log('📡 Making network request to Gemini API...');
      const startTime = Date.now();

      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-pro",
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
        return {
          type: parsed.type,
          data: parsed.data || {},
          confidence: parsed.confidence,
          rawText: result
        };
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
