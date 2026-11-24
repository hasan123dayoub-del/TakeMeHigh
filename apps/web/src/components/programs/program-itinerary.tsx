'use client';

/*
 * The visual chain of a program's legs: a horizontal, wrapping itinerary (city stop → trip → city
 * stop …) that follows the reading direction (right-to-left in Arabic). Each trip links to its page.
 */
import { ArrowRight, Flag, MapPin, Unlink } from 'lucide-react';
import Link from 'next/link';
import { Fragment } from 'react';
import { StatusBadge } from '@/components/ui/badge';
import { useName } from '@/lib/hooks';
import { fmt, useMessages } from '@/lib/i18n';
import type { NamedRef, Program } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';
import { programMessages } from './messages';
import { ModeIcon, modesOf } from './product-bits';

function Stop({ city, at, kind }: { city: NamedRef; at?: string; kind: 'start' | 'mid' | 'end' }) {
  const name = useName();
  const f = useFormat();
  const Icon = kind === 'end' ? Flag : MapPin;
  return (
    <div className="flex w-[84px] shrink-0 flex-col items-center gap-1.5 text-center">
      <span
        className={cn(
          'grid size-11 place-items-center rounded-full',
          kind === 'mid' ? 'bg-surface-raised text-primary ring-2 ring-primary/30' : 'bg-ink text-ink-foreground shadow-card',
        )}
      >
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <span className="text-[14px] leading-tight font-medium">{name(city)}</span>
      {at && <span className="num text-[12px] text-muted">{f.date(at, 'short')}</span>}
    </div>
  );
}

export function ProgramItinerary({ program }: { program: Program }) {
  const t = useMessages(programMessages);
  const f = useFormat();
  const name = useName();
  const legs = program.legs;
  if (!legs.length) return null;

  return (
    <ol className="flex flex-wrap items-center gap-y-6">
      <li className="contents">
        <Stop city={legs[0].trip.originCity} at={legs[0].trip.startsAt} kind="start" />
      </li>
      {legs.map((l, i) => {
        const trip = l.trip;
        const next = legs[i + 1]?.trip;
        const broken = next && next.originCityId !== trip.destinationCityId;
        const modes = modesOf(trip.lines);
        return (
          <Fragment key={l.tripId}>
            <li className="flex min-w-[170px] flex-1 flex-col justify-center gap-2 px-2">
              <Link
                href={`/dashboard/trips/${trip.id}`}
                aria-label={fmt(t.openTrip, { code: trip.code })}
                className="group rounded-[16px] border border-border bg-surface-raised p-3 shadow-card transition-[border-color,transform] hover:-translate-y-0.5 hover:border-primary/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="num ltr-nums text-[12px] font-medium text-muted">
                    {fmt(t.leg, { n: i + 1 })} · {trip.code}
                  </span>
                  <span className="flex items-center gap-1 text-primary">
                    {modes.map((mode) => (
                      <span key={mode} className="grid size-6 place-items-center rounded-full bg-primary/10">
                        <ModeIcon mode={mode} className="size-3.5" />
                      </span>
                    ))}
                  </span>
                </div>
                <div className="mt-1.5 truncate text-[14px] font-medium group-hover:text-primary">{trip.title}</div>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                  <StatusBadge kind="product" status={trip.status} size="sm" />
                  <span className="num font-semibold">{f.money(trip.pricePerPerson, trip.currencyCode)}</span>
                </div>
              </Link>
              <div className="flex items-center gap-1 text-subtle" aria-hidden>
                <span className="h-0 flex-1 border-t-2 border-dashed border-border-strong" />
                <ArrowRight className="rtl-flip size-4" />
              </div>
              <div className="num text-center text-[12px] text-muted">
                {f.date(trip.startsAt, 'short')} {f.date(trip.startsAt, 'time')} — {f.date(trip.endsAt, 'short')} {f.date(trip.endsAt, 'time')}
              </div>
            </li>
            <li className="contents">
              <Stop city={trip.destinationCity} at={trip.endsAt} kind={i === legs.length - 1 ? 'end' : 'mid'} />
            </li>
            {broken && next && (
              <li className="flex w-full items-center gap-2 text-xs text-danger">
                <Unlink className="size-4" aria-hidden />
                {fmt(t.linkPlace, { prev: name(trip.destinationCity), next: name(next.originCity) })}
              </li>
            )}
          </Fragment>
        );
      })}
    </ol>
  );
}
