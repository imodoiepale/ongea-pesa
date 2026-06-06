// Shared OCR types, prompts, and parser — used by both the client Gemini singleton
// and the server-side /api/scan/ocr route (OpenAI-first, Gemini fallback).

export interface PaymentScanResult {
  type: 'send_phone' | 'buy_goods_pochi' | 'buy_goods_till' | 'paybill' | 'withdraw' | 'bank_to_mpesa' | 'bank_to_bank' | 'receipt' | 'qr';
  data: {
    phone?: string;
    till?: string;
    paybill?: string;
    account?: string;
    agent?: string;
    store?: string;
    bankCode?: string;
    amount?: string;
    merchant?: string;
    receiptData?: {
      vendor: string;
      amount: string;
      date: string;
      category: string;
      // Payable target extracted from the receipt (if present)
      till?: string;
      paybill?: string;
      account?: string;
    };
  };
  confidence: number;
  rawText?: string;
  alternatives?: PaymentScanResult[];
  provider?: 'openai' | 'gemini';
}

export function getPromptForScanMode(scanMode: string): string {
  const prompts: Record<string, string> = {
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
      Analyze this receipt/invoice image. Extract ALL of the following:

      1. EXPENSE INFO:
         - Vendor/business name
         - Total amount paid
         - Date of transaction
         - Category (fuel, groceries, restaurant, utilities, etc.)

      2. PAYABLE TARGET (if present — look for M-Pesa Till or Paybill on the receipt):
         - Till number: exactly 6-7 digits near "Till", "Store Number", "Buy Goods"
         - Paybill number: exactly 5-7 digits near "Paybill", "Business Number"
         - Account/Reference: alphanumeric account number if paybill present

      Return ONLY a JSON object with this structure:
      {
        "type": "receipt",
        "receiptData": {
          "vendor": "business_name",
          "amount": "total_amount_with_KSh",
          "date": "YYYY-MM-DD",
          "category": "expense_category",
          "till": "6_or_7_digit_till_if_found_or_null",
          "paybill": "5_to_7_digit_paybill_if_found_or_null",
          "account": "account_number_if_paybill_present_or_null"
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
  };

  return prompts[scanMode] || prompts.paybill;
}

export function getAutoDetectPrompt(): string {
  return `
You are an expert OCR engine for Kenyan M-Pesa and bank payment documents.
Analyze this image and detect ALL payment information present.

DETECT ANY OF THESE 9 TYPES (choose the best match):
1. send_phone    — a phone number for sending money (07XX or 01XX or 254XX)
2. buy_goods_pochi — Pochi la Biashara phone number
3. buy_goods_till  — Till number (6-7 digits near "Till", "Buy Goods", "Lipa na M-Pesa")
4. paybill         — Paybill number (5-7 digits) + account number
5. withdraw        — M-Pesa agent number + store number
6. bank_to_mpesa   — Bank code + account for bank-to-M-Pesa transfer
7. bank_to_bank    — Bank code + account for bank-to-bank transfer
8. receipt         — Expense receipt (vendor, amount, date, category)
9. qr              — M-Pesa QR code with till or paybill

ACCURACY RULES:
- Read digits character-by-character: 0≠O, 1≠I≠l, 5≠S, 6≠G, 8≠B
- Do NOT guess or approximate any number — extract exactly as printed
- Preserve business names as written (exact capitalization)
- Include "KSh" prefix with all monetary amounts

RETURN ONLY a single JSON object matching this schema:
{
  "type": "<best_match_type>",
  "till": "<6_or_7_digit_till_if_applicable_else_omit>",
  "paybill": "<5_to_7_digit_paybill_if_applicable_else_omit>",
  "account": "<account_number_if_applicable_else_omit>",
  "phone": "<254XXXXXXXXX_if_applicable_else_omit>",
  "agent": "<agent_number_if_applicable_else_omit>",
  "store": "<store_number_if_applicable_else_omit>",
  "bankCode": "<bank_code_if_applicable_else_omit>",
  "merchant": "<business_or_merchant_name_if_visible_else_omit>",
  "amount": "<KSh_amount_if_visible_else_omit>",
  "receiptData": {
    "vendor": "<vendor_name>",
    "amount": "<total_with_KSh>",
    "date": "<YYYY-MM-DD>",
    "category": "<fuel|groceries|restaurant|utilities|other>",
    "till": "<6_or_7_digit_till_or_null>",
    "paybill": "<paybill_or_null>",
    "account": "<account_or_null>"
  },
  "confidence": <integer_0_to_100>,
  "alternatives": [
    {
      "type": "<second_best_type_if_multiple_detected>",
      "till": "<if_applicable>",
      "paybill": "<if_applicable>",
      "account": "<if_applicable>",
      "phone": "<if_applicable>",
      "merchant": "<if_applicable>",
      "amount": "<if_applicable>",
      "confidence": <integer_0_to_100>
    }
  ]
}

Include "alternatives" only when multiple distinct payment targets are visible.
Omit any field that does not apply to the detected type.
If no payment document is detected, return: {"type":"receipt","data":{},"confidence":0}
`;
}

export function validateAndFormatNumbers(data: Record<string, any>): Record<string, any> {
  const formatted = { ...data };

  if (formatted.paybill) {
    formatted.paybill = String(formatted.paybill).replace(/[^0-9]/g, '');
  }
  if (formatted.till) {
    formatted.till = String(formatted.till).replace(/[^0-9]/g, '');
  }
  if (formatted.agent) {
    formatted.agent = String(formatted.agent).replace(/[^0-9]/g, '');
  }
  if (formatted.phone) {
    let phone = String(formatted.phone).replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '254' + phone.substring(1);
    formatted.phone = phone;
  }
  if (formatted.amount) {
    if (!String(formatted.amount).includes('KSh') && !String(formatted.amount).includes('Ksh')) {
      const num = String(formatted.amount).replace(/[^0-9.,]/g, '');
      if (num) formatted.amount = `KSh ${num}`;
    }
  }

  return formatted;
}

export function parseOcrResponse(response: string, scanMode: string): PaymentScanResult {
  try {
    let jsonStr = response.trim();
    if (jsonStr.includes('```json')) {
      jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
    } else if (jsonStr.includes('```')) {
      jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
    }

    const parsed = JSON.parse(jsonStr);

    const result: PaymentScanResult = {
      type: (parsed.type || scanMode) as PaymentScanResult['type'],
      data: {},
      confidence: Math.min(Math.max(parsed.confidence || 0, 0), 100),
      rawText: response,
    };

    switch (parsed.type || scanMode) {
      case 'paybill':
        result.data = validateAndFormatNumbers({
          paybill: parsed.paybill,
          account: parsed.account,
          merchant: parsed.merchant,
          amount: parsed.amount,
        });
        break;
      case 'till':
      case 'buy_goods_till':
        result.data = validateAndFormatNumbers({
          till: parsed.till,
          merchant: parsed.merchant,
          amount: parsed.amount,
        });
        break;
      case 'qr':
        result.data = validateAndFormatNumbers({
          till: parsed.till,
          merchant: parsed.merchant,
          amount: parsed.amount,
        });
        break;
      case 'receipt': {
        const rd = parsed.receiptData || {};
        const tillRaw = rd.till && String(rd.till).replace(/[^0-9]/g, '');
        const paybillRaw = rd.paybill && String(rd.paybill).replace(/[^0-9]/g, '');
        result.data = {
          receiptData: {
            vendor: rd.vendor || '',
            amount: rd.amount || '',
            date: rd.date || '',
            category: rd.category || '',
            till: (tillRaw && tillRaw.length >= 6) ? tillRaw : undefined,
            paybill: (paybillRaw && paybillRaw.length >= 5) ? paybillRaw : undefined,
            account: rd.account || undefined,
          },
          // Hoist payable target to top-level for scanner routing
          ...(tillRaw && tillRaw.length >= 6 ? { till: tillRaw } : {}),
          ...(paybillRaw && paybillRaw.length >= 5 ? { paybill: paybillRaw, account: rd.account || '' } : {}),
          amount: rd.amount,
        };
        break;
      }
      case 'bank':
        result.data = validateAndFormatNumbers({
          bankCode: parsed.bankCode || parsed.bank,
          account: parsed.accountNumber || parsed.account,
          merchant: parsed.merchant,
        });
        break;
      case 'send_phone':
      case 'buy_goods_pochi':
        result.data = validateAndFormatNumbers({
          phone: parsed.phone,
          merchant: parsed.merchant,
          amount: parsed.amount,
        });
        break;
      case 'withdraw':
        result.data = validateAndFormatNumbers({
          agent: parsed.agent,
          store: parsed.store,
          amount: parsed.amount,
        });
        break;
    }

    return result;
  } catch {
    return { type: scanMode as PaymentScanResult['type'], data: {}, confidence: 0, rawText: response };
  }
}
