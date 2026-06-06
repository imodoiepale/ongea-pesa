"use client";

/**
 * hooks/use-contact-search.ts
 *
 * Unified contact search hook.
 * - Fetches personal contacts (imported from device/file) from /api/contacts/personal
 * - Fetches app contacts (Ongea Pesa users + IndexPay gates) from /api/contacts
 * - Merges and deduplicates on normalized_phone
 * - Builds a Fuse.js index for fuzzy name/phone search
 * - Exposes importFromDevice (Contact Picker API) and importFromFile (vCard/CSV)
 * - Exposes currentUser from /api/contacts for the "Me" display
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Fuse from 'fuse.js';
import type { SearchableContact } from '@/lib/contact-search';
import { buildFuseIndex, searchContacts as fuseSearch } from '@/lib/contact-search';
import { normalizePhone, displayPhone } from '@/lib/phone';
import { useContacts } from '@/hooks/use-contacts';

export type { SearchableContact };

export interface CurrentUser {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  gate_name: string | null;
  balance: number;
  avatar: string;
}

interface PersonalContactRaw {
  id: string;
  display_name: string;
  phone: string;
  normalized_phone: string;
  source: string;
}

interface AppContactRaw {
  id: string | null;
  name: string;
  email: string | null;
  phone: string;
  gate_name?: string;
  gate_id?: string;
  balance?: number;
  source: string;
  has_account: boolean;
  avatar: string;
}

function getAvatarInitials(name: string): string {
  if (!name) return 'U';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

export function useContactSearch() {
  const [personalContacts, setPersonalContacts] = useState<PersonalContactRaw[]>([]);
  const [appContacts, setAppContacts] = useState<AppContactRaw[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fuseRef = useRef<Fuse<SearchableContact> | null>(null);

  const { isSupported: isPickerSupported, selectContacts } = useContacts();

  // ── Load both sources once ────────────────────────────────────────────────
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [personalRes, appRes] = await Promise.all([
        fetch('/api/contacts/personal').then(r => r.ok ? r.json() : { contacts: [] }),
        fetch('/api/contacts').then(r => r.ok ? r.json() : { contacts: [], current_user: null }),
      ]);
      setPersonalContacts(personalRes.contacts ?? []);
      setAppContacts(appRes.contacts ?? []);
      if (appRes.current_user) {
        const cu = appRes.current_user;
        setCurrentUser({
          id: cu.id,
          name: cu.name ?? cu.email?.split('@')[0] ?? 'Me',
          email: cu.email ?? null,
          phone: cu.phone ?? '',
          gate_name: cu.gate_name ?? null,
          balance: parseFloat(String(cu.balance ?? 0)),
          avatar: cu.avatar ?? getAvatarInitials(cu.name ?? ''),
        });
      }
    } catch (e) {
      console.error('[useContactSearch] load error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // ── Merge + deduplicate on normalized_phone ───────────────────────────────
  const allContacts = useMemo((): SearchableContact[] => {
    const seen = new Set<string>();
    const merged: SearchableContact[] = [];

    // Personal contacts first (they have richer, user-defined names)
    for (const c of personalContacts) {
      const norm = c.normalized_phone || normalizePhone(c.phone);
      if (norm) seen.add(norm);
      merged.push({
        id: c.id,
        display_name: c.display_name,
        phone: c.phone || displayPhone(norm),
        normalized_phone: norm,
        source: 'personal',
        has_account: false,
        avatar: getAvatarInitials(c.display_name),
      });
    }

    // App contacts — dedup by normalized phone
    for (const c of appContacts) {
      const norm = c.phone ? normalizePhone(c.phone) : '';
      if (norm && seen.has(norm)) continue;
      if (norm) seen.add(norm);
      merged.push({
        id: c.id ?? null,
        display_name: c.name ?? '',
        phone: c.phone ?? (norm ? displayPhone(norm) : ''),
        normalized_phone: norm,
        source: 'app',
        has_account: c.has_account ?? false,
        gate_name: c.gate_name,
        avatar: c.avatar ?? getAvatarInitials(c.name ?? ''),
      });
    }

    return merged;
  }, [personalContacts, appContacts]);

  // ── Rebuild Fuse index when contacts change ───────────────────────────────
  useEffect(() => {
    fuseRef.current = buildFuseIndex(allContacts);
  }, [allContacts]);

  // ── Fuzzy results ─────────────────────────────────────────────────────────
  const results = useMemo(() => {
    return fuseSearch(query, allContacts, fuseRef.current ?? undefined);
  }, [query, allContacts]);

  // ── Import from device (Contact Picker API — Android Chrome only) ─────────
  const importFromDevice = useCallback(async () => {
    setImporting(true);
    setImportMsg(null);
    try {
      const selected = await selectContacts({ multiple: true, properties: ['name', 'tel'] });
      if (!selected.length) {
        setImportMsg('No contacts selected.');
        return;
      }
      const contacts = selected.flatMap(c =>
        (c.tel ?? []).map(tel => ({
          name: c.name?.[0] ?? 'Unknown',
          phone: tel,
        }))
      ).filter(c => c.phone);

      if (!contacts.length) {
        setImportMsg('Selected contacts have no phone numbers.');
        return;
      }

      const res = await fetch('/api/contacts/personal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts, source: 'device' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Import failed');

      setImportMsg(`Imported ${data.imported} contact${data.imported !== 1 ? 's' : ''}${data.skipped ? ` (${data.skipped} duplicate${data.skipped !== 1 ? 's' : ''} skipped)` : ''}.`);
      await reload();
    } catch (e: any) {
      setImportMsg(`Import failed: ${e.message}`);
    } finally {
      setImporting(false);
    }
  }, [selectContacts, reload]);

  // ── Import from file (vCard / CSV) ────────────────────────────────────────
  const importFromFile = useCallback(async (file: File) => {
    setImporting(true);
    setImportMsg(null);
    try {
      const text = await file.text();
      const { parseContactFile } = await import('@/lib/contact-import-parse');
      const parsed = parseContactFile(text, file.name);

      if (!parsed.length) {
        setImportMsg('No contacts found. Check that the file is a valid .vcf or .csv with name and phone columns.');
        return;
      }

      const source = file.name.toLowerCase().endsWith('.vcf') ? 'vcard' : 'csv';
      const res = await fetch('/api/contacts/personal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: parsed, source }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Import failed');

      setImportMsg(`Imported ${data.imported} contact${data.imported !== 1 ? 's' : ''} from ${file.name}${data.skipped ? ` (${data.skipped} duplicate${data.skipped !== 1 ? 's' : ''} skipped)` : ''}.`);
      await reload();
    } catch (e: any) {
      setImportMsg(`Import failed: ${e.message}`);
    } finally {
      setImporting(false);
    }
  }, [reload]);

  return {
    allContacts,
    results,
    query,
    setQuery,
    loading,
    currentUser,
    importing,
    importMsg,
    setImportMsg,
    importFromDevice,
    importFromFile,
    isPickerSupported,
    reload,
  };
}
