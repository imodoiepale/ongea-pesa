/**
 * lib/phone.ts — Kenyan phone number utilities.
 *
 * Canonical / stored format : 12-digit, no '+' → "2547XXXXXXXX" or "2541XXXXXXXX"
 * Display format            : "07XXXXXXXX"  (10 digits, local)
 */

/**
 * normalizePhone — convert any Kenyan number to the 12-digit canonical form.
 * Returns '' when the input is not a recognisable Kenyan number.
 */
export function normalizePhone(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');

  // Already international 254XXXXXXXXX (12 digits)
  if (digits.startsWith('254') && digits.length === 12) return digits;

  // Local format 07XXXXXXXX or 01XXXXXXXX (10 digits)
  if ((digits.startsWith('07') || digits.startsWith('01')) && digits.length === 10) {
    return '254' + digits.slice(1);
  }

  // Without leading zero: 7XXXXXXXX or 1XXXXXXXX (9 digits)
  if ((digits.startsWith('7') || digits.startsWith('1')) && digits.length === 9) {
    return '254' + digits;
  }

  return '';
}

/**
 * displayPhone — convert canonical 254XXXXXXXXX to local 07XXXXXXXX.
 * Returns the input unchanged when it does not match canonical form.
 */
export function displayPhone(normalized: string): string {
  if (!normalized) return '';
  if (normalized.startsWith('254') && normalized.length === 12) {
    return '0' + normalized.slice(3);
  }
  return normalized;
}
