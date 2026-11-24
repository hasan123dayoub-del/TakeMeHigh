import { ArrowUpRight, CalendarDays, ChevronLeft, Hourglass, Phone, Tag, Users } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { LABELS } from '@travelos/shared';
import { fmt, type Locale } from '@/lib/i18n/shared';
import { cn } from '@/lib/utils';
import { WhatsAppIcon } from './icons';
import type { LandingMessages } from './messages';
import { SeatsPill } from './product-card';
import type { PublicProduct } from './types';
import { discountLabel, fDate, money, nameOf, telHref } from './utils';

export function Breadcrumbs({ t, current, section }: { t: LandingMessages; current: string; section: { href: string; label: string } }) {
  return (
    <nav aria-label={t.breadcrumb} className="text-[14px] text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link href="/" className="hover:text-foreground">
            {t.home}
          </Link>
        </li>
        <li aria-hidden>
          <ChevronLeft className="size-3.5 ltr:rotate-180" />
        </li>
        <li>
          <Link href={section.href} className="hover:text-foreground">
            {section.label}
          </Link>
        </li>
        <li aria-hidden>
          <ChevronLeft className="size-3.5 ltr:rotate-180" />
        </li>
        <li aria-current="page" className="max-w-[24ch] truncate font-medium text-foreground">
          {current}
        </li>
      </ol>
    </nav>
  );
}

/** Cover hero of a detail page: image with title, chips and route over a gradient. */
export function DetailHero({ item, t, locale, children }: { item: PublicProduct; t: LandingMessages; locale: Locale; children?: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-panel bg-altitude">
      {item.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.coverImageUrl} alt={item.title} fetchPriority="high" className="absolute inset-0 size-full object-cover" />
      )}
      <div aria-hidden className="absolute inset-0 bg-linear-to-t from-sky-950/90 via-sky-950/40 to-sky-950/10" />
      <div className="relative flex min-h-[340px] flex-col justify-end p-5 pt-24 text-white sm:min-h-[440px] sm:p-10 lg:p-12">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex h-7 items-center rounded-full bg-white/18 px-3 text-xs font-medium backdrop-blur-md">
            {item.type === 'TRIP' ? t.trip : t.program} · {nameOf(item.category, locale)}
          </span>
          <span className="inline-flex h-7 items-center rounded-full bg-white/18 px-3 text-xs font-medium backdrop-blur-md">
            {LABELS.travelScope[item.scope][locale]}
          </span>
          {item.offer && item.finalPrice !== item.price && (
            <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-semibold text-[#111418]">
              <Tag className="size-3.5" aria-hidden />
              {discountLabel(item.offer, item.currencyCode, t, locale)}
            </span>
          )}
          <SeatsPill seats={item.seatsLeft} t={t} />
        </div>
        <h1 dir="auto" className="mt-4 max-w-3xl text-start font-display text-[30px] leading-[1.15] font-medium sm:text-[44px]">{item.title}</h1>
        {children}
      </div>
    </div>
  );
}

export function Panel({ title, description, children, className, id }: { title: string; description?: string; children: ReactNode; className?: string; id?: string }) {
  return (
    <section aria-labelledby={id} className={cn('rounded-card border border-border bg-surface-raised p-5 shadow-card sm:p-7', className)}>
      <h2 id={id} className="heading-display text-[18px] leading-tight sm:text-[20px]">
        {title}
      </h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** Text with paragraphs and line breaks preserved. */
export function Prose({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn('grid gap-4 text-[16px] leading-[1.9] text-foreground/90', className)}>
      {text
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} className="whitespace-pre-line">
            {p}
          </p>
        ))}
    </div>
  );
}

/**
 * Sticky booking card: full price only (PRC-07), discount, dates, deadline and seats,
 * plus the "Book now on WhatsApp" button. On mobile it is a bar fixed to the bottom.
 */
export function BookingCard({
  item,
  t,
  locale,
  bookHref,
  contact,
}: {
  item: PublicProduct;
  t: LandingMessages;
  locale: Locale;
  bookHref: string | null;
  contact: { label: string; phone: string | null } | null;
}) {
  const discounted = !!item.offer && item.finalPrice !== item.price;
  const soldOut = item.seatsLeft === 0;
  const rows = [
    { Icon: CalendarDays, label: t.departure, value: fDate(item.startsAt, locale, 'long') },
    { Icon: CalendarDays, label: t.return, value: fDate(item.endsAt, locale, 'long') },
    { Icon: Hourglass, label: t.deadline, value: fDate(item.registrationDeadline, locale, 'dateTime') },
    {
      Icon: Users,
      label: t.seats,
      value: soldOut ? t.soldOut : item.seatsLeft <= 5 ? fmt(t.lastSeats, { n: item.seatsLeft }) : fmt(t.seatsLeft, { n: item.seatsLeft }),
    },
  ];
  const book = bookHref && (
    <a
      href={bookHref}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-[16px] font-medium transition-[transform,background-color] hover:-translate-y-0.5',
        soldOut ? 'bg-ink text-ink-foreground hover:bg-ink-hover' : 'bg-primary text-primary-foreground shadow-primary hover:bg-primary-hover',
      )}
    >
      <WhatsAppIcon className="size-5" />
      {soldOut ? t.joinWaitlist : t.bookNowWhatsapp}
    </a>
  );
  const price = (
    <div>
      {discounted && (
        <p className="text-sm text-subtle">
          <span className="sr-only">{t.oldPrice}: </span>
          <s className="num">{money(item.price, item.currencyCode, locale)}</s>
        </p>
      )}
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-display text-[28px] leading-tight font-medium num sm:text-[32px]">{money(item.finalPrice, item.currencyCode, locale)}</span>
        <span className="text-sm text-muted">{t.perPerson}</span>
      </p>
    </div>
  );

  return (
    <>
      <aside className="glass sticky top-24 hidden rounded-card p-6 lg:block" aria-label={t.bookNow}>
        {price}
        {discounted && item.offer && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-xs font-medium text-ink-foreground">
            <Tag className="size-3.5" aria-hidden />
            {item.offer.title}
          </p>
        )}
        <p className="mt-2 text-xs text-muted">{t.fullPriceNote}</p>
        <dl className="mt-5 grid gap-3 border-t border-border pt-5">
          {rows.map(({ Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3">
              <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <dt className="sr-only">{label}</dt>
              <dd className="min-w-0 text-sm">
                <span className="block text-xs text-muted" aria-hidden>
                  {label}
                </span>
                <span className="num">{value}</span>
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-6">{book}</div>
        {contact && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-tile bg-surface p-3 text-sm">
            <span className="min-w-0">
              <span className="block text-xs text-muted">{t.contactBranch}</span>
              <span className="block font-medium leading-snug">{contact.label}</span>
            </span>
            {contact.phone && (
              <a
                href={telHref(contact.phone)}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface-raised px-3 text-xs font-medium hover:border-border-strong"
              >
                <Phone className="size-3.5" aria-hidden />
                <span className="ltr-nums num">{contact.phone}</span>
              </a>
            )}
          </div>
        )}
      </aside>

      {/* Mobile: price + book bar fixed at the bottom */}
      <div className="fixed inset-x-3 bottom-3 z-30 lg:hidden">
        <div className="glass flex items-center gap-3 rounded-full p-2 ps-5">
          <div className="min-w-0 flex-1">
            {discounted && (
              <s className="block text-[12px] leading-none text-subtle num">
                <span className="sr-only">{t.oldPrice}: </span>
                {money(item.price, item.currencyCode, locale)}
              </s>
            )}
            <span className="font-display text-[18px] leading-tight font-medium num">{money(item.finalPrice, item.currencyCode, locale)}</span>
          </div>
          {bookHref && (
            <a
              href={bookHref}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-medium',
                soldOut ? 'bg-ink text-ink-foreground' : 'bg-primary text-primary-foreground shadow-primary',
              )}
            >
              <WhatsAppIcon className="size-4" />
              {soldOut ? t.joinWaitlist : t.bookNow}
            </a>
          )}
        </div>
      </div>
    </>
  );
}

export function FactsGrid({ facts }: { facts: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {facts.map((f) => (
        <div key={f.label} className="rounded-tile bg-surface p-3.5">
          <dt className="eyebrow">{f.label}</dt>
          <dd className="mt-1.5 text-sm font-medium">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function MoreLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4">
      {children}
      <ArrowUpRight className="size-3.5 rtl-flip" aria-hidden />
    </Link>
  );
}
