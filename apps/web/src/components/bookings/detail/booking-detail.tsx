'use client';

import { ArrowLeft, Printer } from 'lucide-react';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/lib/auth';
import { fmt, LABELS, useLocale, useMessages } from '@/lib/i18n';
import { useBooking } from '@/lib/queries/bookings';
import { useFormat } from '@/lib/use-format';
import { ContactActions, DetailSkeleton, Forbidden, Ltr, Money, MoneyRow, QueryError, SectionTitle } from '../kit';
import { bm } from '../messages';

/** Booking detail (read view). Actions (confirm, cancel, transfer, pay, refund) are not wired yet. */
export function BookingDetailView({ id }: { id: string }) {
  const { can } = useAuth();
  const t = useMessages(bm);
  const f = useFormat();
  const { locale } = useLocale();
  const q = useBooking(id);
  if (!can('bookings.view')) return <Forbidden />;
  if (q.isError) return <QueryError error={q.error} onRetry={() => q.refetch()} />;
  if (q.isPending) return <DetailSkeleton />;
  const b = q.data;
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={`${b.branch.name}${b.createdBy ? ` · ${fmt(t.createdBy, { name: b.createdBy.user.fullName })}` : ''}`}
        title={<Ltr>{b.reference}</Ltr>}
        description={<StatusBadge kind="booking" status={b.status} />}
        actions={
          <>
            <Button asChild variant="ghost">
              <Link href="/dashboard/bookings">
                <ArrowLeft className="rtl-flip" /> {t.title}
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/dashboard/bookings/${b.id}/print`} target="_blank">
                <Printer /> {t.print}
              </Link>
            </Button>
          </>
        }
      />
      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="grid gap-2 p-5">
          <SectionTitle>{t.tripCard}</SectionTitle>
          <Link href={`/dashboard/trips/${b.trip.id}`} className="font-medium hover:text-primary">
            <Ltr className="num">{b.trip.code}</Ltr> · {b.trip.tour.name}
          </Link>
          <p className="text-sm text-muted">
            {f.date(b.trip.departureDate)} – {f.date(b.trip.returnDate)} · {LABELS.tripType[b.trip.tripType][locale]}
          </p>
        </Card>
        <Card className="grid gap-2 p-5">
          <SectionTitle>{t.customerCard}</SectionTitle>
          <Link href={`/dashboard/customers/${b.customer.id}`} className="font-medium hover:text-primary">
            {b.customer.fullName}
          </Link>
          <Ltr className="num text-sm text-muted">{b.customer.phone}</Ltr>
          <ContactActions phone={b.customer.phone} size="xs" />
        </Card>
        <Card className="grid gap-0.5 p-5">
          <SectionTitle>{t.moneyCard}</SectionTitle>
          <MoneyRow label={t.total} value={b.totalAmount} currency={b.currencyCode} strong />
          <MoneyRow label={t.paid} value={b.paidAmount} currency={b.currencyCode} tone="muted" />
          <MoneyRow label={t.refunded} value={b.refundedAmount} currency={b.currencyCode} tone="muted" />
          <MoneyRow label={t.balance} value={b.balance} currency={b.currencyCode} tone={Number(b.balance) > 0 ? 'danger' : undefined} strong />
        </Card>
      </div>
      <Card className="grid gap-3 p-5">
        <SectionTitle>{t.passengersTitle}</SectionTitle>
        <ol className="grid gap-2 text-sm">
          {b.passengers.map((p, i) => (
            <li key={p.id} className="flex flex-wrap justify-between gap-2 border-t border-border pt-2 first:border-0 first:pt-0">
              <span className="font-medium">
                {i + 1}. {p.fullName}
              </span>
              <span className="text-muted">
                {LABELS.documentType[p.documentType][locale]} {p.documentNumber && <Ltr className="num">{p.documentNumber}</Ltr>}
              </span>
            </li>
          ))}
        </ol>
      </Card>
      <Card className="grid gap-3 p-5">
        <SectionTitle>{t.paymentsTitle}</SectionTitle>
        {b.payments.length === 0 ? (
          <p className="text-sm text-muted">{t.noPayments}</p>
        ) : (
          <ul className="grid gap-2 text-sm">
            {b.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/dashboard/payments/${p.id}/receipt`} className="hover:text-primary">
                  <Ltr className="num">{p.receiptNumber}</Ltr> · {f.date(p.paidAt)}
                </Link>
                <Money value={p.amount} currency={p.currencyCode} className="font-medium" />
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card className="grid gap-2 p-5">
        <SectionTitle>{t.externalTitle}</SectionTitle>
        {b.externalReservations.length === 0 ? (
          <p className="text-sm text-muted">{t.externalEmpty}</p>
        ) : (
          b.externalReservations.map((r) => (
            <p key={r.id} className="text-sm">
              {r.tripService?.serviceType ?? r.kind} · {r.status}
            </p>
          ))
        )}
      </Card>
    </div>
  );
}
