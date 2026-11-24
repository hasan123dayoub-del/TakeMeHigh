import { getLocale, getMessages } from '@/lib/i18n/server';
import { AboutSection } from './about-section';
import { Catalog, type DestinationOption } from './catalog';
import { Hero } from './hero';
import { landingMessages } from './messages';
import { OffersSection } from './offers-section';
import { Reveal } from './reveal';
import { SectionHeading } from './section-heading';
import { BranchesSection, DesignCta, PoliciesSection } from './sections';
import { getOffers, getOrigin, getPrograms, getSite, getTrips } from './server';
import type { PublicCity } from './types';
import { CATALOG_PAGE_SIZE, chatLink } from './utils';

/** The public landing page (LND-01, LND-02), rendered on the server for SEO. */
export async function LandingPage() {
  const firstPage = `page=1&pageSize=${CATALOG_PAGE_SIZE}`;
  const wide = 'page=1&pageSize=24';
  const [site, locale, t, origin, trips, programs, offers, allTrips, allPrograms] = await Promise.all([
    getSite(),
    getLocale(),
    getMessages(landingMessages),
    getOrigin(),
    getTrips(firstPage),
    getPrograms(firstPage),
    getOffers(),
    getTrips(wide),
    getPrograms(wide),
  ]);
  if (!site) {
    return <p className="mx-auto max-w-xl px-6 py-24 text-center text-muted">{t.notFoundBody}</p>;
  }

  // Destination filter: every destination that has at least one open trip or program leg.
  const cities = new Map<string, PublicCity>();
  for (const trip of allTrips?.data ?? []) cities.set(trip.destinationCity.id, trip.destinationCity);
  for (const p of allPrograms?.data ?? []) for (const leg of p.legs) cities.set(leg.destinationCity.id, leg.destinationCity);
  const destinations: DestinationOption[] = [...cities.values()]
    .map((c) => ({ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn, country: c.country.nameAr }))
    .sort((a, b) => a.country.localeCompare(b.country, 'ar') || a.nameAr.localeCompare(b.nameAr, 'ar'));

  const whatsappHref = chatLink(site.office.whatsappNumber, locale === 'ar' ? 'مرحباً، أرغب بالاستفسار عن رحلاتكم.' : 'Hello, I would like to ask about your trips.');
  const openCount = (trips?.meta.total ?? 0) + (programs?.meta.total ?? 0);

  return (
    <>
      <Hero site={site} t={t} locale={locale} whatsappHref={whatsappHref} openCount={openCount} offersCount={offers.length} />

      <section id="trips" aria-labelledby="trips-title" className="scroll-mt-24 px-3 pt-16 sm:px-6 sm:pt-24">
        <div className="glass mx-auto max-w-[1280px] rounded-panel p-4 sm:p-8 lg:p-10">
          <Reveal>
            <SectionHeading id="trips-title" eyebrow={t.catalogEyebrow} titleA={t.catalogTitleA} titleB={t.catalogTitleB} body={t.catalogBody} className="mb-8" />
          </Reveal>
          <Catalog
            initialTrips={trips}
            initialPrograms={programs}
            categories={site.categories}
            destinations={destinations}
            office={site.office}
            origin={origin}
          />
        </div>
      </section>

      <OffersSection offers={offers} office={site.office} origin={origin} t={t} locale={locale} />

      <DesignCta t={t} />

      <AboutSection site={site} t={t} />

      <BranchesSection branches={site.branches} t={t} locale={locale} />
      <PoliciesSection policies={site.policies} t={t} />
    </>
  );
}
