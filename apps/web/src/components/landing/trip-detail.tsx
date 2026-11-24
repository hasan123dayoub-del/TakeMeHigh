import { LABELS } from '@travelos/shared';
import { CalendarDays, Clock, MapPin, Star } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getLocale, getMessages } from '@/lib/i18n/server';
import { fmt } from '@/lib/i18n/shared';
import { BookingCard, Breadcrumbs, DetailHero, FactsGrid, Panel, Prose } from './detail-parts';
import { Gallery } from './gallery';
import { SERVICE_ICON, TRANSPORT_ICON } from './icons';
import { landingMessages } from './messages';
import { RouteLine } from './product-card';
import { getOrigin, getSite, getTrip } from './server';
import { bookingLink, cityName, days, fDate, fRange, money, nameOf, officeName, productPath, routeOf } from './utils';

/** Public trip page: gallery, itinerary without line prices (PRC-07), boarding points (BR-15). */
export async function TripDetail({ id }: { id: string }) {
  const [trip, site, locale, t, origin] = await Promise.all([getTrip(id), getSite(), getLocale(), getMessages(landingMessages), getOrigin()]);
  if (!trip || !site) notFound();

  const length = days(trip.startsAt, trip.endsAt);
  const images = [...(trip.coverImageUrl ? [{ url: trip.coverImageUrl, caption: null }] : []), ...trip.images.filter((i) => i.url !== trip.coverImageUrl)];
  const bookHref = bookingLink(
    site.office,
    { title: trip.title, code: trip.code, price: money(trip.finalPrice, trip.currencyCode, locale), path: productPath(trip) },
    origin,
    trip.branch?.whatsapp,
  );
  const contact = trip.branch
    ? { label: trip.branch.name, phone: trip.branch.phone }
    : { label: officeName(site.office, locale), phone: site.office.phone };

  return (
    <div className="mx-auto max-w-[1280px] px-3 pt-6 pb-28 sm:px-6 lg:pb-0">
      <Breadcrumbs t={t} current={trip.title} section={{ href: '/#trips', label: t.navTrips }} />
      <div className="mt-4">
        <DetailHero item={trip} t={t} locale={locale}>
          <RouteLine cities={routeOf(trip, locale)} className="mt-3 text-[15px] text-white/90 [&_.text-foreground]:text-white [&_.text-primary]:text-white [&_.text-subtle]:text-white/70" />
          <p className="mt-2 inline-flex items-center gap-2 text-sm text-white/85">
            <CalendarDays className="size-4" aria-hidden />
            <span className="num">{fRange(trip.startsAt, trip.endsAt, locale)}</span>
            {length && <span>· {length === 1 ? t.durationOne : fmt(t.duration, { n: length })}</span>}
          </p>
        </DetailHero>
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-6">
          <Panel id="overview" title={t.overview}>
            {trip.description && <Prose text={trip.description} className="mb-6" />}
            <FactsGrid
              facts={[
                { label: t.code, value: <span className="num" dir="ltr">{trip.code}</span> },
                { label: t.category, value: nameOf(trip.category, locale) },
                { label: t.scope, value: LABELS.travelScope[trip.scope][locale] },
                {
                  label: t.transport,
                  value: trip.transportModes.map((m) => LABELS.transportMode[m][locale]).join('، ') || '—',
                },
              ]}
            />
          </Panel>

          {images.length > 1 && (
            <Panel id="gallery" title={t.gallery}>
              <Gallery images={images} title={trip.title} />
            </Panel>
          )}

          {trip.itinerary.length > 0 && (
            <Panel id="itinerary" title={t.itinerary} description={t.itineraryBody}>
              <ol className="relative grid gap-4">
                <span aria-hidden className="absolute start-[19px] top-5 bottom-5 w-0.5 rounded-full bg-linear-to-b from-sky-600 to-sky-200" />
                {trip.itinerary.map((line, i) => {
                  const Icon = line.service.kind === 'TRANSPORT' && line.transportMode ? TRANSPORT_ICON[line.transportMode] : SERVICE_ICON[line.service.kind];
                  const from = cityName(line.fromCity, locale);
                  const to = cityName(line.toCity, locale);
                  return (
                    <li key={i} className="relative flex gap-4">
                      <span className="relative z-10 grid size-10 shrink-0 place-items-center rounded-full bg-altitude shadow-primary">
                        <Icon className="size-[18px]" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1 rounded-tile bg-surface p-4">
                        <p className="eyebrow">
                          {nameOf(line.service, locale)}
                          {line.transportMode ? ` · ${LABELS.transportMode[line.transportMode][locale]}` : ''}
                        </p>
                        <p className="mt-1 font-medium">{line.item.name}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
                          <span className="inline-flex items-center gap-1">
                            {line.item.company.name}
                            {line.item.company.rating ? (
                              <span className="inline-flex items-center gap-0.5 text-warning" aria-label={fmt(t.rating, { n: line.item.company.rating })}>
                                {Array.from({ length: line.item.company.rating }, (_, s) => (
                                  <Star key={s} className="size-3 fill-current" aria-hidden />
                                ))}
                              </span>
                            ) : null}
                          </span>
                          {(from || to) && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="size-3.5" aria-hidden />
                              {from && to ? (
                                <>
                                  {from} <span aria-hidden className="inline-block rtl:rotate-180">→</span> {to}
                                </>
                              ) : (
                                to || from
                              )}
                            </span>
                          )}
                          {line.startsAt && (
                            <span className="inline-flex items-center gap-1 num">
                              <Clock className="size-3.5" aria-hidden />
                              {fDate(line.startsAt, locale, 'dateTime')}
                              {line.endsAt && <> – {fDate(line.endsAt, locale, 'dateTime')}</>}
                            </span>
                          )}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Panel>
          )}

          {trip.pickupPoints.length > 0 && (
            <Panel id="boarding" title={t.boardingPoints} description={t.boardingNote}>
              <ul className="grid gap-2.5 sm:grid-cols-2">
                <li className="flex items-center justify-between gap-3 rounded-tile bg-surface p-4">
                  <span className="flex items-center gap-2.5">
                    <MapPin className="size-4 text-primary" aria-hidden />
                    <span className="font-medium">{cityName(trip.originCity, locale)}</span>
                  </span>
                  <span className="text-xs text-muted">{t.boardingNoSurcharge}</span>
                </li>
                {trip.pickupPoints.map((p, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 rounded-tile bg-surface p-4">
                    <span className="min-w-0">
                      <span className="flex items-center gap-2.5">
                        <MapPin className="size-4 text-primary" aria-hidden />
                        <span className="font-medium">{cityName(p.city, locale)}</span>
                      </span>
                      {p.pickupTime && <span className="mt-0.5 block ps-6.5 text-xs text-muted num">{fmt(t.boardingAt, { time: p.pickupTime })}</span>}
                    </span>
                    <span className="shrink-0 rounded-full bg-warning/12 px-2.5 py-1 text-xs font-medium text-[color-mix(in_srgb,var(--warning)_72%,var(--text))] num">
                      {Number(p.surcharge ?? 0) > 0 ? fmt(t.boardingSurcharge, { amount: money(p.surcharge, trip.currencyCode, locale) }) : t.boardingNoSurcharge}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {trip.terms && (
            <Panel id="terms" title={t.terms}>
              <Prose text={trip.terms} className="text-sm text-muted" />
            </Panel>
          )}
        </div>

        <BookingCard item={trip} t={t} locale={locale} bookHref={bookHref} contact={contact} />
      </div>
    </div>
  );
}
