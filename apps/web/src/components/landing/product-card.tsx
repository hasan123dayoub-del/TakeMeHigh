import { LABELS } from '@travelos/shared';
import { ArrowUpRight, CalendarDays, Clock, MapPin } from 'lucide-react';
import Link from 'next/link';
import { fmt, type Locale } from '@/lib/i18n/shared';
import { cn } from '@/lib/utils';
import { SERVICE_ICON, TRANSPORT_ICON, WhatsAppIcon } from './icons';
import type { LandingMessages } from './messages';
import type { PublicProduct } from './types';
import { days, discountLabel, fRange, money, nameOf, productPath, routeOf } from './utils';

/** Seats pill: "last N seats" when 5 or fewer, "fully booked" at 0. */
export function SeatsPill({ seats, t, className }: { seats: number; t: LandingMessages; className?: string }) {
  if (seats > 5) return null;
  return (
    <span
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium backdrop-blur-md',
        seats === 0 ? 'bg-ink/85 text-ink-foreground' : 'bg-white/90 text-[color-mix(in_srgb,var(--warning)_80%,#111418)]',
        className,
      )}
    >
      <span aria-hidden className={cn('size-1.5 rounded-full', seats === 0 ? 'bg-white/70' : 'animate-pulse bg-warning')} />
      {seats === 0 ? t.soldOut : seats === 1 ? t.lastSeat : fmt(t.lastSeats, { n: seats })}
    </span>
  );
}

export function RouteLine({ cities, className }: { cities: string[]; className?: string }) {
  return (
    <p className={cn('flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[14px] text-muted', className)}>
      <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden />
      {cities.map((c, i) => (
        <span key={`${c}-${i}`} className="inline-flex items-center gap-1.5">
          {i > 0 && (
            <span aria-hidden className="inline-block text-subtle rtl:rotate-180">
              →
            </span>
          )}
          <span className={i === cities.length - 1 ? 'font-medium text-foreground' : undefined}>{c}</span>
        </span>
      ))}
    </p>
  );
}

export function ProductCard({
  item,
  t,
  locale,
  bookHref,
  priority,
}: {
  item: PublicProduct;
  t: LandingMessages;
  locale: Locale;
  bookHref: string | null;
  priority?: boolean;
}) {
  const href = productPath(item);
  const route = routeOf(item, locale);
  const length = days(item.startsAt, item.endsAt);
  const discounted = !!item.offer && item.finalPrice !== item.price;
  const soldOut = item.seatsLeft === 0;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-card border border-border bg-surface-raised shadow-card transition-[transform,box-shadow] duration-300 ease-out-soft hover:-translate-y-1 hover:shadow-pop focus-within:shadow-pop">
      <div className="relative aspect-[16/10] overflow-hidden bg-sky-100 dark:bg-sky-900">
        {item.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.coverImageUrl}
            alt={item.title}
            loading={priority ? 'eager' : 'lazy'}
            className="size-full object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.04]"
          />
        ) : (
          <div aria-hidden className="size-full bg-powder" />
        )}
        <div aria-hidden className="absolute inset-0 bg-linear-to-t from-sky-950/45 via-transparent to-sky-950/10" />
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <span className="inline-flex h-7 items-center rounded-full bg-white/90 px-3 text-xs font-medium text-[#111418] backdrop-blur-md">
            {item.type === 'TRIP' ? t.trip : t.program} · {nameOf(item.category, locale)}
          </span>
          {discounted && item.offer && (
            <span className="inline-flex h-7 items-center rounded-full bg-ink px-3 text-xs font-semibold text-ink-foreground shadow-pop">
              {discountLabel(item.offer, item.currencyCode, t, locale)}
            </span>
          )}
        </div>
        <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
          <SeatsPill seats={item.seatsLeft} t={t} />
          {item.transportModes.length > 0 && (
            <ul className="ms-auto flex gap-1" aria-label={t.transport}>
              {item.transportModes.map((m) => {
                const Icon = TRANSPORT_ICON[m];
                return (
                  <li
                    key={m}
                    title={LABELS.transportMode[m][locale]}
                    className="grid size-7 place-items-center rounded-full bg-white/90 text-[#111418] backdrop-blur-md"
                  >
                    <Icon className="size-3.5" aria-hidden />
                    <span className="sr-only">{LABELS.transportMode[m][locale]}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="eyebrow num ltr-nums w-fit">
          {item.code}
        </p>
        <h3 dir="auto" className="mt-1.5 text-start text-[17px] leading-snug font-medium">
          <Link href={href} className="outline-none after:absolute after:inset-0 after:rounded-card after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-ring">
            {item.title}
          </Link>
        </h3>
        {route.length > 0 && <RouteLine cities={route} className="mt-2" />}
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5 text-primary" aria-hidden />
            <span className="num">{fRange(item.startsAt, item.endsAt, locale)}</span>
          </span>
          {length && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5 text-primary" aria-hidden />
              {length === 1 ? t.durationOne : fmt(t.duration, { n: length })}
            </span>
          )}
        </p>

        {item.services.length > 0 && (
          <ul className="mt-3.5 mb-5 flex flex-wrap gap-1.5" aria-label={t.services}>
            {item.services.map((s) => {
              const Icon = SERVICE_ICON[s];
              return (
                <li key={s} className="inline-flex h-7 items-center gap-1.5 rounded-full bg-surface px-2.5 text-xs text-muted">
                  <Icon className="size-3.5" aria-hidden />
                  {LABELS.serviceKind[s][locale]}
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-4">
          <div className="min-w-0">
            {discounted && (
              <p className="text-xs text-subtle">
                <span className="sr-only">{t.oldPrice}: </span>
                <s className="num">{money(item.price, item.currencyCode, locale)}</s>
              </p>
            )}
            <p className="flex flex-wrap items-baseline gap-x-1.5">
              {discounted && <span className="sr-only">{t.priceNow}: </span>}
              <span className="font-display text-[22px] leading-tight font-medium num">{money(item.finalPrice, item.currencyCode, locale)}</span>
              <span className="text-xs text-muted">{t.perPerson}</span>
            </p>
          </div>
          <div className="relative z-10 flex shrink-0 items-center gap-1.5">
            <Link
              href={href}
              aria-label={fmt(t.viewDetails, { title: item.title })}
              className="grid size-10 place-items-center rounded-full border border-border bg-surface-raised text-foreground transition-colors hover:border-border-strong hover:bg-surface"
            >
              <ArrowUpRight className="size-4 rtl-flip" aria-hidden />
            </Link>
            {bookHref && (
              <a
                href={bookHref}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-[transform,background-color] hover:-translate-y-0.5',
                  soldOut ? 'bg-ink text-ink-foreground hover:bg-ink-hover' : 'bg-primary text-primary-foreground shadow-primary hover:bg-primary-hover',
                )}
              >
                <WhatsAppIcon className="size-4" />
                {soldOut ? t.joinWaitlist : t.bookNow}
                <span className="sr-only">: {item.title}</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
