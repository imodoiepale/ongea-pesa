/**
 * lib/contact-import-parse.ts
 * Zero-dependency parser for vCard (.vcf) and CSV (.csv) contact files.
 * Extracts { name, phone } pairs from each format.
 */

export interface ParsedContact {
  name: string;
  phone: string;
}

/** Parse a vCard 2.1 / 3.0 / 4.0 file and return all name+phone pairs. */
export function parseVCard(text: string): ParsedContact[] {
  const contacts: ParsedContact[] = [];

  // Split on BEGIN:VCARD — each entry is one contact block
  const blocks = text.split(/BEGIN:VCARD/i).slice(1); // first element before the first BEGIN is empty

  for (const block of blocks) {
    // FN is the formatted (display) name: "FN:John Doe" or "FN;CHARSET=UTF-8:John Doe"
    const nameMatch = block.match(/^FN[^:\r\n]*:(.+)$/im);
    const displayName = nameMatch?.[1]?.trim() ?? '';

    if (!displayName) continue;

    // TEL lines: "TEL;TYPE=CELL:+254712345678" or "TEL:0712345678"
    const telLines = [...block.matchAll(/^TEL[^:\r\n]*:(.+)$/gim)];

    if (telLines.length === 0) {
      // Contact has a name but no phone — skip
      continue;
    }

    for (const m of telLines) {
      const phone = m[1]?.trim() ?? '';
      if (phone) {
        contacts.push({ name: displayName, phone });
      }
    }
  }

  return contacts;
}

/**
 * Parse a CSV file.
 * Expects a header row.  Detects name / phone columns by keyword matching.
 * Handles quoted fields.
 */
export function parseCSV(text: string): ParsedContact[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const parseRow = (line: string): string[] => {
    const cols: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) {
        cols.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());
    return cols;
  };

  const header = parseRow(lines[0]).map(h => h.toLowerCase().replace(/['"]/g, '').trim());
  const nameIdx  = header.findIndex(h => h.includes('name') && !h.includes('phone'));
  const phoneIdx = header.findIndex(h => h.includes('phone') || h.includes('tel') || h.includes('mobile') || h.includes('number'));

  if (nameIdx === -1 || phoneIdx === -1) return [];

  const contacts: ParsedContact[] = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cols = parseRow(line);
    const name  = cols[nameIdx]  ?? '';
    const phone = cols[phoneIdx] ?? '';
    if (name && phone) contacts.push({ name, phone });
  }
  return contacts;
}

/**
 * Auto-detect format from file name and/or content, then parse.
 * Exported as the main entry point.
 */
export function parseContactFile(text: string, fileName: string): ParsedContact[] {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.vcf')) return parseVCard(text);
  if (lower.endsWith('.csv')) return parseCSV(text);
  // Auto-detect by content
  if (/BEGIN:VCARD/i.test(text)) return parseVCard(text);
  return parseCSV(text);
}
