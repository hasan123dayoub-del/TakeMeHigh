'use client';

import { ChevronRight, MapPin, Plane, Users } from 'lucide-react';
import Link from 'next/link';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { fmt, useLocale, useMessages } from '@/lib/i18n';
import type { DashboardTrip } from '@/lib/types/dashboard';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';
import { dashboardMessages } from './messages';

export const TEXT_SUCCESS = 'text-[color-mix(in_srgb,var(--success)_78%,var(--text))]';
export const TEXT_WARNING = 'text-[color-mix(in_srgb,var(--warning)_78%,var(--text))]';

/** Seat bar: confirmed/max with a tick at the minimum. Fill colour tells whether the minimum is reached. */
export function SeatBar({
  confirmed,
  max,
  min,
  className,
}: {
  confirmed: number;
  max: number;
  min: number;
  className?: string;
}) {
  const t = useMessages(dashboardMessages);
  const pct = max > 0 ? Math.min(100, (confirmed / max) * 100) : 0;
  const minPct = max > 0 ? Math.min(100, (min / max) * 100) : 0;
  const reached = confirmed >= min;
  const full = confirmed >= max;
  return (
    <div className={cn('relative', className)}>
      <div
        className="h-2 overflow-hidden rounded-full bg-accent-soft"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={confirmed}
        aria-label={fmt(t.seats, { confirmed, max })}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-700 ease-out-soft',
            full ? 'bg-success' : reached ? 'bg-primary' : 'bg-warning',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {min > 0 && min < max && (
        <span
          aria-hidden
          title={fmt(t.minMarker, { n: min })}
          className="absolute -top-1 h-4 w-0.5 rounded-full bg-ink/70"
          style={{ insetInlineStart: `calc(${minPct}% - 1px)` }}
        />
      )}
    </div>
  );
}

export function TripTimeline({ trips, loading }: { trips: DashboardTrip[] | undefined; loading: boolean }) {
  const t = useMessages(dashboardMessages);
  const f = useFormat();
  const { intl } = useLocale();

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div>
          <CardTitle>{t.upcomingTitle}</CardTitle>
          <CardDescription>{fmt(t.upcomingHint, { n: trips?.length ?? 8 })}</CardDescription>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link href="/dashboard/trips">
            {t.viewAllTrips}
            <ChevronRight className="rtl-flip" aria-hidden />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="flex-1">
        {loading ? (
          <ol className="space-y-5">
            {Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="flex gap-4">
                <Skeleton className="h-14 w-12 rounded-tile" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-2 w-full" />
                </div>
              </li>
            ))}
          </ol>
        ) : !trips?.length ? (
          <EmptyState size="sm" icon={Plane} title={t.noUpcoming} description={t.noUpcomingBody} />
        ) : (
          <ol className="relative">
            <span
              aria-hidden
              className="absolute top-4 bottom-8 start-6 w-px bg-linear-to-b from-primary/50 to-transparent"
            />
            {trips.map((trip) => {
              const d = new Date(`${trip.departureDate}T00:00:00`);
              const day = new Intl.DateTimeFormat(intl, { day: 'numeric' }).format(d);
              const month = new Intl.DateTimeFormat(intl, { month: 'short' }).format(d);
              const short = trip.minPassengers - trip.confirmedSeats;
              const full = trip.confirmedSeats >= trip.maxSeats;
              return (
                <li key={trip.id} className="relative">
                  <Link
                    href={`/dashboard/trips/${trip.id}`}
                    className="group/trip flex gap-4 rounded-tile p-2 -mx-2 transition-colors hover:bg-surface-raised focus-visible:bg-surface-raised"
                  >
                    <span className="relative z-10 grid h-14 w-12 shrink-0 place-items-center content-center rounded-tile border border-border bg-surface-raised text-center shadow-card">
                      <span className="num text-lg leading-none font-medium">{day}</span>
                      <span className="mt-1 text-[10px] leading-none text-muted">{month}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="ltr-nums text-xs font-medium text-muted">{trip.code}</span>
                        {trip.tripType === 'VIP' && <StatusBadge kind="tripType" status="VIP" size="sm" />}
                        <StatusBadge kind="trip" status={trip.status} size="sm" />
                        {trip.waiting > 0 && (
                          <Badge tone="info" size="sm">
                            {fmt(t.waitingOnTrip, { n: f.number(trip.waiting) })}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 truncate text-[15px] font-medium group-hover/trip:text-primary">{trip.tour}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3" aria-hidden />
                          {trip.destination} · {trip.branch}
                        </span>
                        {trip.status === 'OPEN' && (
                          <span>{fmt(t.closesOn, { date: f.date(trip.registrationClosesOn, 'short') })}</span>
                        )}
                      </div>
                      <div className="mt-2.5 flex items-center gap-3">
                        <SeatBar
                          className="flex-1"
                          confirmed={trip.confirmedSeats}
                          max={trip.maxSeats}
                          min={trip.minPassengers}
                        />
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted">
                          <Users className="size-3" aria-hidden />
                          <span className="num">
                            {f.number(trip.confirmedSeats)}/{f.number(trip.maxSeats)}
                          </span>
                        </span>
                      </div>
                      <div
                        className={cn(
                          'mt-1 text-[11px]',
                          full ? TEXT_SUCCESS : short > 0 ? TEXT_WARNING : 'text-muted',
                        )}
                      >
                        {full
                          ? t.full
                          : short > 0
                            ? fmt(t.minNotReached, { n: f.number(short) })
                            : `${t.minReachedShort} · ${fmt(t.minMarker, { n: f.number(trip.minPassengers) })}`}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
