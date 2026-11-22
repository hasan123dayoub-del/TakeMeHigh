'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LABELS, useLocale, useMessages } from '@/lib/i18n';
import { useBooking, useOfficeProfile } from '@/lib/queries/bookings';
import { useFormat } from '@/lib/use-format';
import { DetailSkeleton, Ltr, MoneyRow, QueryError } from '../kit';
import { bm } from '../messages';

const PRINT_CSS =
  '@media print { body * { visibility: hidden; } .booking-print, .booking-print * { visibility: visible; } .booking-print { position: absolute; inset: 0; max-width: none; box-shadow: none; } .no-print { display: none !important; } @page { size: A4; margin: 14mm; } }';

/** Printable A4 booking confirmation. */
export function BookingPrint({ id }: { id: string }) {
  const t = useMessages(bm);
  const f = useFormat();
  const { locale } = useLocale();
  const q = useBooking(id);
  const office = useOfficeProfile();
  if (q.isError) return <QueryError error={q.error} onRetry={() => q.refetch()} />;
  if (q.isPending) return <DetailSkeleton />;
  const b = q.data;
  return (
    <div className="booking-print mx-auto grid w-full max-w-[210mm] gap-6 rounded-card bg-surface-raised p-8 text-foreground">
      <style>{PRINT_CSS}</style>
      <div className="no-print flex justify-end">
        <Button onClick={() => window.print()}>
          <Printer /> {t.printBtn}
        </Button>
      </div>
      <header className="flex flex-wrap justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="text-xl font-medium">{office.data?.name}</div>
          <div className="text-sm text-muted">{office.data?.address}</div>
          {office.data?.phone && <Ltr className="num text-sm text-muted">{office.data.phone}</Ltr>}
        </div>
        <div className="text-end">
          <div className="text-lg">{t.printTitle}</div>
          <Ltr className="num font-medium">{b.reference}</Ltr>
          <div className="text-sm text-muted">{LABELS.bookingStatus[b.status][locale]}</div>
        </div>
      </header>
      <section className="text-sm">
        <div className="font-medium">
          <Ltr className="num">{b.trip.code}</Ltr> · {b.trip.tour.name}
        </div>
        <div className="text-muted">
          {f.date(b.trip.departureDate)} – {f.date(b.trip.returnDate)} · {b.customer.fullName} · <Ltr className="num">{b.customer.phone}</Ltr>
        </div>
      </section>
      <section className="grid gap-1 text-sm">
        <div className="font-medium">{t.passengers}</div>
        {b.passengers.map((p, i) => (
          <div key={p.id} className="flex justify-between border-t border-border py-1">
            <span>
              {i + 1}. {p.fullName}
            </span>
            <span className="text-muted">
              {LABELS.documentType[p.documentType][locale]} <Ltr className="num">{p.documentNumber ?? ''}</Ltr>
            </span>
          </div>
        ))}
      </section>
      <section className="grid gap-0.5">
        <MoneyRow label={t.subtotal} value={b.subtotal} currency={b.currencyCode} />
        {Number(b.discountAmount) > 0 && <MoneyRow label={t.discount} value={`-${b.discountAmount}`} currency={b.currencyCode} />}
        <MoneyRow label={t.total} value={b.totalAmount} currency={b.currencyCode} strong />
        <MoneyRow label={t.paid} value={b.paidAmount} currency={b.currencyCode} />
        <MoneyRow label={t.balance} value={b.balance} currency={b.currencyCode} strong />
      </section>
      {(office.data?.bookingTerms || office.data?.cancellationTerms) && (
        <section className="grid gap-1 text-xs text-muted">
          <div className="font-medium text-foreground">{t.printTerms}</div>
          <p>{office.data?.bookingTerms}</p>
          <p>{office.data?.cancellationTerms}</p>
        </section>
      )}
    </div>
  );
}
