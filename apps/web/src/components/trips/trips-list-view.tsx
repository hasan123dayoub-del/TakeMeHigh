'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Pager } from '@/components/trips/kit/controls';
import { SeatsBar } from '@/components/trips/kit/seats';
import { Forbidden, QueryError } from '@/components/trips/kit/states';
import { StatusBadge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth';
import { useMessages } from '@/lib/i18n';
import { useTrips } from '@/lib/queries/trips';
import type { TripWhen } from '@/lib/types/trips';
import { useFormat } from '@/lib/use-format';
import { tripsMessages } from './messages';

export function TripsListView() {
  const t = useMessages(tripsMessages);
  const f = useFormat();
  const { can, scope } = useAuth();
  const allowed = can('trips.view');
  const [when, setWhen] = useState<TripWhen>('upcoming');
  const [page, setPage] = useState(1);
  const trips = useTrips({ when, page, pageSize: 12 }, allowed);
  if (!allowed) return <Forbidden />;
  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <SegmentedControl
        aria-label={t.whenLabel}
        value={when}
        onValueChange={(v) => {
          setWhen(v);
          setPage(1);
        }}
        options={[
          { value: 'upcoming', label: t.upcoming },
          { value: 'past', label: t.past },
          { value: 'all', label: t.all },
        ]}
      />
      {trips.isError ? (
        <Card>
          <QueryError error={trips.error} onRetry={() => trips.refetch()} />
        </Card>
      ) : trips.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-40 rounded-card" />
          ))}
        </div>
      ) : !trips.data?.data.length ? (
        <Card className="p-10 text-center text-sm text-muted">{t.noResultsBody}</Card>
      ) : (
        <div className="flex flex-col gap-4">
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {trips.data.data.map((trip) => (
              <li key={trip.id}>
                <Link href={`/dashboard/tours/${trip.tour.id}`} className="block rounded-card focus-visible:outline-2 focus-visible:outline-ring">
                  <Card className="grid gap-3 p-5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="ltr-nums text-sm font-medium">{trip.code}</span>
                      <span className="flex gap-1.5">
                        <StatusBadge kind="tripType" status={trip.tripType} size="sm" />
                        <StatusBadge kind="trip" status={trip.status} size="sm" />
                      </span>
                    </div>
                    <p className="line-clamp-1 text-[15px] font-medium">{trip.tour.name}</p>
                    <p className="num text-xs text-muted">
                      {f.date(trip.departureDate)} – {f.date(trip.returnDate)}
                      {scope === 'OFFICE' ? ` · ${trip.branch.name}` : ''}
                    </p>
                    <SeatsBar confirmed={trip.confirmedSeats} max={trip.maxSeats} min={trip.minPassengers} />
                    <p className="num text-sm font-medium">
                      {Number(trip.sellingPricePerPerson) > 0 ? `${f.money(trip.sellingPricePerPerson, trip.currencyCode)} ${t.perPerson}` : t.noPrice}
                    </p>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
          <Pager meta={trips.data.meta} onPage={setPage} loading={trips.isFetching} />
        </div>
      )}
    </div>
  );
}
