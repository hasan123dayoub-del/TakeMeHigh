'use client';

import { LABELS, PAYMENT_KINDS } from '@travelos/shared';
import { Wallet } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { FilterSelect, ResourceTable, type ResourceColumn } from '@/components/data/resource-table';
import { StatusBadge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { useAuth } from '@/lib/auth';
import { useLookups } from '@/lib/hooks';
import { defineMessages, fmt, useLocale, useMessages } from '@/lib/i18n';
import type { Paginated, PaymentRow } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';
import { DateRange } from '../bookings/date-range';

const m = defineMessages({
  ar: {
    eyebrow: 'المالية',
    title: 'الدفعات',
    description: 'كل الوصولات النقدية والاسترجاعات. الدفعات لا تُعدَّل ولا تُحذف؛ يُصحَّح الخطأ بوصل استرجاع.',
    receiptNo: 'رقم الوصل',
    date: 'التاريخ',
    kind: 'النوع',
    payer: 'الدافع',
    booking: 'الحجز',
    target: 'على',
    amount: 'المبلغ',
    balanceAfter: 'المتبقي بعدها',
    branch: 'الفرع',
    employee: 'الموظف',
    currency: 'العملة',
    search: 'رقم الوصل أو الدافع أو رقم الحجز…',
    empty: 'لا توجد دفعات',
    emptyBody: 'تُسجَّل الدفعات من صفحة الحجز.',
    net: 'الصافي {c}',
    received: 'مقبوض {v}',
    refunded: 'مسترجع {v}',
  },
  en: {
    eyebrow: 'Finance',
    title: 'Payments',
    description: 'Every cash receipt and refund. Payments are never edited or deleted; mistakes are corrected with a refund receipt.',
    receiptNo: 'Receipt no.',
    date: 'Date',
    kind: 'Kind',
    payer: 'Payer',
    booking: 'Booking',
    target: 'For',
    amount: 'Amount',
    balanceAfter: 'Balance after',
    branch: 'Branch',
    employee: 'Employee',
    currency: 'Currency',
    search: 'Receipt no., payer or booking no.…',
    empty: 'No payments',
    emptyBody: 'Payments are recorded from the booking page.',
    net: 'Net {c}',
    received: 'Received {v}',
    refunded: 'Refunded {v}',
  },
});

type Totals = Record<string, { received: string; refunded: string; net: string }>;
type PaymentsPage = Paginated<PaymentRow> & { totals?: Totals };

export function PaymentsView() {
  const t = useMessages(m);
  const { locale } = useLocale();
  const f = useFormat();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const lookups = useLookups();

  const columns = useMemo<ResourceColumn<PaymentRow>[]>(
    () => [
      { id: 'receiptNo', header: t.receiptNo, sortKey: 'receiptNo', cell: (p) => <span className="num font-medium whitespace-nowrap">{p.receiptNo}</span> },
      { id: 'date', header: t.date, sortKey: 'paidAt', cell: (p) => <span className="num whitespace-nowrap">{f.date(p.paidAt, 'dateTime')}</span> },
      { id: 'kind', header: t.kind, cell: (p) => <StatusBadge kind="paymentKind" status={p.kind} />, print: (p) => LABELS.paymentKind[p.kind][locale] },
      { id: 'payer', header: t.payer, cell: (p) => p.payerName },
      {
        id: 'booking',
        header: t.booking,
        cell: (p) => (
          <div className="flex flex-col">
            <Link href={`/dashboard/bookings/${p.booking.id}`} onClick={(e) => e.stopPropagation()} className="num text-primary hover:underline">
              {p.booking.bookingNo}
            </Link>
            <span className="line-clamp-1 max-w-[200px] text-xs text-muted">{p.booking.trip?.title ?? p.booking.program?.title ?? p.booking.offer?.title}</span>
          </div>
        ),
        print: (p) => p.booking.bookingNo,
      },
      {
        id: 'amount',
        header: t.amount,
        sortKey: 'amount',
        align: 'end',
        cell: (p) => (
          <span className={cn('num font-medium whitespace-nowrap', p.kind === 'REFUND' && 'text-danger')}>
            {p.kind === 'REFUND' ? '− ' : ''}
            {f.money(p.amount, p.currencyCode)}
          </span>
        ),
      },
      { id: 'balanceAfter', header: t.balanceAfter, align: 'end', cell: (p) => <span className="num whitespace-nowrap text-muted">{f.money(p.balanceAfter, p.currencyCode)}</span> },
      { id: 'branch', header: t.branch, cell: (p) => <span className="text-muted">{p.branch.name}</span> },
      { id: 'employee', header: t.employee, cell: (p) => <span className="text-muted">{p.receivedBy.fullName}</span> },
    ],
    [t, f, locale],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <ResourceTable<PaymentRow>
        endpoint="/payments"
        columns={columns}
        exportTitle={t.title}
        searchPlaceholder={t.search}
        filterKeys={['kind', 'branchId', 'currencyCode', 'from', 'to']}
        defaultSort={{ key: 'paidAt', order: 'desc' }}
        minWidth={1100}
        filters={(fl, set) => (
          <>
            <FilterSelect label={t.kind} value={fl.kind} onChange={(v) => set({ kind: v })} options={PAYMENT_KINDS.map((k) => ({ value: k, label: LABELS.paymentKind[k][locale] }))} />
            <FilterSelect
              label={t.currency}
              value={fl.currencyCode}
              onChange={(v) => set({ currencyCode: v })}
              options={(lookups.data?.currencies ?? []).map((c) => ({ value: c.code, label: c.code }))}
            />
            {isAdmin && (
              <FilterSelect
                label={t.branch}
                value={fl.branchId}
                onChange={(v) => set({ branchId: v })}
                options={(lookups.data?.branches ?? []).map((b) => ({ value: b.id, label: b.name }))}
              />
            )}
            <DateRange from={fl.from} to={fl.to} onChange={(p) => set(p)} />
          </>
        )}
        summary={(page) => {
          const totals = (page as PaymentsPage | undefined)?.totals;
          if (!totals || !Object.keys(totals).length) return null;
          return (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Object.entries(totals).map(([cur, v], i) => (
                <StatCard
                  key={cur}
                  featured={i === 0}
                  icon={Wallet}
                  label={fmt(t.net, { c: cur })}
                  value={f.money(v.net, cur)}
                  note={`${fmt(t.received, { v: f.money(v.received, cur) })} · ${fmt(t.refunded, { v: f.money(v.refunded, cur) })}`}
                  className={cn('min-h-0 gap-4', i !== 0 && 'border-border bg-surface-raised')}
                />
              ))}
            </div>
          );
        }}
        onRowClick={(p) => router.push(`/dashboard/payments/${p.id}/receipt`)}
        getRowId={(p) => p.id}
        empty={{ title: t.empty, description: t.emptyBody }}
      />
    </div>
  );
}
