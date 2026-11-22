'use client';

import { Printer, Receipt, Undo2 } from 'lucide-react';
import Link from 'next/link';
import { useDeferredValue, useState } from 'react';
import { Forbidden, ListSkeleton, Ltr, Money, Pager, QueryError, SearchField } from '@/components/bookings/kit';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useAuth } from '@/lib/auth';
import { defineMessages, useMessages } from '@/lib/i18n';
import { usePayments, useRefunds } from '@/lib/queries/payments';
import { useFormat } from '@/lib/use-format';

export const pm = defineMessages({
  ar: {
    eyebrow: 'الصندوق',
    title: 'الدفعات',
    description: 'كل دفعة نقدية لها إيصال وعملة حجزها. المرتجعات مربوطة بالدفعة الأصلية ولا تُحذف أي دفعة.',
    payments: 'الدفعات',
    refunds: 'المرتجعات',
    searchPh: 'ابحث برقم الإيصال أو رقم الحجز',
    receipt: 'الإيصال',
    date: 'التاريخ',
    booking: 'الحجز',
    customer: 'الزبون',
    trip: 'الرحلة',
    amount: 'المبلغ',
    refunded: 'المسترجع',
    recordedBy: 'سجّلها',
    reason: 'السبب',
    originalReceipt: 'الإيصال الأصلي',
    print: 'طباعة',
    emptyPayments: 'لا توجد دفعات بعد',
    emptyPaymentsBody: 'تُسجَّل الدفعات من صفحة الحجز.',
    emptyRefunds: 'لا توجد مرتجعات',
    emptyRefundsBody: 'تُسجَّل المرتجعات على الدفعة الأصلية من صفحة الحجز.',
  },
  en: {
    eyebrow: 'Cash desk',
    title: 'Payments',
    description: 'Every cash payment has a receipt and its booking’s currency. Refunds are linked to the original payment; no payment is ever deleted.',
    payments: 'Payments',
    refunds: 'Refunds',
    searchPh: 'Search receipt or booking reference',
    receipt: 'Receipt',
    date: 'Date',
    booking: 'Booking',
    customer: 'Customer',
    trip: 'Trip',
    amount: 'Amount',
    refunded: 'Refunded',
    recordedBy: 'Recorded by',
    reason: 'Reason',
    originalReceipt: 'Original receipt',
    print: 'Print',
    emptyPayments: 'No payments yet',
    emptyPaymentsBody: 'Payments are recorded from the booking page.',
    emptyRefunds: 'No refunds',
    emptyRefundsBody: 'Refunds are recorded against the original payment from the booking page.',
  },
});

/** /dashboard/payments — payments and refunds within the user's branch scope. */
export function PaymentsView() {
  const t = useMessages(pm);
  const f = useFormat();
  const { can } = useAuth();
  const [tab, setTab] = useState<'payments' | 'refunds'>('payments');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const term = useDeferredValue(search.trim());
  const allowed = can('payments.view');
  const payments = usePayments({ page, pageSize: 20, search: term || undefined }, allowed && tab === 'payments');
  const refunds = useRefunds({ page, pageSize: 20 }, allowed && tab === 'refunds');

  if (!allowed) return <Forbidden />;
  const q = tab === 'payments' ? payments : refunds;

  return (
    <div className="grid gap-6">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <GlassPanel className="grid gap-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            aria-label={t.title}
            value={tab}
            onValueChange={(v) => {
              setTab(v as 'payments' | 'refunds');
              setPage(1);
            }}
            options={[
              { value: 'payments', label: t.payments },
              { value: 'refunds', label: t.refunds },
            ]}
          />
          {tab === 'payments' && (
            <SearchField
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder={t.searchPh}
              className="w-full max-w-sm"
            />
          )}
        </div>

        {q.isPending ? (
          <ListSkeleton rows={8} />
        ) : q.isError ? (
          <QueryError error={q.error} onRetry={() => void q.refetch()} />
        ) : tab === 'payments' && payments.data ? (
          payments.data.data.length === 0 ? (
            <EmptyState icon={Receipt} title={t.emptyPayments} description={t.emptyPaymentsBody} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted">
                      <Th>{t.receipt}</Th>
                      <Th>{t.date}</Th>
                      <Th>{t.booking}</Th>
                      <Th>{t.customer}</Th>
                      <Th className="hidden md:table-cell">{t.trip}</Th>
                      <Th>{t.amount}</Th>
                      <Th className="hidden lg:table-cell">{t.refunded}</Th>
                      <Th className="hidden lg:table-cell">{t.recordedBy}</Th>
                      <Th />
                    </tr>
                  </thead>
                  <tbody>
                    {payments.data.data.map((p) => (
                      <tr key={p.id} className="border-b border-border/60 last:border-0 hover:bg-surface/60">
                        <Td><Ltr className="font-mono text-xs">{p.receiptNumber}</Ltr></Td>
                        <Td className="text-muted">{f.date(p.paidAt)}</Td>
                        <Td>
                          <Link href={`/dashboard/bookings/${p.booking.id}`} className="hover:text-primary">
                            <Ltr className="font-mono text-xs">{p.booking.reference}</Ltr>
                          </Link>
                        </Td>
                        <Td>{p.booking.customer.fullName}</Td>
                        <Td className="hidden md:table-cell"><Ltr>{p.booking.trip.code}</Ltr></Td>
                        <Td><Money value={p.amount} currency={p.currencyCode} className="font-medium" /></Td>
                        <Td className="hidden lg:table-cell">
                          {Number(p.refundedAmount) > 0 ? <Money value={p.refundedAmount} currency={p.currencyCode} className="text-danger" /> : <span className="text-subtle">—</span>}
                        </Td>
                        <Td className="hidden text-muted lg:table-cell">{p.recordedBy?.user.fullName ?? '—'}</Td>
                        <Td>
                          <Button asChild variant="ghost" size="icon-sm" aria-label={t.print}>
                            <Link href={`/dashboard/payments/${p.id}/receipt`}><Printer /></Link>
                          </Button>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager {...payments.data.meta} onPageChange={setPage} loading={payments.isFetching} />
            </>
          )
        ) : refunds.data && refunds.data.data.length === 0 ? (
          <EmptyState icon={Undo2} title={t.emptyRefunds} description={t.emptyRefundsBody} />
        ) : refunds.data ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted">
                    <Th>{t.date}</Th>
                    <Th>{t.booking}</Th>
                    <Th>{t.customer}</Th>
                    <Th className="hidden md:table-cell">{t.originalReceipt}</Th>
                    <Th>{t.amount}</Th>
                    <Th className="hidden md:table-cell">{t.reason}</Th>
                    <Th className="hidden lg:table-cell">{t.recordedBy}</Th>
                  </tr>
                </thead>
                <tbody>
                  {refunds.data.data.map((r) => (
                    <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-surface/60">
                      <Td className="text-muted">{f.date(r.refundedAt)}</Td>
                      <Td>
                        <Link href={`/dashboard/bookings/${r.booking.id}`} className="hover:text-primary">
                          <Ltr className="font-mono text-xs">{r.booking.reference}</Ltr>
                        </Link>
                      </Td>
                      <Td>{r.booking.customer.fullName}</Td>
                      <Td className="hidden md:table-cell"><Ltr className="font-mono text-xs">{r.payment.receiptNumber}</Ltr></Td>
                      <Td><Money value={r.amount} currency={r.currencyCode} className="font-medium text-danger" /></Td>
                      <Td className="hidden max-w-60 truncate text-muted md:table-cell">{r.reason}</Td>
                      <Td className="hidden text-muted lg:table-cell">{r.recordedBy?.user.fullName ?? '—'}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager {...refunds.data.meta} onPageChange={setPage} loading={refunds.isFetching} />
          </>
        ) : null}
      </GlassPanel>
    </div>
  );
}

function Th({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2.5 text-start font-medium ${className}`}>{children}</th>;
}
function Td({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-3 ${className}`}>{children}</td>;
}
