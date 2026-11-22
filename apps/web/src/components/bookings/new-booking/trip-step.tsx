'use client';

import { CalendarDays, Check, MapPinned, Tag } from 'lucide-react';
import { useState } from 'react';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { fmt, useMessages } from '@/lib/i18n';
import { useOpenTrips } from '@/lib/queries/bookings';
import type { BookableTrip } from '@/lib/types/bookings';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';
import { offerLabel } from '../estimate';
import { Ltr, Money, QueryError, SearchField } from '../kit';
import { bm } from '../messages';
import { useDebounced } from '../use-debounced';

/** Seats bar: confirmed / max. */
export function SeatsMeter({ trip, className }: { trip: Pick<BookableTrip, 'confirmedSeats' | 'maxSeats'>; className?: string }) {
  const pct = trip.maxSeats ? Math.min(100, (trip.confirmedSeats / trip.maxSeats) * 100) : 0;
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken', className)} aria-hidden>
      <div className={cn('h-full rounded-full', pct >= 100 ? 'bg-danger' : pct >= 80 ? 'bg-warning' : 'bg-primary')} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function TripSummaryLine({ trip }: { trip: BookableTrip }) {
  const f = useFormat();
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
      <CalendarDays className="size-3.5" aria-hidden />
      <span className="num">
        {f.date(trip.departureDate)} – {f.date(trip.returnDate)}
      </span>
    </span>
  );
}

export function TripPicker({
  selectedId,
  onSelect,
  filter,
  excludeId,
}: {
  selectedId?: string;
  onSelect: (trip: BookableTrip) => void;
  /** e.g. same currency only (transfer) */
  filter?: (t: BookableTrip) => boolean;
  excludeId?: string;
}) {
  const t = useMessages(bm);
  const [search, setSearch] = useState('');
  const q = useOpenTrips(useDebounced(search.trim()));
  const trips = (q.data?.data ?? []).filter((x) => x.id !== excludeId && (!filter || filter(x)));

  return (
    <div className="grid gap-4">
      <SearchField value={search} onChange={setSearch} placeholder={t.tripSearch} autoFocus />
      {q.isError ? (
        <QueryError error={q.error} onRetry={() => q.refetch()} size="sm" />
      ) : q.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-40 rounded-card" />
          ))}
        </div>
      ) : trips.length === 0 ? (
        <EmptyState size="sm" icon={MapPinned} title={t.tripsEmpty} description={t.tripsEmptyBody} />
      ) : (
        <div role="radiogroup" aria-label={t.stepTrip} className={cn('grid gap-3 sm:grid-cols-2', q.isPlaceholderData && 'opacity-60')}>
          {trips.map((trip) => (
            <TripOption key={trip.id} trip={trip} selected={trip.id === selectedId} onSelect={() => onSelect(trip)} />
          ))}
        </div>
      )}
    </div>
  );
}

function TripOption({ trip, selected, onSelect }: { trip: BookableTrip; selected: boolean; onSelect: () => void }) {
  const t = useMessages(bm);
  const f = useFormat();
  const full = trip.seatsAvailable <= 0;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'group relative flex flex-col gap-3 rounded-card border bg-surface-raised p-4 text-start shadow-card transition-[border-color,box-shadow,transform] duration-200 ease-out-soft',
        'hover:-translate-y-0.5 hover:border-border-strong focus-visible:ring-4 focus-visible:ring-ring/25 focus-visible:outline-none',
        selected ? 'border-primary ring-4 ring-primary/15' : 'border-border',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Ltr className="num text-xs font-medium text-muted">{trip.code}</Ltr>
            <StatusBadge kind="tripType" status={trip.tripType} size="sm" />
          </div>
          <div className="mt-1 truncate font-medium text-foreground">{trip.tour.name}</div>
        </div>
        <span
          className={cn(
            'grid size-6 shrink-0 place-items-center rounded-full border transition-colors',
            selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border-strong text-transparent',
          )}
          aria-hidden
        >
          <Check className="size-3.5" />
        </span>
      </div>
      <TripSummaryLine trip={trip} />
      <div className="grid gap-1.5">
        <SeatsMeter trip={trip} />
        <div className="flex items-center justify-between text-xs">
          <span className={cn(full ? 'font-medium text-danger' : 'text-muted')}>
            {full ? t.seatsFull : fmt(t.seatsLeft, { n: f.number(trip.seatsAvailable) })}
          </span>
          <span className="num text-subtle">
            {f.number(trip.confirmedSeats)}/{f.number(trip.maxSeats)}
          </span>
        </div>
      </div>
      <div className="mt-auto flex flex-wrap items-end justify-between gap-2 border-t border-border pt-3">
        <div>
          <Money value={trip.sellingPricePerPerson} currency={trip.currencyCode} className="text-base font-medium" />
          <span className="ms-1 text-xs text-muted">{t.perPerson}</span>
        </div>
        {trip.activeOffer && (
          <Badge tone="primary" size="sm">
            <Tag className="size-3" aria-hidden />
            {trip.activeOffer.title} {offerLabel(trip.activeOffer, f.money, trip.currencyCode, t.perPerson)}
          </Badge>
        )}
      </div>
    </button>
  );
}
