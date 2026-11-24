'use client';

import { LABELS, type DecisionType } from '@travelos/shared';
import { Ban, CircleAlert, Copy, Eye, EyeOff, Gavel, Loader2, Lock, MoreHorizontal, Pencil, RefreshCcw, Rocket, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/data/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useInvalidate } from '@/lib/hooks';
import { defineMessages, useLocale, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import { cn } from '@/lib/utils';
import { fromLocalInput, toLocalInput, type TripFull } from './trip-utils';

const m = defineMessages({
  ar: {
    publish: 'نشر الرحلة',
    published: 'تم نشر الرحلة وفتح التسجيل',
    publishBlocked: 'لا يمكن نشر الرحلة بعد',
    publishBlockedBody: 'أصلح هذه النقاط ثم أعد المحاولة:',
    show: 'إظهار للعموم',
    hide: 'إخفاء عن العموم',
    shown: 'الرحلة ظاهرة في الصفحة العامة',
    hidden: 'الرحلة مخفية عن الصفحة العامة',
    close: 'إغلاق التسجيل الآن',
    closeTitle: 'إغلاق التسجيل الآن؟',
    closeBody: 'سيتوقف قبول الحجوزات، ويُسجَّل إجمالي الركاب المؤكدين وتاريخ الإغلاق. بعدها تتخذ قراراً: تأكيد التنفيذ أو تمديد التسجيل أو الإلغاء.',
    closed: 'تم إغلاق التسجيل',
    decide: 'القرار بعد الإغلاق',
    decideHint: 'التسجيل مغلق. اختر ما يحدث للرحلة الآن (CLS-05).',
    d_CONFIRM: 'تثبيت تنفيذ الرحلة بالركاب الحاليين.',
    d_EXTEND: 'فتح التسجيل حتى موعد جديد قبل الانطلاق.',
    d_REOPEN: 'إعادة فتح التسجيل (مدير المكتب).',
    d_CANCEL: 'إلغاء الرحلة وكل حجوزاتها (مدير المكتب). الاسترجاعات تُسجَّل لاحقاً.',
    newDeadline: 'الموعد الجديد لانتهاء التسجيل',
    note: 'ملاحظة',
    reasonRequired: 'سبب الإلغاء (3 أحرف على الأقل)',
    decided: 'تم حفظ القرار',
    cancel: 'إلغاء الرحلة',
    cancelTitle: 'إلغاء الرحلة؟',
    cancelBody: 'ستُلغى الرحلة وكل حجوزاتها، وتُخفى من الصفحة العامة. لا يمكن التراجع.',
    cancelReason: 'سبب الإلغاء',
    cancelled: 'تم إلغاء الرحلة',
    clone: 'نسخ إلى موعد جديد',
    cloneTitle: 'نسخ الرحلة',
    cloneBody: 'تُنشأ مسودة جديدة بالخدمات نفسها، وتُزاح كل التواريخ بالفرق نفسه، وتُسعَّر بكلف الموردين الحالية.',
    cloneStart: 'موعد الانطلاق الجديد',
    cloned: 'تم إنشاء النسخة',
    acceptCosts: 'قبول الكلف الحالية',
    acceptTitle: 'قبول كلف الموردين الحالية؟',
    acceptBody: 'يُعاد تسعير كل خدمات الرحلة بكلف الموردين الحالية مع الحفاظ على الربح، ويُزال تنبيه تغيّر الكلف. الحجوزات الحالية تحتفظ بأسعارها.',
    accepted: 'تم قبول الكلف وإعادة التسعير',
    addCustomer: 'إضافة عميل',
    edit: 'تعديل',
    more: 'إجراءات أخرى',
    save: 'حفظ القرار',
  },
  en: {
    publish: 'Publish trip',
    published: 'Trip published; registration is open',
    publishBlocked: 'The trip cannot be published yet',
    publishBlockedBody: 'Fix these points and try again:',
    show: 'Show publicly',
    hide: 'Hide from public',
    shown: 'The trip is shown on the public page',
    hidden: 'The trip is hidden from the public page',
    close: 'Close registration now',
    closeTitle: 'Close registration now?',
    closeBody: 'Bookings stop, and the confirmed passenger total and closing date are recorded. Then decide: confirm, extend registration or cancel.',
    closed: 'Registration closed',
    decide: 'Decision after closing',
    decideHint: 'Registration is closed. Choose what happens to the trip now (CLS-05).',
    d_CONFIRM: 'Confirm the trip with the current passengers.',
    d_EXTEND: 'Reopen registration until a new deadline before departure.',
    d_REOPEN: 'Reopen registration (Admin).',
    d_CANCEL: 'Cancel the trip and all its bookings (Admin). Refunds are recorded afterwards.',
    newDeadline: 'New registration deadline',
    note: 'Note',
    reasonRequired: 'Cancellation reason (at least 3 characters)',
    decided: 'Decision saved',
    cancel: 'Cancel trip',
    cancelTitle: 'Cancel this trip?',
    cancelBody: 'The trip and all its bookings are cancelled and it is hidden from the public page. This cannot be undone.',
    cancelReason: 'Cancellation reason',
    cancelled: 'Trip cancelled',
    clone: 'Clone to a new date',
    cloneTitle: 'Clone trip',
    cloneBody: 'A new draft with the same services is created, every date shifted by the same amount, priced at today’s supplier costs.',
    cloneStart: 'New departure',
    cloned: 'Copy created',
    acceptCosts: 'Accept current costs',
    acceptTitle: 'Accept the current supplier costs?',
    acceptBody: 'Every service is repriced at today’s supplier cost, keeping its profit, and the cost-change warning is cleared. Existing bookings keep their prices.',
    accepted: 'Costs accepted and trip repriced',
    addCustomer: 'Add customer',
    edit: 'Edit',
    more: 'More actions',
    save: 'Save decision',
  },
});

type Modal = 'close' | 'decide' | 'cancel' | 'clone' | 'accept' | null;

/** Lifecycle actions, driven by the status and the role's permissions (the API enforces both). */
export function TripActions({ trip }: { trip: TripFull }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const { can, isAdmin, user } = useAuth();
  const router = useRouter();
  const invalidate = useInvalidate();
  const [modal, setModal] = useState<Modal>(null);
  const [publishErrors, setPublishErrors] = useState<string[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const ownsIt = isAdmin || (!!trip.branchId && trip.branchId === user?.branch?.id);
  const manage = can('trips.manage') && ownsIt;
  const closeable = can('trips.close') && ownsIt;
  const cancelPerm = can('trips.cancel');
  const live = trip.status !== 'CANCELLED' && trip.status !== 'COMPLETED';
  const s = trip.status;

  const run = async (key: string, fn: () => Promise<unknown>, success: string) => {
    setBusy(key);
    try {
      await fn();
      await invalidate('/trips');
      toast.success(success);
    } catch (e) {
      if (key === 'publish' && e instanceof ApiError && e.status === 400) setPublishErrors(e.messages);
      else toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const menuItems = [
    manage && live && { key: 'clone', icon: Copy, label: t.clone, onSelect: () => setModal('clone') },
    manage && live && { key: 'public', icon: trip.isPublic ? EyeOff : Eye, label: trip.isPublic ? t.hide : t.show, onSelect: () => run('public', () => api.patch(`/trips/${trip.id}/public`, { isPublic: !trip.isPublic }), trip.isPublic ? t.hidden : t.shown) },
    closeable && s === 'OPEN' && { key: 'close', icon: Lock, label: t.close, onSelect: () => setModal('close') },
  ].filter((x): x is { key: string; icon: typeof Copy; label: string; onSelect: () => void } => !!x);
  const canCancel = cancelPerm && (s === 'DRAFT' || s === 'OPEN' || s === 'CLOSED' || s === 'CONFIRMED');

  return (
    <div className="flex flex-wrap items-center gap-2">
      {can('bookings.create') && s === 'OPEN' && (
        <Button asChild>
          <Link href={`/dashboard/bookings/new?tripId=${trip.id}`}>
            <UserPlus /> {t.addCustomer}
          </Link>
        </Button>
      )}
      {manage && s === 'DRAFT' && (
        <Button onClick={() => run('publish', () => api.post(`/trips/${trip.id}/publish`), t.published)} disabled={busy === 'publish'}>
          {busy === 'publish' ? <Loader2 className="animate-spin" /> : <Rocket />} {t.publish}
        </Button>
      )}
      {closeable && s === 'CLOSED' && (
        <Button variant="ink" onClick={() => setModal('decide')}>
          <Gavel /> {t.decide}
        </Button>
      )}
      {can('pricing.set_profit') && manage && trip.warnings.includes('COST_CHANGED') && (s === 'DRAFT' || s === 'OPEN') && (
        <Button variant="secondary" onClick={() => setModal('accept')}>
          <RefreshCcw /> {t.acceptCosts}
        </Button>
      )}
      {manage && live && (
        <Button variant="secondary" asChild>
          <Link href={`/dashboard/trips/${trip.id}/edit`}>
            <Pencil /> {t.edit}
          </Link>
        </Button>
      )}
      {(menuItems.length > 0 || canCancel) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" aria-label={t.more}>
              {busy === 'public' ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {menuItems.map((it) => (
              <DropdownMenuItem key={it.key} onSelect={it.onSelect}>
                <it.icon /> {it.label}
              </DropdownMenuItem>
            ))}
            {canCancel && (
              <>
                {menuItems.length > 0 && <DropdownMenuSeparator />}
                <DropdownMenuItem variant="danger" onSelect={() => setModal('cancel')}>
                  <Ban /> {t.cancel}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <ConfirmDialog
        open={modal === 'close'}
        onOpenChange={(o) => !o && setModal(null)}
        title={t.closeTitle}
        description={t.closeBody}
        confirmLabel={t.close}
        onConfirm={() => run('close', () => api.post(`/trips/${trip.id}/close`), t.closed)}
      />
      <ConfirmDialog
        open={modal === 'cancel'}
        onOpenChange={(o) => !o && setModal(null)}
        title={t.cancelTitle}
        description={t.cancelBody}
        destructive
        reason
        reasonLabel={t.cancelReason}
        confirmLabel={t.cancel}
        onConfirm={async (reason) => {
          try {
            await api.post(`/trips/${trip.id}/cancel`, { reason });
            await invalidate('/trips');
            toast.success(t.cancelled);
          } catch (e) {
            toast.error(errorMessage(e));
            throw e;
          }
        }}
      />
      <ConfirmDialog
        open={modal === 'accept'}
        onOpenChange={(o) => !o && setModal(null)}
        title={t.acceptTitle}
        description={t.acceptBody}
        confirmLabel={t.acceptCosts}
        onConfirm={() => run('accept', () => api.post(`/trips/${trip.id}/accept-costs`), t.accepted)}
      />
      {modal === 'decide' && <DecisionDialog trip={trip} canAdmin={cancelPerm} onClose={() => setModal(null)} />}
      {modal === 'clone' && (
        <CloneDialog
          trip={trip}
          onClose={() => setModal(null)}
          onDone={(id) => {
            setModal(null);
            router.push(`/dashboard/trips/${id}?tab=services`);
          }}
        />
      )}

      <Dialog open={!!publishErrors} onOpenChange={(o) => !o && setPublishErrors(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CircleAlert className="size-5 text-danger" aria-hidden /> {t.publishBlocked}
            </DialogTitle>
            <DialogDescription>{t.publishBlockedBody}</DialogDescription>
          </DialogHeader>
          <ul className="grid gap-2">
            {publishErrors?.map((e) => (
              <li key={e} dir="auto" className="rounded-tile border border-danger/25 bg-danger/6 px-3.5 py-2.5 text-sm">
                {e}
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPublishErrors(null)}>
              {c.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DecisionDialog({ trip, canAdmin, onClose }: { trip: TripFull; canAdmin: boolean; onClose: () => void }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const { locale } = useLocale();
  const invalidate = useInvalidate();
  const options: DecisionType[] = canAdmin ? ['CONFIRM', 'EXTEND', 'REOPEN', 'CANCEL'] : ['CONFIRM', 'EXTEND'];
  const [decision, setDecision] = useState<DecisionType>('CONFIRM');
  const [deadline, setDeadline] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const needsDeadline = decision === 'EXTEND' || decision === 'REOPEN';
  const blocked = (needsDeadline && !deadline) || (decision === 'CANCEL' && note.trim().length < 3);

  const save = async () => {
    setBusy(true);
    setErrors([]);
    try {
      await api.post(`/trips/${trip.id}/decision`, {
        decision,
        newDeadline: needsDeadline ? fromLocalInput(deadline) : undefined,
        note: note.trim() || undefined,
      });
      await invalidate('/trips');
      toast.success(t.decided);
      onClose();
    } catch (e) {
      setErrors(e instanceof ApiError ? e.messages : [errorMessage(e)]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t.decide}</DialogTitle>
          <DialogDescription>{t.decideHint}</DialogDescription>
        </DialogHeader>
        <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
          {options.map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={decision === d}
              onClick={() => setDecision(d)}
              className={cn(
                'rounded-tile border p-3 text-start transition-colors',
                decision === d ? (d === 'CANCEL' ? 'border-danger bg-danger/8' : 'border-ink bg-ink/5') : 'border-border bg-surface-raised hover:border-border-strong',
              )}
            >
              <div className={cn('text-sm font-medium', d === 'CANCEL' && 'text-danger')}>{LABELS.decisionType[d][locale]}</div>
              <div className="mt-0.5 text-xs text-muted">{t[`d_${d}`]}</div>
            </button>
          ))}
        </div>
        {needsDeadline && (
          <FormField label={t.newDeadline} required>
            <Input type="datetime-local" dir="ltr" className="num" value={deadline} max={toLocalInput(trip.startsAt)} onChange={(e) => setDeadline(e.target.value)} />
          </FormField>
        )}
        <FormField label={decision === 'CANCEL' ? t.reasonRequired : t.note} required={decision === 'CANCEL'}>
          <Textarea rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </FormField>
        {errors.length > 0 && <p className="text-sm text-danger">{errors.join(' ')}</p>}
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {c.cancel}
          </Button>
          <Button variant={decision === 'CANCEL' ? 'destructive' : 'primary'} onClick={save} disabled={busy || blocked}>
            {busy && <Loader2 className="animate-spin" />} {t.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CloneDialog({ trip, onClose, onDone }: { trip: TripFull; onClose: () => void; onDone: (id: string) => void }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const [startsAt, setStartsAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const copy = await api.post<{ id: string }>(`/trips/${trip.id}/clone`, { startsAt: fromLocalInput(startsAt) });
      toast.success(t.cloned);
      onDone(copy.id);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t.cloneTitle} · <span className="num ltr-nums">{trip.code}</span>
          </DialogTitle>
          <DialogDescription>{t.cloneBody}</DialogDescription>
        </DialogHeader>
        <FormField label={t.cloneStart} required error={error ?? undefined}>
          <Input type="datetime-local" dir="ltr" className="num" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </FormField>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {c.cancel}
          </Button>
          <Button onClick={save} disabled={busy || !startsAt}>
            {busy && <Loader2 className="animate-spin" />} {t.clone}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
