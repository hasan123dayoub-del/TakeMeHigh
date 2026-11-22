'use client';

import { Check, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { defineMessages, useLocale, useMessages } from '@/lib/i18n';
import type { TripDetails } from '@/lib/types/public';
import { useFormat } from '@/lib/use-format';
import { IncludesRow, OfferChip, OfferEnds, OfficeLogo, PriceTag, SeatsBadge, ServiceIcon, TripCover, TripTypeBadge, WhatsAppLink } from './atoms';
import { day, daysLabel, nightsLabel, pm } from './messages';
import { GoogleMapsLink, MapFrame } from './office-map';
import { TermsCard } from './office-view';
import { PublicShell, SiteFooter, SiteHeader } from './site-chrome';

const m = defineMessages({
  ar: {
    departure: 'الانطلاق',
    return: 'العودة',
    duration: 'المدة',
    closes: 'يغلق التسجيل',
    seats: 'المقاعد',
    itinerary: 'برنامج الرحلة',
    day: 'اليوم {n}',
    services: 'الخدمات المشمولة',
    accommodation: 'الإقامة',
    transport: 'النقل',
    bookingTerms: 'شروط الحجز',
    cancellationTerms: 'سياسة الإلغاء',
    departsFrom: 'تنطلق من {branch}',
    code: 'رمز الرحلة',
  },
  en: {
    departure: 'Departure',
    return: 'Return',
    duration: 'Duration',
    closes: 'Registration closes',
    seats: 'Seats',
    itinerary: 'Itinerary',
    day: 'Day {n}',
    services: 'Included services',
    accommodation: 'Accommodation',
    transport: 'Transport',
    bookingTerms: 'Booking terms',
    cancellationTerms: 'Cancellation policy',
    departsFrom: 'Departs from {branch}',
    code: 'Trip code',
  },
});

export function TripView({ trip }: { trip: TripDetails }) {
  const t = useMessages(m);
  const p = useMessages(pm);
  const f = useFormat();
  const { locale } = useLocale();
  const soldOut = trip.seatsAvailable <= 0;
  const cta = soldOut ? p.waitingListWhatsApp : p.bookWhatsApp;
  const cover = trip.coverImageUrl ?? trip.images[0]?.url ?? null;
  const facts = [
    [t.departure, f.date(day(trip.departureDate), 'long')],
    [t.return, f.date(day(trip.returnDate), 'long')],
    [t.duration, `${daysLabel(trip.days, locale)} · ${nightsLabel(trip.nights, locale)}`],
    ...(trip.registrationClosesOn ? [[t.closes, f.date(day(trip.registrationClosesOn), 'medium')]] : []),
  ];

  return (
    <PublicShell className="pb-24 lg:pb-0">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-3 pt-4 sm:px-6 sm:pt-6">
        <nav aria-label="breadcrumb" className="mb-3 flex items-center gap-1 px-1 text-[13px] text-muted">
          <Link href="/" className="hover:text-foreground">{p.home}</Link>
          <ChevronRight className="size-3.5 rtl-flip" aria-hidden />
          <Link href={`/${trip.office.slug}`} className="truncate hover:text-foreground">{trip.office.name}</Link>
          <ChevronRight className="size-3.5 rtl-flip" aria-hidden />
          <span className="truncate text-foreground">{trip.title}</span>
        </nav>

        <TripCover large title={trip.title} destination={trip.destination} imageUrl={cover} className="flex h-[260px] items-end rounded-panel sm:h-[400px]">
          <div className="w-full p-5 text-white sm:p-8">
            <div className="flex flex-wrap gap-2">
              <TripTypeBadge tripType={trip.tripType} />
              {trip.offer && <OfferChip trip={trip} className="bg-surface-raised/95" />}
            </div>
            <h1 className="heading-display mt-3 text-[30px] leading-[1.1] sm:text-[48px]">{trip.title}</h1>
            <p className="mt-1 text-sm opacity-90">{trip.destination}</p>
          </div>
        </TripCover>

        {trip.images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-none">
            {trip.images.map((img) => (
              // eslint-disable-next-line @next/next/no-img-element -- remote office images
              <img key={img.url} src={img.url} alt={img.caption ?? trip.title} className="h-24 w-36 shrink-0 rounded-tile object-cover" loading="lazy" />
            ))}
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="grid content-start gap-6">
            <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {facts.map(([k, v]) => (
                <div key={k} className="rounded-tile border border-glass-border bg-surface-raised p-4">
                  <dt className="eyebrow">{k}</dt>
                  <dd className="mt-1 text-sm font-medium">{v}</dd>
                </div>
              ))}
            </dl>

            {trip.description && <p className="text-[15px] leading-relaxed text-muted">{trip.description}</p>}

            {trip.itinerary.length > 0 && (
              <section className="glass rounded-panel p-5 sm:p-8">
                <h2 className="heading-display text-[22px] sm:text-[28px]">{t.itinerary}</h2>
                <ol className="relative mt-6 grid gap-5">
                  <span aria-hidden className="absolute top-3 bottom-3 start-[13px] w-0.5 rounded-full bg-linear-to-b from-sky-600 to-sky-300" />
                  {trip.itinerary.map((d) => (
                    <li key={d.dayNumber} className="relative flex gap-4">
                      <span className="z-10 grid size-7 shrink-0 place-items-center rounded-full bg-sky-600 text-white">
                        <Check className="size-3.5" strokeWidth={3} aria-hidden />
                      </span>
                      <div>
                        <p className="eyebrow">{t.day.replace('{n}', String(d.dayNumber))}{d.location ? ` · ${d.location}` : ''}</p>
                        <h3 className="font-medium">{d.title}</h3>
                        {d.description && <p className="mt-1 text-sm leading-relaxed text-muted">{d.description}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {(trip.services.length > 0 || trip.accommodationInfo || trip.transportationInfo) && (
              <section className="rounded-card border border-glass-border bg-surface-raised p-5 sm:p-6">
                <h2 className="font-display text-lg font-medium">{t.services}</h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {trip.services.map((s, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-foreground">
                        <ServiceIcon type={s.type} className="size-4" />
                      </span>
                      <span>
                        <span className="block text-sm font-medium">{p[s.type]}</span>
                        {s.description && <span className="block text-[13px] text-muted">{s.description}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
                {trip.accommodationInfo && <p className="mt-4 text-sm text-muted"><strong className="text-foreground">{t.accommodation}: </strong>{trip.accommodationInfo}</p>}
                {trip.transportationInfo && <p className="mt-1 text-sm text-muted"><strong className="text-foreground">{t.transport}: </strong>{trip.transportationInfo}</p>}
              </section>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              {trip.bookingTerms && <TermsCard icon="booking" title={t.bookingTerms} body={trip.bookingTerms} />}
              {trip.cancellationTerms && <TermsCard icon="cancel" title={t.cancellationTerms} body={trip.cancellationTerms} />}
            </div>
          </div>

          <aside className="grid content-start gap-4 lg:sticky lg:top-24">
            <div className="glass rounded-panel p-5 sm:p-6">
              <PriceTag trip={trip} size="lg" />
              <OfferEnds trip={trip} className="mt-2" />
              <div className="mt-4 flex flex-wrap gap-2">
                <SeatsBadge seats={trip.seatsAvailable} />
                <IncludesRow includes={trip.includes} />
              </div>
              <WhatsAppLink href={trip.whatsappUrl} size="lg" className="mt-5 w-full">{cta}</WhatsAppLink>
              <p className="mt-3 text-[12px] text-muted">{t.code}: <span className="ltr-nums">{trip.code}</span></p>
            </div>

            <div className="rounded-card border border-glass-border bg-surface-raised p-5">
              <Link href={`/${trip.office.slug}`} className="flex items-center gap-3 hover:text-primary">
                <OfficeLogo name={trip.office.name} logoUrl={trip.office.logoUrl} brandColor={trip.office.brandColor} size="lg" />
                <span>
                  <span className="block font-medium">{trip.office.name}</span>
                  <span className="block text-[13px] text-muted">{t.departsFrom.replace('{branch}', trip.branch.name)}</span>
                </span>
              </Link>
              <MapFrame place={{ key: 'branch', name: trip.branch.name, location: trip.branch.location }} className="mt-4 h-[200px]" />
              <div className="mt-3 flex flex-wrap gap-2">
                <GoogleMapsLink location={trip.branch.location} />
                <Link href={`/${trip.office.slug}`} className="inline-flex h-9 items-center rounded-full px-3 text-[13px] font-medium text-primary hover:underline">{p.viewOffice}</Link>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* mobile sticky CTA */}
      <div className="glass fixed inset-x-2 bottom-2 z-40 flex items-center justify-between gap-3 rounded-full py-2 ps-5 pe-2 lg:hidden">
        <span className="num text-sm font-semibold"><span className="ltr-nums">{f.money(trip.priceAfterOffer, trip.currencyCode)}</span></span>
        <WhatsAppLink href={trip.whatsappUrl}>{cta}</WhatsAppLink>
      </div>
      <SiteFooter />
    </PublicShell>
  );
}
