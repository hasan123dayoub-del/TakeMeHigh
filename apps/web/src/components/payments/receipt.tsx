'use client';

import { ArrowLeft, Printer } from 'lucide-react';
import Link from 'next/link';
import { DetailSkeleton, Forbidden, Ltr, Money, QueryError } from '@/components/bookings/kit';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { common } from '@/lib/i18n/common';
import { defineMessages, useMessages } from '@/lib/i18n';
import { useReceipt } from '@/lib/queries/payments';
import { useFormat } from '@/lib/use-format';

const m = defineMessages({
  ar: {
    title: 'إيصال قبض نقدي',
    receiptNo: 'رقم الإيصال',
    date: 'التاريخ',
    branch: 'الفرع',
    receivedFrom: 'استلمنا من',
    phone: 'الهاتف',
    forBooking: 'عن الحجز',
    trip: 'الرحلة',
    departure: 'الانطلاق',
    amount: 'المبلغ المستلم',
    method: 'طريقة الدفع',
    cash: 'نقداً',
    bookingTotal: 'إجمالي الحجز',
    paidToDate: 'المدفوع حتى الآن',
    balance: 'المتبقي',
    refunds: 'مرتجعات على هذه الدفعة',
    notes: 'ملاحظات',
    recordedBy: 'المستلم',
    signature: 'التوقيع والختم',
    back: 'رجوع',
    print: 'طباعة / حفظ PDF',
  },
  en: {
    title: 'Cash receipt',
    receiptNo: 'Receipt no.',
    date: 'Date',
    branch: 'Branch',
    receivedFrom: 'Received from',
    phone: 'Phone',
    forBooking: 'For booking',
    trip: 'Trip',
    departure: 'Departure',
    amount: 'Amount received',
    method: 'Method',
    cash: 'Cash',
    bookingTotal: 'Booking total',
    paidToDate: 'Paid to date',
    balance: 'Balance',
    refunds: 'Refunds on this payment',
    notes: 'Notes',
    recordedBy: 'Received by',
    signature: 'Signature & stamp',
    back: 'Back',
    print: 'Print / Save PDF',
  },
});

/** Print-ready A5-style cash receipt (Arabic RTL prints correctly via the browser). */
export function PaymentReceiptView({ id }: { id: string }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const f = useFormat();
  const { can } = useAuth();
  const q = useReceipt(id);

  if (!can('payments.view')) return <Forbidden />;
  if (q.isPending) return <DetailSkeleton />;
  if (q.isError) return <QueryError error={q.error} onRetry={() => void q.refetch()} />;
  const r = q.data;
  const cur = r.currencyCode;
  const balance = Math.max(0, Number(r.booking.totalAmount) - Number(r.booking.paidAmount));

  return (
    <div className="receipt-print grid gap-4">
      <style>{`@media print {
        body * { visibility: hidden !important; }
        .receipt-print, .receipt-print * { visibility: visible !important; }
        .receipt-print { position: absolute; inset: 0; padding: 0; }
        .receipt-actions { display: none !important; }
        .receipt-sheet { box-shadow: none !important; border: 1px solid #999 !important; }
        @page { size: A5; margin: 10mm; }
      }`}</style>
      <div className="receipt-actions flex flex-wrap gap-2">
        <Button asChild variant="secondary">
          <Link href={`/dashboard/bookings/${r.bookingId}`}>
            <ArrowLeft className="rtl-flip" /> {t.back}
          </Link>
        </Button>
        <Button onClick={() => window.print()}>
          <Printer /> {t.print}
        </Button>
      </div>

      <article className="receipt-sheet mx-auto w-full max-w-2xl rounded-card border border-border bg-white p-8 text-[#111418] shadow-glass">
        <header className="flex items-start justify-between gap-4 border-b border-[#d8dee6] pb-4">
          <div>
            <p className="text-lg font-semibold">{r.office.name}</p>
            <p className="text-xs text-[#5a6878]">{[r.office.address, r.office.phone].filter(Boolean).join(' · ')}</p>
            <p className="text-xs text-[#5a6878]">{t.branch}: {r.branch.name}</p>
          </div>
          <div className="text-end">
            <p className="text-base font-semibold">{t.title}</p>
            <p className="text-xs text-[#5a6878]">{t.receiptNo}</p>
            <Ltr className="font-mono text-sm font-semibold">{r.receiptNumber}</Ltr>
            <p className="mt-1 text-xs text-[#5a6878]">{t.date}: {f.date(r.paidAt, 'dateTime')}</p>
          </div>
        </header>

        <dl className="grid gap-2 py-5 text-sm">
          <Item label={t.receivedFrom} value={r.booking.customer.fullName} />
          <Item label={t.phone} value={<Ltr>{r.booking.customer.phone}</Ltr>} />
          <Item label={t.forBooking} value={<Ltr className="font-mono">{r.booking.reference}</Ltr>} />
          <Item label={t.trip} value={`${r.booking.trip.code} · ${r.booking.trip.tour.name}`} />
          <Item label={t.departure} value={f.date(r.booking.trip.departureDate)} />
          <Item label={t.method} value={t.cash} />
        </dl>

        <div className="rounded-tile bg-[#f2f8fd] p-4 text-center">
          <p className="text-xs text-[#5a6878]">{t.amount}</p>
          <Money value={r.amount} currency={cur} className="text-3xl font-semibold" />
        </div>

        <dl className="grid gap-1.5 py-5 text-sm">
          <Item label={t.bookingTotal} value={<Money value={r.booking.totalAmount} currency={cur} />} />
          <Item label={t.paidToDate} value={<Money value={r.booking.paidAmount} currency={cur} />} />
          <Item label={t.balance} value={<Money value={balance} currency={cur} className="font-semibold" />} />
        </dl>

        {r.refunds.length > 0 && (
          <div className="border-t border-[#d8dee6] py-4 text-sm">
            <p className="mb-2 font-medium">{t.refunds}</p>
            {r.refunds.map((x) => (
              <p key={x.id} className="flex justify-between gap-3 text-[#5a6878]">
                <span>{f.date(x.refundedAt)} · {x.reason}</span>
                <Money value={x.amount} currency={x.currencyCode} />
              </p>
            ))}
          </div>
        )}
        {r.notes && <p className="border-t border-[#d8dee6] py-3 text-sm"><span className="text-[#5a6878]">{t.notes}: </span>{r.notes}</p>}

        <footer className="mt-6 grid grid-cols-2 gap-6 border-t border-[#d8dee6] pt-4 text-xs text-[#5a6878]">
          <p>{t.recordedBy}: <span className="text-[#111418]">{r.recordedBy?.user.fullName ?? '—'}</span></p>
          <p className="text-end">{t.signature}: ____________</p>
        </footer>
      </article>
      <p className="receipt-actions text-center text-xs text-subtle">{c.appName}</p>
    </div>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-[#e3e8ee] pb-1.5 last:border-0">
      <dt className="text-[#5a6878]">{label}</dt>
      <dd className="text-end font-medium">{value}</dd>
    </div>
  );
}
