import { GoogleGenAI } from '@google/genai';
import { PaymentScanResult, getPromptForScanMode, parseOcrResponse, validateAndFormatNumbers } from '@/lib/ocr-shared';

// Re-export so existing imports of PaymentScanResult from this file keep working
export type { PaymentScanResult };

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
      const prompt = getPromptForScanMode(scanMode);

      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: [
          { inlineData: { mimeType: "image/jpeg", data: imageData } },
          { text: prompt },
        ],
      });

      const result = response.text || '';
      return parseOcrResponse(result, scanMode);
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

  // These methods are now in lib/ocr-shared.ts and imported above.
  // Keeping stubs here for any direct callers that haven't migrated yet.
  private getPromptForScanMode(scanMode: string): string {
    return getPromptForScanMode(scanMode);
  }
  private validateAndFormatNumbers(data: any): any {
    return validateAndFormatNumbers(data);
  }
  private parseGeminiResponse(response: string, scanMode: string): PaymentScanResult {
    return parseOcrResponse(response, scanMode);
  }
}

export const geminiVision = new GeminiVisionService();
