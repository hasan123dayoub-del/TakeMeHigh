'use client';

import { CalendarDays, MapPin, Moon } from 'lucide-react';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { useLocale, useMessages } from '@/lib/i18n';
import type { TripCard as TripCardData } from '@/lib/types/public';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';
import { IncludesRow, OfferChip, OfferEnds, OfficeLogo, PriceTag, SeatsBadge, TripCover, TripTypeBadge, WhatsAppLink } from './atoms';
import { day, nightsLabel, pm } from './messages';

export function tripHref(trip: Pick<TripCardData, 'id' | 'office'>) {
  return `/${trip.office.slug}/trips/${trip.id}`;
}

/**
 * Showcase card: cover, dates, VIP, price per currency (with offer), seats left,
 * included services, the owning office and a WhatsApp CTA.
 * The whole card links to the trip; the office and WhatsApp are separate targets above it.
 */
export function TripCard({
  trip,
  showOffice = true,
  className,
  style,
}: {
  trip: TripCardData;
  showOffice?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const t = useMessages(pm);
  const f = useFormat();
  const { locale } = useLocale();
  const href = tripHref(trip);
  const soldOut = trip.seatsAvailable <= 0;

  return (
    <article
      style={style}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-card border border-glass-border bg-surface-raised shadow-card transition-[transform,box-shadow] duration-300 ease-out-soft hover:-translate-y-1 hover:shadow-pop',
        className,
      )}
    >
      <TripCover title={trip.title} destination={trip.destination} imageUrl={trip.coverImageUrl} className="aspect-[16/10]">
        <div className="flex items-start justify-between gap-2 p-3">
          <div className="flex flex-wrap gap-1.5">
            <TripTypeBadge tripType={trip.tripType} />
            {trip.offer && <OfferChip trip={trip} className="bg-surface-raised/95" />}
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
            <MapPin className="size-3" aria-hidden />
            {trip.destination}
          </span>
        </div>
      </TripCover>

      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" aria-hidden />
            <span className="num">
              {f.date(day(trip.departureDate), 'short')} – {f.date(day(trip.returnDate), 'medium')}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Moon className="size-3.5" aria-hidden />
            {nightsLabel(trip.nights, locale)}
          </span>
        </div>

        <h3 className="font-display text-lg leading-snug font-medium text-foreground">
          {/* stretched link: the whole card opens the trip */}
          <Link href={href} className="after:absolute after:inset-0 after:z-0 after:rounded-card focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-ring">
            {trip.title}
          </Link>
        </h3>

        <div className="flex flex-wrap items-center gap-2">
          <SeatsBadge seats={trip.seatsAvailable} />
          <IncludesRow includes={trip.includes} />
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-1">
          <div>
            <PriceTag trip={trip} />
            <OfferEnds trip={trip} className="mt-1" />
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between gap-2 border-t border-border pt-3">
          {showOffice ? (
            <Link
              href={`/${trip.office.slug}`}
              className="flex min-w-0 items-center gap-2 rounded-full py-1 pe-2 transition-colors hover:text-primary"
            >
              <OfficeLogo name={trip.office.name} logoUrl={trip.office.logoUrl} brandColor={trip.office.brandColor} size="sm" />
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-[13px] font-medium">{trip.office.name}</span>
                {trip.office.city && (
                  <span className="flex items-center gap-1 text-[11px] text-muted">
                    <MapPin className="size-3" aria-hidden />
                    {trip.office.city}
                  </span>
                )}
              </span>
            </Link>
          ) : (
            <span className="text-[12px] text-muted">
              <span className="ltr-nums">{trip.code}</span>
            </span>
          )}
          <WhatsAppLink href={trip.whatsappUrl} size="sm" aria-label={`${soldOut ? t.waitingListWhatsApp : t.bookWhatsApp}: ${trip.title}`}>
            {soldOut ? t.whatsapp : t.bookWhatsApp}
          </WhatsAppLink>
        </div>
      </div>
    </article>
  );
}

export function TripCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card border border-glass-border bg-surface-raised" aria-hidden>
      <div className="aspect-[16/10] animate-shimmer bg-[linear-gradient(90deg,var(--surface-sunken)_0%,var(--surface)_50%,var(--surface-sunken)_100%)] bg-size-[200%_100%]" />
      <div className="grid gap-3 p-5">
        <div className="h-3 w-1/2 rounded-full bg-surface-sunken" />
        <div className="h-5 w-3/4 rounded-full bg-surface-sunken" />
        <div className="h-6 w-2/3 rounded-full bg-surface-sunken" />
        <div className="h-7 w-1/3 rounded-full bg-surface-sunken" />
        <div className="mt-2 flex justify-between border-t border-border pt-3">
          <div className="h-8 w-28 rounded-full bg-surface-sunken" />
          <div className="h-9 w-32 rounded-full bg-surface-sunken" />
        </div>
      </div>
    </div>
  );
}
