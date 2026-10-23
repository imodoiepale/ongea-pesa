import { publicEncrypt, constants } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// Server-only Safaricom Daraja client for the org shortcode (DARAJA_SHORTCODE).
// Org-API calls (balance, status) are async: Safaricom replies to ResultURL
// (/api/pay/daraja/result), which stores the outcome in daraja_results.

const base = () =>
  process.env.DARAJA_ENV === 'sandbox' ? 'https://sandbox.safaricom.co.ke' : 'https://api.safaricom.co.ke';

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

let cached: { token: string; exp: number } | null = null;

export async function darajaToken(): Promise<string> {
  if (cached && cached.exp > Date.now()) return cached.token;
  const auth = Buffer.from(`${env('DARAJA_CONSUMER_KEY')}:${env('DARAJA_CONSUMER_SECRET')}`).toString('base64');
  const res = await fetch(`${base()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
    cache: 'no-store',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) throw new Error(`Daraja OAuth failed (${res.status})`);
  cached = { token: body.access_token, exp: Date.now() + (Number(body.expires_in) - 60) * 1000 };
  return cached.token;
}

// Initiator password RSA-encrypted with Safaricom's public cert.
// Either set DARAJA_SECURITY_CREDENTIAL (pre-generated on the Daraja portal) or put the
// cert at lib/daraja/ProductionCertificate.cer and set DARAJA_INITIATOR_PASSWORD.
export function securityCredential(): string {
  if (process.env.DARAJA_SECURITY_CREDENTIAL) return process.env.DARAJA_SECURITY_CREDENTIAL;
  const file = process.env.DARAJA_ENV === 'sandbox' ? 'SandboxCertificate.cer' : 'ProductionCertificate.cer';
  const cert = readFileSync(path.join(process.cwd(), 'lib/daraja', file));
  return publicEncrypt(
    { key: cert, padding: constants.RSA_PKCS1_PADDING },
    Buffer.from(env('DARAJA_INITIATOR_PASSWORD')),
  ).toString('base64');
}

async function post(endpoint: string, payload: Record<string, unknown>) {
  const res = await fetch(`${base()}${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await darajaToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || (body.ResponseCode !== undefined && String(body.ResponseCode) !== '0')) {
    throw new Error(
      `Daraja ${endpoint} failed (${res.status}): ${body.errorMessage || body.ResponseDescription || 'unknown'}`,
    );
  }
  return body;
}

const callbackUrl = (kind: string) =>
  `${env('DARAJA_CALLBACK_BASE_URL')}/api/pay/daraja/result?s=${env('C2B_CALLBACK_SECRET')}&kind=${kind}`;

const org = () => ({
  Initiator: env('DARAJA_INITIATOR_NAME'),
  SecurityCredential: securityCredential(),
  PartyA: env('DARAJA_SHORTCODE'),
});

export const accountBalance = () =>
  post('/mpesa/accountbalance/v1/query', {
    ...org(),
    CommandID: 'AccountBalance',
    IdentifierType: '4',
    Remarks: 'Balance query',
    QueueTimeOutURL: callbackUrl('balance'),
    ResultURL: callbackUrl('balance'),
  });

export const transactionStatus = (transactionId: string) =>
  post('/mpesa/transactionstatus/v1/query', {
    ...org(),
    CommandID: 'TransactionStatusQuery',
    TransactionID: transactionId,
    IdentifierType: '4',
    Remarks: 'Status query',
    Occasion: '',
    QueueTimeOutURL: callbackUrl('status'),
    ResultURL: callbackUrl('status'),
  });

// Pull Transactions: Safaricom must enable it for the shortcode, then call pullRegister once.
// Dates are 'YYYY-MM-DD HH:mm:ss'; Safaricom limits how far back one query can reach.
export const pullRegister = () =>
  post('/pulltransactions/v1/register', {
    ShortCode: env('DARAJA_SHORTCODE'),
    RequestType: 'Pull',
    NominatedNumber: env('DARAJA_PULL_NOMINATED_NUMBER'),
    CallBackURL: callbackUrl('pull'),
  });

export const pullTransactions = (startDate: string, endDate: string, offset = 0) =>
  post('/pulltransactions/v1/query', {
    ShortCode: env('DARAJA_SHORTCODE'),
    StartDate: startDate,
    EndDate: endDate,
    OffSetValue: String(offset),
  });
