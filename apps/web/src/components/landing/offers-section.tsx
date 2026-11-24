import { LABELS } from '@travelos/shared';
import { ArrowUpRight, CalendarClock, Gift, Users } from 'lucide-react';
import Link from 'next/link';
import { fmt, type Locale } from '@/lib/i18n/shared';
import { SERVICE_ICON, WhatsAppIcon } from './icons';
import type { LandingMessages } from './messages';
import { Reveal } from './reveal';
import { SectionHeading } from './section-heading';
import type { PublicOffer, PublicOfficeInfo } from './types';
import { bookingLink, discountLabel, fDate, money, productPath } from './utils';

function discounted(price: string, offer: PublicOffer) {
  const p = Number(price);
  const v = Number(offer.discountValue ?? 0);
  const value = offer.discountMode === 'PERCENT' ? p * (1 - v / 100) : p - v;
  return Math.max(0, Math.round(value * 100) / 100);
}

function BookButton({ href, label, title, tone = 'primary' }: { href: string | null; label: string; title: string; tone?: 'primary' | 'white' }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={
        tone === 'primary'
          ? 'inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground shadow-primary transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-primary-hover'
          : 'inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-[#111418] transition-transform hover:-translate-y-0.5'
      }
    >
      <WhatsAppIcon className="size-4" />
      {label}
      <span className="sr-only">: {title}</span>
    </a>
  );
}

export function OffersSection({
  offers,
  office,
  origin,
  t,
  locale,
}: {
  offers: PublicOffer[];
  office: PublicOfficeInfo;
  origin: string;
  t: LandingMessages;
  locale: Locale;
}) {
  const bundles = offers.filter((o) => o.kind === 'BUNDLE');
  const discounts = offers.filter((o) => o.kind === 'DISCOUNT');

  return (
    <section id="offers" aria-labelledby="offers-title" className="scroll-mt-24 px-3 pt-24 sm:px-6">
      <div className="mx-auto max-w-[1280px]">
        <Reveal>
          <SectionHeading id="offers-title" eyebrow={t.offersEyebrow} titleA={t.offersTitleA} titleB={t.offersTitleB} body={t.offersBody} />
        </Reveal>

        {!offers.length && <p className="mt-8 rounded-card bg-surface-raised/70 px-6 py-10 text-center text-muted">{t.noOffers}</p>}

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {bundles.map((o, i) => (
            <Reveal key={o.id} delay={i * 0.06} className="lg:col-span-2">
              <article
                id={`offer-${o.id}`}
                className="group relative grid scroll-mt-28 overflow-hidden rounded-card border border-border bg-surface-raised shadow-card md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
              >
                <div className="relative min-h-56 overflow-hidden md:min-h-full">
                  {o.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={o.coverImageUrl}
                      alt={o.title}
                      loading="lazy"
                      className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div aria-hidden className="absolute inset-0 bg-powder" />
                  )}
                  <div aria-hidden className="absolute inset-0 bg-linear-to-t from-sky-950/50 to-transparent" />
                  <div className="absolute start-4 top-4 flex gap-2">
                    <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-ink px-3 text-xs font-medium text-ink-foreground">
                      <Gift className="size-3.5" aria-hidden />
                      {t.bundle}
                    </span>
                    {o.discountMode && o.discountValue && (
                      <span className="inline-flex h-7 items-center rounded-full bg-white/90 px-3 text-xs font-semibold text-[#111418] backdrop-blur">
                        {discountLabel({ discountMode: o.discountMode, discountValue: o.discountValue }, o.currencyCode ?? 'USD', t, locale)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col p-6 sm:p-8">
                  <h3 className="font-display text-[22px] leading-snug font-medium">{o.title}</h3>
                  {o.description && <p className="mt-2 text-[16px] leading-relaxed text-muted">{o.description}</p>}
                  {o.services.length > 0 && (
                    <>
                      <p className="eyebrow mt-6">{t.includes}</p>
                      <ul className="mt-3 grid gap-2.5">
                        {o.services.map((s, idx) => {
                          const Icon = SERVICE_ICON[s.kind] ?? SERVICE_ICON.OTHER;
                          return (
                            <li key={idx} className="flex items-start gap-3 rounded-tile bg-surface p-3">
                              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-primary">
                                <Icon className="size-4" aria-hidden />
                              </span>
                              <span className="min-w-0 text-sm">
                                <span className="block font-medium">{s.name}</span>
                                <span className="block text-xs text-muted">
                                  {LABELS.serviceKind[s.kind]?.[locale] ?? s.service} · {s.company}
                                  {s.city ? ` · ${s.city}` : ''}
                                </span>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}
                  <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock className="size-4 text-primary" aria-hidden />
                      <span className="num">{fmt(t.validUntil, { date: fDate(o.validTo, locale) })}</span>
                    </span>
                    {o.seatsLeft !== null && (
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="size-4 text-primary" aria-hidden />
                        <span className="num">
                          {o.seatsLeft === 0 ? t.soldOut : o.seatsLeft <= 5 ? fmt(t.lastSeats, { n: o.seatsLeft }) : fmt(t.seatsLeft, { n: o.seatsLeft })}
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-border pt-5">
                    {o.price && (
                      <p>
                        <span className="block text-xs text-muted">{t.bundlePrice}</span>
                        <span className="font-display text-[26px] leading-tight font-medium num">{money(o.price, o.currencyCode, locale)}</span>{' '}
                        <span className="text-xs text-muted">{t.perPerson}</span>
                      </p>
                    )}
                    <BookButton
                      href={bookingLink(
                        office,
                        { title: o.title, price: o.price ? money(o.price, o.currencyCode, locale) : undefined, path: `/#offer-${o.id}` },
                        origin,
                      )}
                      label={o.seatsLeft === 0 ? t.joinWaitlist : t.bookNow}
                      title={o.title}
                    />
                  </div>
                </div>
              </article>
            </Reveal>
          ))}

          {discounts.map((o, i) => (
            <Reveal key={o.id} delay={i * 0.06}>
              <article id={`offer-${o.id}`} className="relative flex h-full scroll-mt-28 flex-col overflow-hidden rounded-card bg-altitude p-6 sm:p-7">
                {o.coverImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.coverImageUrl} alt="" aria-hidden loading="lazy" className="absolute inset-0 size-full object-cover opacity-15 mix-blend-luminosity" />
                )}
                <span aria-hidden className="pointer-events-none absolute -top-20 -end-16 size-64 rounded-full border border-white/20" />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <span className="inline-flex h-6 items-center rounded-full bg-white/18 px-2.5 text-[12px] font-medium tracking-[0.14em] uppercase backdrop-blur">
                      {t.discount}
                    </span>
                    <h3 className="mt-3 font-display text-[20px] leading-snug font-medium">{o.title}</h3>
                  </div>
                  {o.discountMode && o.discountValue && (
                    <p className="shrink-0 font-display text-[40px] leading-none font-light num sm:text-[48px]" dir="ltr">
                      {o.discountMode === 'PERCENT' ? (
                        `−${Number(o.discountValue)}%`
                      ) : (
                        <>
                          −{Number(o.discountValue)}
                          <span className="ms-1 text-base font-normal">{o.targets[0]?.currencyCode ?? o.currencyCode ?? ''}</span>
                        </>
                      )}
                    </p>
                  )}
                </div>
                {o.description && <p className="relative mt-2 text-sm leading-relaxed text-white/85">{o.description}</p>}
                <p className="relative mt-3 inline-flex items-center gap-1.5 text-[14px] text-white/80">
                  <CalendarClock className="size-4" aria-hidden />
                  <span className="num">{fmt(t.validRange, { from: fDate(o.validFrom, locale, 'short'), to: fDate(o.validTo, locale) })}</span>
                </p>

                <p className="relative eyebrow mt-6 text-white/75">{t.appliesTo}</p>
                <ul className="relative mt-3 grid gap-2">
                  {o.targets.map((target) => {
                    const after = discounted(target.price, o);
                    const path = productPath({ type: target.type, id: target.id });
                    return (
                      <li key={target.id} className="flex flex-wrap items-center gap-3 rounded-tile bg-white/95 p-3 text-[#111418] dark:bg-sky-950/70 dark:text-sky-50">
                        <div className="min-w-0 flex-1">
                          <Link href={path} className="inline-flex items-center gap-1 text-sm font-medium hover:underline underline-offset-4">
                            {target.title}
                            <ArrowUpRight className="size-3.5 rtl-flip" aria-hidden />
                          </Link>
                          <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-xs">
                            <s className="text-[#6b7785] num dark:text-sky-300">
                              <span className="sr-only">{t.oldPrice}: </span>
                              {money(target.price, target.currencyCode, locale)}
                            </s>
                            <span className="text-[16px] font-semibold num">{money(after, target.currencyCode, locale)}</span>
                            <span className="text-[#5a6878] dark:text-sky-300">{t.perPerson}</span>
                          </p>
                        </div>
                        <BookButton
                          href={bookingLink(office, { title: target.title, code: target.code, price: money(after, target.currencyCode, locale), path }, origin)}
                          label={t.bookNow}
                          title={target.title}
                        />
                      </li>
                    );
                  })}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
