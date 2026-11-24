import { LABELS } from '@travelos/shared';
import { CalendarDays } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getLocale, getMessages } from '@/lib/i18n/server';
import { fmt } from '@/lib/i18n/shared';
import { BookingCard, Breadcrumbs, DetailHero, FactsGrid, Panel, Prose } from './detail-parts';
import { SERVICE_ICON, TRANSPORT_ICON } from './icons';
import { landingMessages } from './messages';
import { RouteLine } from './product-card';
import { getOrigin, getProgram, getSite } from './server';
import { bookingLink, cityName, days, fRange, money, nameOf, officeName, productPath, routeOf } from './utils';

/** Public program page: the chain of legs, full price only (PRC-07). */
export async function ProgramDetail({ id }: { id: string }) {
  const [program, site, locale, t, origin] = await Promise.all([getProgram(id), getSite(), getLocale(), getMessages(landingMessages), getOrigin()]);
  if (!program || !site) notFound();

  const length = days(program.startsAt, program.endsAt);
  const bookHref = bookingLink(
    site.office,
    { title: program.title, code: program.code, price: money(program.finalPrice, program.currencyCode, locale), path: productPath(program) },
    origin,
  );

  return (
    <div className="mx-auto max-w-[1280px] px-3 pt-6 pb-28 sm:px-6 lg:pb-0">
      <Breadcrumbs t={t} current={program.title} section={{ href: '/#trips', label: t.navTrips }} />
      <div className="mt-4">
        <DetailHero item={program} t={t} locale={locale}>
          <RouteLine cities={routeOf(program, locale)} className="mt-3 text-[15px] text-white/90 [&_.text-foreground]:text-white [&_.text-primary]:text-white [&_.text-subtle]:text-white/70" />
          <p className="mt-2 inline-flex items-center gap-2 text-sm text-white/85">
            <CalendarDays className="size-4" aria-hidden />
            <span className="num">{fRange(program.startsAt, program.endsAt, locale)}</span>
            {length && <span>· {length === 1 ? t.durationOne : fmt(t.duration, { n: length })}</span>}
          </p>
        </DetailHero>
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-6">
          <Panel id="overview" title={t.overview}>
            {program.description && <Prose text={program.description} className="mb-6" />}
            <FactsGrid
              facts={[
                { label: t.code, value: <span className="num" dir="ltr">{program.code}</span> },
                { label: t.category, value: nameOf(program.category, locale) },
                { label: t.scope, value: LABELS.travelScope[program.scope][locale] },
                { label: t.legsCount, value: <span className="num">{program.legs.length}</span> },
              ]}
            />
            {(program.services.length > 0 || program.transportModes.length > 0) && (
              <ul className="mt-4 flex flex-wrap gap-1.5" aria-label={t.services}>
                {program.transportModes.map((m) => {
                  const Icon = TRANSPORT_ICON[m];
                  return (
                    <li key={m} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-accent-soft px-3 text-xs font-medium text-accent-foreground">
                      <Icon className="size-3.5" aria-hidden />
                      {LABELS.transportMode[m][locale]}
                    </li>
                  );
                })}
                {program.services.map((s) => {
                  const Icon = SERVICE_ICON[s];
                  return (
                    <li key={s} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 text-xs text-muted">
                      <Icon className="size-3.5" aria-hidden />
                      {LABELS.serviceKind[s][locale]}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          {program.legs.length > 0 && (
            <Panel id="legs" title={t.programLegs} description={t.programLegsBody}>
              <ol className="relative grid gap-4">
                <span aria-hidden className="absolute start-[19px] top-5 bottom-5 w-0.5 rounded-full bg-linear-to-b from-sky-600 to-sky-200" />
                {program.legs.map((leg, i) => (
                  <li key={leg.code} className="relative flex gap-4">
                    <span className="relative z-10 grid size-10 shrink-0 place-items-center rounded-full bg-altitude font-display text-sm font-medium shadow-primary num">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1 rounded-tile bg-surface p-4">
                      <p className="eyebrow num ltr-nums w-fit">
                        {leg.code}
                      </p>
                      <p className="mt-1 font-medium">{leg.title}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <RouteLine cities={[cityName(leg.originCity, locale), cityName(leg.destinationCity, locale)]} />
                        <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
                          <CalendarDays className="size-3.5 text-primary" aria-hidden />
                          <span className="num">{fRange(leg.startsAt, leg.endsAt, locale)}</span>
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>
          )}

          {program.terms && (
            <Panel id="terms" title={t.terms}>
              <Prose text={program.terms} className="text-sm text-muted" />
            </Panel>
          )}
        </div>

        <BookingCard
          item={program}
          t={t}
          locale={locale}
          bookHref={bookHref}
          contact={{ label: officeName(site.office, locale), phone: site.office.phone }}
        />
      </div>
    </div>
  );
}
