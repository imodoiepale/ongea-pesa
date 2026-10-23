// One-off: register Daraja C2B Confirmation/Validation URLs for a shortcode.
// Usage: node --env-file=.env.local scripts/register-c2b-urls.mjs <shortcode> <https://your-domain>
// Production registration is effectively one-shot per shortcode, so double-check the domain.
const [shortcode, domain] = process.argv.slice(2);
const { DARAJA_CONSUMER_KEY: key, DARAJA_CONSUMER_SECRET: sec, C2B_CALLBACK_SECRET: s, DARAJA_ENV } = process.env;
if (!shortcode || !domain?.startsWith('https://') || !key || !sec || !s) {
  console.error('Need <shortcode> <https://domain> and DARAJA_CONSUMER_KEY/SECRET + C2B_CALLBACK_SECRET in env');
  process.exit(1);
}
const base = DARAJA_ENV === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
const auth = Buffer.from(`${key}:${sec}`).toString('base64');
const tok = await (await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`, { headers: { Authorization: `Basic ${auth}` } })).json();
if (!tok.access_token) { console.error('OAuth failed', tok); process.exit(1); }
const res = await fetch(`${base}/mpesa/c2b/v2/registerurl`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${tok.access_token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ShortCode: shortcode,
    ResponseType: 'Completed',
    ConfirmationURL: `${domain}/api/pay/c2b/confirm?s=${s}`,
    ValidationURL: `${domain}/api/pay/c2b/validate`,
  }),
});
console.log(res.status, await res.json());
