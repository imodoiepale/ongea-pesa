import { NextRequest, NextResponse } from 'next/server';
import { getPromptForScanMode, getAutoDetectPrompt, parseOcrResponse, PaymentScanResult } from '@/lib/ocr-shared';

async function tryOpenAI(imageData: string, prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageData}`, detail: 'high' } },
            { type: 'text', text: prompt },
          ],
        },
      ],
      max_tokens: 512,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const body = await res.json();
  return body.choices?.[0]?.message?.content ?? '';
}

async function tryGemini(imageData: string, prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inline_data: { mime_type: 'image/jpeg', data: imageData } },
              { text: prompt },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    }
  );

  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const body = await res.json();
  return body.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

export async function POST(request: NextRequest) {
  try {
    const { imageData, scanMode } = await request.json();

    if (!imageData) {
      return NextResponse.json({ error: 'imageData required' }, { status: 400 });
    }

    const prompt = (scanMode === null || scanMode === 'auto' || !scanMode)
      ? getAutoDetectPrompt()
      : getPromptForScanMode(scanMode);
    let rawText = '';
    let provider: 'openai' | 'gemini' = 'openai';

    try {
      rawText = await tryOpenAI(imageData, prompt);
      console.log('✅ OCR via OpenAI');
    } catch (openaiErr) {
      console.warn('⚠️ OpenAI OCR failed, falling back to Gemini:', (openaiErr as Error).message);
      provider = 'gemini';
      try {
        rawText = await tryGemini(imageData, prompt);
        console.log('✅ OCR via Gemini (fallback)');
      } catch (geminiErr) {
        console.error('❌ Both OCR providers failed:', (geminiErr as Error).message);
        return NextResponse.json({ error: 'OCR service unavailable' }, { status: 503 });
      }
    }

    const result: PaymentScanResult = parseOcrResponse(rawText, scanMode ?? 'auto');
    result.provider = provider;

    return NextResponse.json(result);
  } catch (err) {
    console.error('OCR route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
