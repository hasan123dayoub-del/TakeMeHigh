'use client';

/* eslint-disable @next/next/no-img-element -- office images are arbitrary remote URLs (no next/image remotePatterns). */

import { BedDouble, BusFront, Crown, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import type { ComponentProps, CSSProperties, ReactNode } from 'react';
import { useLocale, useMessages } from '@/lib/i18n';
import type { ServiceType, TripCard } from '@/lib/types/public';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';
import { brandSurface, bucket, officeInitials } from './brand';
import { day, fmt, pm, seatsLabel } from './messages';

/* ------------------------------------------------------------------ WhatsApp */

/** WhatsApp glyph (brand mark, simplified). */
export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91A9.85 9.85 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.23 8.23 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 0 1 8.24 8.25c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.46-.72-1.69-.81-.23-.08-.39-.12-.56.13-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.12-.15.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.13-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48a.92.92 0 0 0-.66.31c-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.46-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.29Z" />
    </svg>
  );
}

/**
 * WhatsApp green with ink text: the colour visitors recognise, and AA (10:1) unlike white on green.
 * A brand exception to the token palette, used only for WhatsApp actions.
 */
export const whatsappClass =
  'bg-[#25D366] text-[#0b1626] shadow-[0_12px_30px_-14px_rgb(37_211_102/0.9)] hover:bg-[#3ee07a] hover:-translate-y-0.5 active:translate-y-0';

export function WhatsAppLink({
  href,
  children,
  size = 'md',
  className,
  ...props
}: Omit<ComponentProps<'a'>, 'href'> & { href: string | null; size?: 'sm' | 'md' | 'lg'; children: ReactNode }) {
  const t = useMessages(pm);
  const sizes = { sm: 'h-9 px-4 text-[13px]', md: 'h-11 px-5 text-sm', lg: 'h-13 px-6 text-[15px]' };
  const base = cn(
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-[background-color,transform,box-shadow] duration-200 ease-out-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    sizes[size],
    className,
  );
  if (!href) {
    return (
      <span className={cn(base, 'cursor-not-allowed bg-surface-sunken text-muted')} title={t.noWhatsApp} aria-disabled>
        <WhatsAppIcon className="size-[1.15em]" />
        {children}
      </span>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cn(base, whatsappClass)} {...props}>
      <WhatsAppIcon className="size-[1.15em]" />
      {children}
    </a>
  );
}

/* ------------------------------------------------------------------ office logo */

export function OfficeLogo({
  name,
  logoUrl,
  brandColor,
  size = 'md',
  className,
}: {
  name: string;
  logoUrl: string | null;
  brandColor: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const sizes = {
    xs: 'size-6 text-[10px]',
    sm: 'size-8 text-[11px]',
    md: 'size-10 text-[13px]',
    lg: 'size-14 text-base',
    xl: 'size-20 text-2xl',
  };
  return (
    <span
      className={cn(
        'relative grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold text-white ring-2 ring-white/80 dark:ring-white/10',
        sizes[size],
        className,
      )}
      style={{ background: brandSurface(brandColor) }}
      aria-hidden
    >
      {logoUrl ? <img src={logoUrl} alt="" className="size-full object-cover" /> : officeInitials(name)}
    </span>
  );
}

/* ------------------------------------------------------------------ cover */

/** Cirrus gradient families for trips without a photo; picked by destination so a city keeps its look. */
const COVERS = [
  'linear-gradient(140deg, #18263b 0%, #335a8c 45%, #7fa7d3 100%)',
  'linear-gradient(150deg, #273f5f 0%, #3f70ab 50%, #a9c8ec 100%)',
  'linear-gradient(135deg, #2c4b73 0%, #3aa5d8 60%, #c9ddf3 100%)',
  'linear-gradient(160deg, #18263b 0%, #2c4b73 40%, #5b8cc4 100%)',
  'linear-gradient(125deg, #335a8c 0%, #5b8cc4 55%, #e3effa 100%)',
];

export function TripCover({
  title,
  destination,
  imageUrl,
  className,
  children,
  large = false,
}: {
  title: string;
  destination: string;
  imageUrl: string | null;
  className?: string;
  children?: ReactNode;
  large?: boolean;
}) {
  const style: CSSProperties = { backgroundImage: COVERS[bucket(destination, COVERS.length)] };
  return (
    <div className={cn('relative isolate overflow-hidden', className)} style={imageUrl ? undefined : style}>
      {imageUrl ? (
        <img src={imageUrl} alt={title} className="absolute inset-0 -z-10 size-full object-cover" loading="lazy" />
      ) : (
        <div aria-hidden className="absolute inset-0 -z-10 text-white">
          {/* sun, horizon rings and the destination as a watermark */}
          <span className="absolute -top-10 -end-10 size-44 rounded-full bg-white/15 blur-[1px]" />
          <span className="absolute top-8 end-10 size-14 rounded-full bg-white/25" />
          <span className="absolute -bottom-24 -start-16 size-72 rounded-full border border-white/20" />
          <span className="absolute -bottom-32 -start-8 size-72 rounded-full border border-white/10" />
          <svg className="absolute inset-x-0 bottom-0 h-1/3 w-full opacity-25" viewBox="0 0 400 80" preserveAspectRatio="none">
            <path d="M0 50 Q 50 30 100 48 T 200 46 T 300 44 T 400 40 V80 H0Z" fill="currentColor" />
            <path d="M0 62 Q 60 48 120 60 T 240 58 T 400 56 V80 H0Z" fill="currentColor" opacity="0.6" />
          </svg>
          <span
            className={cn(
              'absolute bottom-3 start-4 font-display font-medium text-white/22 select-none',
              large ? 'text-7xl sm:text-8xl' : 'text-5xl',
            )}
          >
            {destination}
          </span>
        </div>
      )}
      {/* legibility veil for chips on top */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-linear-to-b from-black/25 via-transparent to-black/35" />
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ badges */

export function TripTypeBadge({ tripType, className }: { tripType: TripCard['tripType']; className?: string }) {
  const t = useMessages(pm);
  if (tripType === 'VIP') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-ink-foreground',
          className,
        )}
      >
        <Crown className="size-3" aria-hidden />
        {t.vip}
      </span>
    );
  }
  return (
    <span className={cn('inline-flex items-center rounded-full bg-surface-raised/95 px-2.5 py-1 text-[11px] font-medium text-foreground', className)}>
      {t.standard}
    </span>
  );
}

export function SeatsBadge({ seats, className }: { seats: number; className?: string }) {
  const { locale } = useLocale();
  const t = useMessages(pm);
  if (seats <= 0) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 rounded-full bg-surface-sunken px-2.5 py-1 text-[12px] font-medium text-muted', className)}>
        {t.soldOut}
      </span>
    );
  }
  const urgent = seats <= 5;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium',
        urgent ? 'bg-warning/12 text-warning' : 'bg-success/10 text-success',
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', urgent ? 'animate-pulse bg-warning' : 'bg-success')} aria-hidden />
      {seatsLabel(seats, locale)}
    </span>
  );
}

const SERVICE_ICONS: Record<ServiceType, LucideIcon> = {
  HOTEL: BedDouble,
  TRANSPORT: BusFront,
  RESTAURANT: UtensilsCrossed,
};
const SERVICE_ORDER: ServiceType[] = ['TRANSPORT', 'HOTEL', 'RESTAURANT'];

export function ServiceIcon({ type, className }: { type: ServiceType; className?: string }) {
  const Icon = SERVICE_ICONS[type] ?? BusFront;
  return <Icon className={className} aria-hidden />;
}

/** Hotel / transport / meals as small labelled icons. */
export function IncludesRow({ includes, className }: { includes: ServiceType[]; className?: string }) {
  const t = useMessages(pm);
  const list = SERVICE_ORDER.filter((s) => includes.includes(s));
  if (!list.length) return null;
  return (
    <ul className={cn('flex flex-wrap items-center gap-1.5', className)} aria-label={t.includesTitle}>
      {list.map((s) => (
        <li key={s} className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-1 text-[11px] font-medium text-accent-foreground">
          <ServiceIcon type={s} className="size-3.5" />
          {t[s]}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ price */

/** Price in the trip's own currency, with the original struck through when an offer applies. */
export function PriceTag({ trip, size = 'md', className }: { trip: TripCard; size?: 'md' | 'lg'; className?: string }) {
  const f = useFormat();
  const t = useMessages(pm);
  const discounted = !!trip.offer && Number(trip.priceAfterOffer) < Number(trip.price);
  return (
    <div className={cn('min-w-0', className)}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className={cn('num font-display font-medium tracking-tight text-foreground', size === 'lg' ? 'text-[32px] leading-none' : 'text-xl')}>
          <span className="ltr-nums">{f.money(trip.priceAfterOffer, trip.currencyCode)}</span>
        </span>
        {discounted && (
          <del className="num text-[13px] text-subtle">
            <span className="ltr-nums">{f.money(trip.price, trip.currencyCode)}</span>
          </del>
        )}
      </div>
      <p className="mt-0.5 text-[12px] text-muted">{t.perPerson}</p>
    </div>
  );
}

export function OfferChip({ trip, className }: { trip: TripCard; className?: string }) {
  const f = useFormat();
  if (!trip.offer) return null;
  const off =
    trip.offer.discountType === 'PERCENTAGE'
      ? `−${f.number(trip.offer.discountValue, { maximumFractionDigits: 2 })}%`
      : `−${f.money(trip.offer.discountValue, trip.currencyCode)}`;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-1 text-[11px] font-semibold text-success', className)}>
      <span className="ltr-nums">{off}</span>
      <span className="max-w-36 truncate">{trip.offer.title}</span>
    </span>
  );
}

export function OfferEnds({ trip, className }: { trip: TripCard; className?: string }) {
  const f = useFormat();
  const t = useMessages(pm);
  if (!trip.offer) return null;
  return <p className={cn('text-[12px] font-medium text-success', className)}>{fmt(t.offerEnds, { date: f.date(day(trip.offer.endsAt), 'short') })}</p>;
}
