'use client';

import { Loader2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Textarea } from '@/components/ui/textarea';
import { useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';

/**
 * Explicit confirmation before sensitive actions (3.1, 5.2): closing, cancelling, refunds,
 * deactivation. With `reason`, the user must type why (stored in the audit trail).
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive,
  reason,
  reasonLabel,
  children,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  /** Ask for a reason (min 3 characters) */
  reason?: boolean;
  reasonLabel?: string;
  /** Extra fields above the buttons */
  children?: ReactNode;
  onConfirm: (reason: string) => Promise<unknown> | unknown;
}) {
  const c = useMessages(common);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const blocked = reason && text.trim().length < 3;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setText('');
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {reason && (
          <FormField label={reasonLabel ?? c.notes} required>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={255} autoFocus />
          </FormField>
        )}
        {children}
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            {c.cancel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'primary'}
            disabled={busy || !!blocked}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm(text.trim());
                setText('');
                onOpenChange(false);
              } catch {
                /* the caller shows the error */
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy && <Loader2 className="animate-spin" />} {confirmLabel ?? c.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
