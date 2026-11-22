'use client';

import { ArrowLeft, CalendarPlus, FileText, Pencil, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ContactActions, DetailSkeleton, Forbidden, Ltr, Money, QueryError, SectionTitle } from '@/components/bookings/kit';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { common } from '@/lib/i18n/common';
import { fmt, useMessages } from '@/lib/i18n';
import { useCustomer } from '@/lib/queries/customers';
import { useFormat } from '@/lib/use-format';
import { CustomerForm } from './customer-form';
import { cm } from './messages';

/** /dashboard/customers/[id] — profile, account statement per currency, bookings. */
export function CustomerDetailView({ id }: { id: string }) {
  const t = useMessages(cm);
  const c = useMessages(common);
  const f = useFormat();
  const { can, scope } = useAuth();
  const [editing, setEditing] = useState(false);
  const q = useCustomer(id);

  if (!can('customers.view')) return <Forbidden />;
  if (q.isPending) return <DetailSkeleton />;
  if (q.isError) {
    if (q.error instanceof ApiError && q.error.isNotFound) {
      return <EmptyState icon={UserRound} title={t.notFound} action={<Button asChild variant="secondary"><Link href="/dashboard/customers"><ArrowLeft className="rtl-flip" /> {c.back}</Link></Button>} />;
    }
    return <QueryError error={q.error} onRetry={() => void q.refetch()} />;
  }
  const cu = q.data;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={t.eyebrow}
        title={cu.fullName}
        description={fmt(t.since, { d: f.date(cu.createdAt) })}
        actions={
          <div className="flex flex-wrap gap-2">
            {can('bookings.create') && (
              <Button asChild>
                <Link href={`/dashboard/bookings/new?customerId=${cu.id}`}>
                  <CalendarPlus /> {t.newBooking}
                </Link>
              </Button>
            )}
            {can('customers.edit') && (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil /> {c.edit}
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <GlassPanel className="grid content-start gap-4 p-5">
          <SectionTitle>{t.profile}</SectionTitle>
          <dl className="grid gap-3 text-sm">
            <Row label={t.phone} value={<Ltr>{cu.phone}</Ltr>} />
            <Row label={t.nationalId} value={<Ltr>{cu.nationalId ?? '—'}</Ltr>} />
            <Row label={t.passport} value={<Ltr>{cu.passportNumber ?? '—'}</Ltr>} />
            <Row label={t.dob} value={cu.dateOfBirth ? f.date(cu.dateOfBirth) : '—'} />
            <Row label={t.address} value={cu.address ?? '—'} />
            {cu.notes && <Row label={t.notes} value={<span className="whitespace-pre-line">{cu.notes}</span>} />}
          </dl>
          <div>
            <p className="mb-2 text-xs text-muted">{t.contact}</p>
            <ContactActions phone={cu.phone} />
          </div>
        </GlassPanel>

        <GlassPanel className="grid content-start gap-4 p-5">
          <SectionTitle
            aside={
              can('reports.view') && (
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/dashboard/reports?type=customer-statement&customerId=${cu.id}`}>
                    <FileText /> {t.fullStatement}
                  </Link>
                </Button>
              )
            }
          >
            {t.statement}
          </SectionTitle>
          <p className="text-xs text-muted">{t.statementHint}</p>
          {cu.statement.length === 0 ? (
            <p className="py-6 text-center text-sm text-subtle">{t.noStatement}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {cu.statement.map((s) => (
                <div key={s.currencyCode} className="rounded-tile border border-border bg-surface-raised p-4">
                  <p className="mb-2 text-xs font-semibold text-muted">{s.currencyCode}</p>
                  <dl className="grid gap-1.5 text-sm">
                    <Line label={t.totalBooked} value={<Money value={s.totalBooked} currency={s.currencyCode} />} />
                    <Line label={t.netPaid} value={<Money value={s.netPaid} currency={s.currencyCode} className="text-success" />} />
                    <Line label={t.refunded} value={<Money value={s.refunded} currency={s.currencyCode} className="text-muted" />} />
                    <Line label={t.outstanding} value={<Money value={s.outstanding} currency={s.currencyCode} className={Number(s.outstanding) > 0 ? 'font-semibold text-danger' : ''} />} />
                  </dl>
                </div>
              ))}
            </div>
          )}
        </GlassPanel>
      </div>

      <GlassPanel className="grid gap-4 p-5">
        <SectionTitle aside={scope === 'BRANCH' && <span className="text-xs text-muted">{t.branchScoped}</span>}>{t.bookings}</SectionTitle>
        {cu.bookings.length === 0 ? (
          <EmptyState size="sm" icon={CalendarPlus} title={t.noBookings} description={t.noBookingsBody} />
        ) : (
          <ul className="divide-y divide-border/70">
            {cu.bookings.map((b) => (
              <li key={b.id}>
                <Link href={`/dashboard/bookings/${b.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-tile px-2 py-3 transition-colors hover:bg-surface/60">
                  <Ltr className="font-mono text-xs text-muted">{b.reference}</Ltr>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {b.trip.code} · {b.trip.tour.name}
                  </span>
                  <span className="text-xs text-muted">{f.date(b.trip.departureDate)}</span>
                  <StatusBadge kind="tripType" status={b.trip.tripType} size="sm" />
                  <StatusBadge kind="booking" status={b.status} size="sm" />
                  <span className="text-xs text-muted">{fmt(t.pax, { n: b.passengerCount })}</span>
                  <Money value={b.totalAmount} currency={b.currencyCode} className="text-sm font-medium" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t.editCustomer}</DialogTitle>
          </DialogHeader>
          <CustomerForm customer={cu} onSaved={() => setEditing(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3">
      <dt className="text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
