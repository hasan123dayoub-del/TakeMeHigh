'use client';

/*
 * Small helpers shared by the administration pages (employees, roles, geo, categories, audit).
 * Kept inside components/admin so the shared foundation stays untouched.
 */
import { Check, Copy } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api';
import { defineMessages, useMessages } from '@/lib/i18n';

const m = defineMessages({
  ar: { copy: 'نسخ', copied: 'تم النسخ', copyFailed: 'تعذّر النسخ، انسخه يدوياً' },
  en: { copy: 'Copy', copied: 'Copied', copyFailed: 'Could not copy; copy it by hand' },
});

/**
 * Runs an API call from a ConfirmDialog: toasts the success message or the API error.
 * Re-throws on failure so the dialog stays open.
 */
export function useToastAction() {
  return useCallback(async (fn: () => Promise<unknown>, success: string) => {
    try {
      await fn();
      toast.success(success);
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    }
  }, []);
}

/** A button that copies `value` to the clipboard and shows a tick for a moment. */
export function CopyButton({ value, className }: { value: string; className?: string }) {
  const t = useMessages(m);
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          toast.success(t.copied);
          setTimeout(() => setDone(false), 1500);
        } catch {
          toast.error(t.copyFailed);
        }
      }}
    >
      {done ? <Check /> : <Copy />} {t.copy}
    </Button>
  );
}
