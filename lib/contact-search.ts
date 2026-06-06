/**
 * lib/contact-search.ts
 * Fuse.js wrapper for unified contact fuzzy search.
 * Keeps the Fuse import in one place so client + server can share the type
 * without bundling Fuse on the server.
 */

import Fuse, { type IFuseOptions } from 'fuse.js';

export interface SearchableContact {
  /** Supabase row id (personal_contacts) or null for app / IndexPay contacts */
  id: string | null;
  display_name: string;
  /** Display format: 07XXXXXXXX */
  phone: string;
  /** Canonical format: 254XXXXXXXXX — used for dedup */
  normalized_phone: string;
  /** 'personal' = imported from device/file; 'app' = Ongea Pesa user or IndexPay gate */
  source: 'personal' | 'app';
  has_account: boolean;
  gate_name?: string;
  avatar: string;
}

const FUSE_OPTIONS: IFuseOptions<SearchableContact> = {
  keys: [
    { name: 'display_name', weight: 0.7 },
    { name: 'phone',        weight: 0.2 },
    { name: 'gate_name',    weight: 0.1 },
  ],
  threshold: 0.4,       // 0 = exact, 1 = match anything
  includeScore: true,
  minMatchCharLength: 2,
  shouldSort: true,
};

export function buildFuseIndex(contacts: SearchableContact[]): Fuse<SearchableContact> {
  return new Fuse(contacts, FUSE_OPTIONS);
}

export function searchContacts(
  query: string,
  contacts: SearchableContact[],
  fuse?: Fuse<SearchableContact>
): SearchableContact[] {
  if (!query.trim()) return contacts.slice(0, 40);
  const index = fuse ?? new Fuse(contacts, FUSE_OPTIONS);
  return index.search(query).map(r => r.item);
}
