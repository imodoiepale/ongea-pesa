"use client";

/**
 * components/ongea-pesa/contact-import.tsx
 *
 * Reusable contact-import widget.
 * - Android Chrome: Contact Picker API (multi-select, native sheet)
 * - iOS / Desktop fallback: .vcf or .csv file upload
 *
 * Props are the relevant slice of useContactSearch() return so any parent
 * component can host it without double-fetching.
 */

import { useRef } from 'react';
import { Smartphone, Upload, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ContactImportProps {
  isPickerSupported: boolean;
  importing: boolean;
  importMsg: string | null;
  onImportFromDevice: () => Promise<void>;
  onImportFromFile: (file: File) => Promise<void>;
  onDismissMsg: () => void;
  /** Extra Tailwind classes for the outer wrapper */
  className?: string;
}

export default function ContactImport({
  isPickerSupported,
  importing,
  importMsg,
  onImportFromDevice,
  onImportFromFile,
  onDismissMsg,
  className,
}: ContactImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSuccess = importMsg !== null && !importMsg.toLowerCase().startsWith('import failed') && !importMsg.toLowerCase().startsWith('no contacts');

  return (
    <div className={cn('rounded-xl border border-border/60 bg-card overflow-hidden', className)}>
      {/* One-time consent line */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-[11px] text-muted-foreground leading-snug">
          Import contacts to search by name when sending money. Stored securely in your account — never shared.
        </p>
      </div>

      {/* Action buttons */}
      <div className={cn('flex gap-2 px-4 pb-3 pt-2', !isPickerSupported && 'flex-col')}>
        {/* Device picker — only shown on Android Chrome */}
        {isPickerSupported && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-brand/30 text-brand hover:bg-brand/5 text-xs"
            onClick={onImportFromDevice}
            disabled={importing}
          >
            {importing ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Smartphone className="h-3.5 w-3.5 mr-1.5" />
            )}
            {importing ? 'Importing…' : 'Import from Phone'}
          </Button>
        )}

        {/* File upload — always shown */}
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'border-border/60 text-foreground hover:bg-muted/60 text-xs',
            isPickerSupported ? 'flex-1' : 'w-full'
          )}
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
        >
          {importing && !isPickerSupported ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5 mr-1.5" />
          )}
          {importing && !isPickerSupported ? 'Importing…' : 'Upload .vcf / .csv'}
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".vcf,.csv"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) onImportFromFile(file);
            // Reset so the same file can be re-uploaded
            e.target.value = '';
          }}
        />
      </div>

      {/* Result message */}
      {importMsg && (
        <div className={cn(
          'flex items-start gap-2 mx-4 mb-3 px-3 py-2 rounded-lg text-xs',
          isSuccess
            ? 'bg-brand/8 text-brand border border-brand/20'
            : 'bg-destructive/8 text-destructive border border-destructive/20'
        )}>
          {isSuccess
            ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            : <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          }
          <span className="flex-1">{importMsg}</span>
          <button onClick={onDismissMsg} className="shrink-0 hover:opacity-70 transition-opacity">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
