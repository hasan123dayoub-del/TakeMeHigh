'use client';

import { X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { common, useMessages } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { ErrorBanner } from './states';

/**
 * Dialog with a direction-aware close button (the shared DialogContent pins its close
 * button to the physical right, which collides with the title in Arabic).
 */
export function AppDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const c = useMessages(common);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className={cn(
          size === 'sm' && 'max-w-md',
          size === 'md' && 'max-w-lg',
          size === 'lg' && 'max-w-2xl',
          size === 'xl' && 'max-w-3xl',
          className,
        )}
      >
        <div className="grid gap-1.5 pe-10 text-start">
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{title}</DialogDescription>
          )}
        </div>
        <DialogClose
          className="absolute end-4 top-4 grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          aria-label={c.close}
        >
          <X className="size-4" />
        </DialogClose>
        {children}
        {footer && <DialogFooter className="gap-2">{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Confirmation for destructive or irreversible actions. With `confirmText`, the user must
 * type that word before the button unlocks (used for "cancel trip").
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  loading,
  error,
  tone = 'danger',
  confirmText,
  confirmTextLabel,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  loading?: boolean;
  error?: ReactNode;
  tone?: 'danger' | 'primary';
  confirmText?: string;
  confirmTextLabel?: ReactNode;
  children?: ReactNode;
}) {
  const c = useMessages(common);
  const [typed, setTyped] = useState('');
  const locked = !!confirmText && typed.trim() !== confirmText;
  return (
    <AppDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setTyped('');
        onOpenChange(o);
      }}
      size="sm"
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
            {c.cancel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'destructive' : 'primary'}
            onClick={onConfirm}
            loading={loading}
            disabled={locked}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
      {confirmText && (
        <FormField label={confirmTextLabel}>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} dir="ltr" autoComplete="off" placeholder={confirmText} />
        </FormField>
      )}
      <ErrorBanner>{error}</ErrorBanner>
    </AppDialog>
  );
}
