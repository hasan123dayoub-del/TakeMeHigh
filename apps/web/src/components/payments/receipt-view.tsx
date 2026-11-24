'use client';

import { ArrowRight, Loader2, Printer } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { PrintPortal } from '@/components/data/print';
import { QueryState } from '@/components/data/states';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { api, errorMessage } from '@/lib/api';
import { useInvalidate, useResource } from '@/lib/hooks';
import { defineMessages, fmt, LABELS, useLocale, useMessages } from '@/lib/i18n';
import type { Receipt } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';

const m = defineMessages({
  ar: {
    eyebrow: 'المالية',
    back: 'العودة إلى الحجز {no}',
    receipt: 'وصل استلام',
    refundReceipt: 'وصل استرجاع',
    receiptNo: 'رقم الوصل',
    date: 'التاريخ',
    received: 'استلمنا من السيد/السيدة',
    refundedTo: 'أعدنا إلى السيد/السيدة',
    type: 'نوع الدفعة',
    amount: 'المبلغ',
    method: 'طريقة الدفع',
    booking: 'رقم الحجز',
    target: 'عن',
    total: 'إجمالي الحجز',
    netPaid: 'المدفوع حتى الآن',
    remaining: 'المتبقي بعد هذه الدفعة',
    refundOf: 'استرجاع من الوصل',
    reason: 'سبب الاسترجاع',
    notes: 'ملاحظات',
    employee: 'الموظف',
    branch: 'الفرع',
    sigPayer: 'توقيع المستلم منه',
    sigRefund: 'توقيع المستلم',
    sigEmployee: 'توقيع الموظف وختم المكتب',
    copy: 'نسخة',
    print: 'طباعة / حفظ PDF',
    printed: 'طُبع {n} مرة — الطباعة التالية تحمل علامة «نسخة»',
    original: 'لم يُطبع بعد — أول طباعة هي الأصل',
    footer: 'هذا الوصل صادر عن نظام المكتب ولا يُعدّل. أي تصحيح يتم بوصل استرجاع مرتبط به.',
  },
  en: {
    eyebrow: 'Finance',
    back: 'Back to booking {no}',
    receipt: 'Payment receipt',
    refundReceipt: 'Refund receipt',
    receiptNo: 'Receipt no.',
    date: 'Date',
    received: 'Received from',
    refundedTo: 'Refunded to',
    type: 'Payment type',
    amount: 'Amount',
    method: 'Method',
    booking: 'Booking no.',
    target: 'For',
    total: 'Booking total',
    netPaid: 'Paid so far',
    remaining: 'Balance after this payment',
    refundOf: 'Refund of receipt',
    reason: 'Refund reason',
    notes: 'Notes',
    employee: 'Employee',
    branch: 'Branch',
    sigPayer: 'Payer signature',
    sigRefund: 'Recipient signature',
    sigEmployee: 'Employee signature and office stamp',
    copy: 'COPY',
    print: 'Print / Save PDF',
    printed: 'Printed {n} time(s) — the next print is marked “copy”',
    original: 'Not printed yet — the first print is the original',
    footer: 'Issued by the office system; receipts are never edited. Corrections are made with a linked refund receipt.',
  },
});

export function ReceiptView({ id }: { id: string }) {
  const t = useMessages(m);
  const q = useResource<Receipt>(`/payments/${id}/receipt`);
  const invalidate = useInvalidate();
  const [printing, setPrinting] = useState<{ copy: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const r = q.data;

  const print = async () => {
    setBusy(true);
    try {
      // PAY-08: register the print first; every print after the first is a copy
      const res = await api.post<{ copy: boolean; printNumber: number }>(`/payments/${id}/printed`);
      setPrinting({ copy: res.copy });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const done = useCallback(() => {
    setPrinting(null);
    void invalidate(`/payments/${id}`);
  }, [invalidate, id]);

  return (
    <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()}>
      {r && (
        <div className="flex flex-col gap-6">
          <div>
            <Link href={`/dashboard/bookings/${r.booking.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
              <ArrowRight className="size-4 rtl-flip" aria-hidden /> {fmt(t.back, { no: r.booking.bookingNo })}
            </Link>
          </div>
          <PageHeader
            eyebrow={t.eyebrow}
            title={
              <span>
                {r.kind === 'REFUND' ? t.refundReceipt : t.receipt} <span className="num">{r.receiptNo}</span>
              </span>
            }
            description={
              <span className="flex flex-wrap items-center gap-2">
                <StatusBadge kind="paymentKind" status={r.kind} />
                <span>{r.printCount > 0 ? fmt(t.printed, { n: r.printCount }) : t.original}</span>
              </span>
            }
            actions={
              <Button onClick={print} disabled={busy || !!printing}>
                {busy ? <Loader2 className="animate-spin" /> : <Printer />} {t.print}
              </Button>
            }
          />
          <div className="overflow-x-auto pb-4">
            <div className="mx-auto w-[148mm] max-w-full rounded-card bg-white text-neutral-900 shadow-pop ring-1 ring-black/5">
              <ReceiptDocument r={r} copy={r.printCount > 0} />
            </div>
          </div>
          {printing && (
            <PrintPortal onDone={done}>
              <style>{'@page { size: A5; margin: 8mm; }'}</style>
              <ReceiptDocument r={r} copy={printing.copy} print />
            </PrintPortal>
          )}
        </div>
      )}
    </QueryState>
  );
}

/** PAY-04: everything the paper receipt shows. Rendered on screen and in the print portal. */
function ReceiptDocument({ r, copy, print }: { r: Receipt; copy: boolean; print?: boolean }) {
  const t = useMessages(m);
  const f = useFormat();
  const { locale } = useLocale();
  const refund = r.kind === 'REFUND';
  const office = r.office;
  const officeName = (locale === 'en' && office?.officeNameEn) || office?.officeName || 'TakeMeHigh';

  return (
    <article className={cn('relative overflow-hidden', print ? 'print-only-a5 p-0' : 'p-8')} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      {copy && (
        <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="-rotate-[24deg] rounded-xl border-4 border-red-500/40 px-8 py-2 text-7xl font-bold tracking-widest text-red-500/25">{t.copy}</span>
        </div>
      )}
      <header className="flex items-start justify-between gap-4 border-b-2 border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          {office?.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={office.logoUrl} alt="" className="size-14 rounded-lg object-contain" />
          )}
          <div>
            <div className="text-lg font-bold">{officeName}</div>
            {office?.address && <div className="text-xs text-neutral-600">{office.address}</div>}
            {office?.phone && (
              <div className="ltr-nums text-xs text-neutral-600" dir="ltr">
                {office.phone}
              </div>
            )}
          </div>
        </div>
        <div className="text-end">
          <div className={cn('text-xl font-bold', refund ? 'text-red-700' : 'text-sky-800')}>{refund ? t.refundReceipt : t.receipt}</div>
          <div className="mt-1 text-xs text-neutral-600">{t.receiptNo}</div>
          <div className="num text-base font-semibold" dir="ltr">
            {r.receiptNo}
          </div>
        </div>
      </header>

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <Row label={t.date}>
          <span className="num">{f.date(r.paidAt, 'dateTime')}</span>
        </Row>
        <Row label={t.type}>{LABELS.paymentKind[r.kind][locale]}</Row>
        <Row label={refund ? t.refundedTo : t.received} wide>
          <span className="text-base font-semibold">{r.payerName}</span>
        </Row>
      </dl>

      <div className={cn('my-5 rounded-xl border-2 p-4 text-center', refund ? 'border-red-300' : 'border-sky-300')}>
        <div className="text-xs text-neutral-600">{t.amount}</div>
        <div className="num mt-1 text-3xl font-bold">
          {refund ? '− ' : ''}
          {f.money(r.amount, r.currencyCode)}
        </div>
        <div className="mt-1 text-xs text-neutral-600">
          {t.method}: {LABELS.paymentMethod[r.method][locale]}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <Row label={t.booking}>
          <span className="num">{r.booking.bookingNo}</span>
        </Row>
        <Row label={t.branch}>{r.branch.name}</Row>
        <Row label={t.target} wide>
          {r.target}
        </Row>
        {r.refundOf && (
          <Row label={t.refundOf}>
            <span className="num">{r.refundOf.receiptNo}</span>
          </Row>
        )}
        {r.reason && (
          <Row label={t.reason} wide>
            {r.reason}
          </Row>
        )}
        {r.notes && (
          <Row label={t.notes} wide>
            {r.notes}
          </Row>
        )}
        <Row label={t.total}>
          <span className="num">{f.money(r.bookingTotals.total, r.currencyCode)}</span>
        </Row>
        <Row label={t.remaining}>
          <span className="num font-semibold">{f.money(r.balanceAfter, r.currencyCode)}</span>
        </Row>
        <Row label={t.employee}>{r.receivedBy.fullName}</Row>
      </dl>

      <div className="mt-10 grid grid-cols-2 gap-8 text-center text-xs text-neutral-600">
        <div>
          <div className="h-12 border-b border-dashed border-neutral-400" />
          <div className="mt-1.5">{refund ? t.sigRefund : t.sigPayer}</div>
        </div>
        <div>
          <div className="h-12 border-b border-dashed border-neutral-400" />
          <div className="mt-1.5">{t.sigEmployee}</div>
        </div>
      </div>
      <p className="mt-6 border-t border-neutral-200 pt-3 text-center text-[10px] text-neutral-500">{t.footer}</p>
    </article>
  );
}

function Row({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-2' : undefined}>
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="mt-0.5 font-medium">{children}</dd>
    </div>
  );
}
