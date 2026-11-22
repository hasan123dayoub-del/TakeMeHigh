'use client';

/* eslint-disable @next/next/no-img-element -- office cover is an arbitrary remote URL. */

import { CalendarX2, ChevronRight, FileText, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState, type CSSProperties } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { defineMessages, useLocale, useMessages } from '@/lib/i18n';
import type { OfficePageResponse, PublicCategory, ShowcaseFilters, TripCard as TripCardData } from '@/lib/types/public';
import { useFormat } from '@/lib/use-format';
import { AdsMarquee } from './ads-marquee';
import { OfficeLogo, WhatsAppLink } from './atoms';
import { brandAccent, brandSurface } from './brand';
import { pm, tripsCountLabel } from './messages';
import { LocationsPanel, type MapPlace } from './office-map';
import { PublicShell, SiteFooter, SiteHeader } from './site-chrome';
import { TripCard } from './trip-card';
import { hasActiveFilters, TripFilters } from './trip-filters';

const m = defineMessages({
  ar: {
    eyebrow: 'مكتب سياحي على سفرني',
    tripsTitle: 'رحلات المكتب',
    tripsLead: 'كل الرحلات المفتوحة للتسجيل الآن، بأسعارها ومقاعدها الحالية.',
    noTrips: 'لا توجد رحلات مفتوحة حالياً',
    noTripsBody: 'راسل المكتب على واتساب لتعرف موعد رحلاته القادمة.',
    noMatch: 'لا توجد رحلات بهذه المواصفات',
    noMatchBody: 'غيّر التصفية أو امسحها لرؤية كل رحلات المكتب.',
    clear: 'مسح التصفية',
    locationTitle: 'أين نحن',
    locationLead: 'زرنا في المكتب أو أحد فروعنا.',
    mainOffice: 'المكتب الرئيسي',
    branch: 'فرع',
    termsTitle: 'شروط الحجز والإلغاء',
    bookingTerms: 'شروط الحجز',
    cancellationTerms: 'سياسة الإلغاء',
    branchesCount: 'فروع',
    contactTitle: 'تواصل مع المكتب',
  },
  en: {
    eyebrow: 'Tourism office on Safarni',
    tripsTitle: 'Trips by this office',
    tripsLead: 'Every trip open for registration now, with current prices and seats.',
    noTrips: 'No trips are open right now',
    noTripsBody: 'Message the office on WhatsApp to hear about upcoming departures.',
    noMatch: 'No trips match these filters',
    noMatchBody: 'Change or clear the filters to see all of this office’s trips.',
    clear: 'Clear filters',
    locationTitle: 'Where to find us',
    locationLead: 'Visit the office or one of its branches.',
    mainOffice: 'Main office',
    branch: 'Branch',
    termsTitle: 'Booking & cancellation terms',
    bookingTerms: 'Booking terms',
    cancellationTerms: 'Cancellation policy',
    branchesCount: 'branches',
    contactTitle: 'Contact the office',
  },
});

function filterTrips(trips: TripCardData[], f: ShowcaseFilters) {
  const q = f.search?.toLowerCase();
  return trips.filter(
    (t) =>
      (!f.destination || t.destination === f.destination) &&
      (!f.category || t.category?.name === f.category) &&
      (!f.tripType || t.tripType === f.tripType) &&
      (!f.from || t.departureDate >= f.from) &&
      (!f.to || t.departureDate <= f.to) &&
      (!f.offersOnly || !!t.offer) &&
      (!q || t.title.toLowerCase().includes(q) || t.destination.toLowerCase().includes(q)),
  );
}

export function OfficeView({ data }: { data: OfficePageResponse }) {
  const { office, trips, banners } = data;
  const t = useMessages(m);
  const p = useMessages(pm);
  const f = useFormat();
  const { locale } = useLocale();
  const [filters, setFilters] = useState<ShowcaseFilters>({});

  const destinations = useMemo(() => [...new Set(trips.map((x) => x.destination))].sort(), [trips]);
  const categories = useMemo(
    () => [...new Map(trips.filter((x) => x.category).map((x) => [x.category!.name, x.category!] as const)).values()] as PublicCategory[],
    [trips],
  );
  const visible = filterTrips(trips, filters);

  const places: MapPlace[] = [
    {
      key: 'main',
      name: office.name,
      city: office.city,
      address: office.address,
      phone: office.phone,
      location: office.location,
      tag: t.mainOffice,
    },
    ...office.branches.map((b, i) => ({ key: `b${i}`, name: b.name, city: b.city, address: b.address, phone: b.phone, location: b.location })),
  ];

  const surface = brandSurface(office.brandColor);
  const heroStyle: CSSProperties = {
    backgroundImage: `radial-gradient(110% 120% at 100% 0%, ${surface} 0%, transparent 62%), var(--gradient-altitude)`,
  };

  return (
    <PublicShell>
      <SiteHeader />

      <main className="flex-1">
        {/* hero */}
        <section className="mx-auto w-full max-w-[1280px] px-3 pt-4 sm:px-6 sm:pt-6">
          <nav aria-label="breadcrumb" className="mb-3 flex items-center gap-1 px-1 text-[13px] text-muted">
            <Link href="/" className="hover:text-foreground">
              {p.home}
            </Link>
            <ChevronRight className="size-3.5 rtl-flip" aria-hidden />
            <span className="truncate text-foreground">{office.name}</span>
          </nav>
          <div className="relative isolate overflow-hidden rounded-panel text-white" style={heroStyle}>
            {office.coverImageUrl && (
              <>
                <img src={office.coverImageUrl} alt="" className="absolute inset-0 -z-20 size-full object-cover" />
                <span aria-hidden className="absolute inset-0 -z-10 bg-linear-to-t from-black/80 via-black/45 to-black/20" />
              </>
            )}
            <span aria-hidden className="absolute -bottom-40 -start-24 -z-10 size-[460px] rounded-full border border-white/15" />
            <span aria-hidden className="absolute -top-24 -end-16 -z-10 size-80 rounded-full bg-white/8" />
            {/* brand ribbon along the top edge */}
            <span aria-hidden className="absolute inset-x-0 top-0 h-1.5" style={{ background: brandAccent(office.brandColor) }} />

            <div className="grid gap-8 px-5 py-9 sm:px-10 sm:py-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:px-14 lg:py-14">
              <div>
                <OfficeLogo name={office.name} logoUrl={office.logoUrl} brandColor={office.brandColor} size="xl" className="ring-4 ring-white/25" />
                <p className="mt-5 text-xs font-medium tracking-[0.22em] uppercase opacity-85">{t.eyebrow}</p>
                <h1 className="heading-display mt-2 text-[34px] leading-[1.08] sm:text-[52px]">{office.name}</h1>
                {(office.address || office.city) && (
                  <p className="mt-3 flex items-center gap-1.5 text-sm opacity-90">
                    <MapPin className="size-4 shrink-0" aria-hidden />
                    {office.address ?? office.city}
                  </p>
                )}
                {office.description && <p className="mt-4 max-w-2xl text-[15px] leading-relaxed opacity-90">{office.description}</p>}
                <ul className="mt-6 flex flex-wrap gap-2 text-[13px]">
                  <li className="rounded-full bg-white/14 px-3.5 py-2 backdrop-blur">{tripsCountLabel(trips.length, locale)}</li>
                  {office.branches.length > 0 && (
                    <li className="rounded-full bg-white/14 px-3.5 py-2 backdrop-blur">
                      <span className="num">{f.number(office.branches.length)}</span> {t.branchesCount}
                    </li>
                  )}
                </ul>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row lg:flex-col" aria-label={t.contactTitle}>
                <WhatsAppLink href={office.whatsappUrl} size="lg">
                  {p.askWhatsApp}
                </WhatsAppLink>
                <div className="flex gap-2">
                  {office.phone && (
                    <a
                      href={`tel:${office.phone.replace(/[^\d+]/g, '')}`}
                      className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-medium text-[#111418] transition-transform hover:-translate-y-0.5"
                    >
                      <Phone className="size-4" aria-hidden />
                      {p.call}
                      <span className="ltr-nums hidden text-[#5a6878] sm:inline">{office.phone}</span>
                    </a>
                  )}
                  {office.email && (
                    <a
                      href={`mailto:${office.email}`}
                      aria-label={`${p.email}: ${office.email}`}
                      className="grid size-12 shrink-0 place-items-center rounded-full bg-white/15 backdrop-blur transition-colors hover:bg-white/25"
                    >
                      <Mail className="size-4" aria-hidden />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {banners.length > 0 && <AdsMarquee banners={banners} showOffice={false} className="mx-auto mt-6 w-full max-w-[1440px]" />}

        {/* trips */}
        <section id="trips" className="mx-auto w-full max-w-[1280px] scroll-mt-24 px-3 pt-12 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="heading-display text-[26px] leading-tight sm:text-[34px]">{t.tripsTitle}</h2>
              <p className="mt-1 text-sm text-muted">{t.tripsLead}</p>
            </div>
            <p className="text-sm font-medium text-muted" aria-live="polite">
              {tripsCountLabel(visible.length, locale)}
            </p>
          </div>
          {trips.length > 1 && (
            <TripFilters className="mt-5" value={filters} onChange={setFilters} destinations={destinations} categories={categories} />
          )}
          <div className="mt-6">
            {visible.length === 0 ? (
              <div className="glass rounded-panel">
                <EmptyState
                  icon={CalendarX2}
                  title={trips.length ? t.noMatch : t.noTrips}
                  description={trips.length ? t.noMatchBody : t.noTripsBody}
                  action={
                    hasActiveFilters(filters) ? (
                      <Button variant="ink" onClick={() => setFilters({})}>
                        {t.clear}
                      </Button>
                    ) : (
                      <WhatsAppLink href={office.whatsappUrl}>{p.askWhatsApp}</WhatsAppLink>
                    )
                  }
                />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((trip) => (
                  <TripCard key={trip.id} trip={trip} showOffice={false} className="animate-rise" />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* location */}
        <section id="location" className="mx-auto w-full max-w-[1280px] scroll-mt-24 px-3 pt-16 sm:px-6">
          <div className="glass rounded-panel p-4 sm:p-8">
            <h2 className="heading-display text-[24px] leading-tight sm:text-[30px]">{t.locationTitle}</h2>
            <p className="mt-1 mb-5 text-sm text-muted">{t.locationLead}</p>
            <LocationsPanel places={places} />
          </div>
        </section>

        {/* terms */}
        {(office.bookingTerms || office.cancellationTerms) && (
          <section className="mx-auto w-full max-w-[1280px] px-3 pt-6 sm:px-6">
            <h2 className="sr-only">{t.termsTitle}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {office.bookingTerms && <TermsCard icon="booking" title={t.bookingTerms} body={office.bookingTerms} />}
              {office.cancellationTerms && <TermsCard icon="cancel" title={t.cancellationTerms} body={office.cancellationTerms} />}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </PublicShell>
  );
}

export function TermsCard({ icon, title, body }: { icon: 'booking' | 'cancel'; title: string; body: string }) {
  const Icon = icon === 'booking' ? FileText : ShieldCheck;
  return (
    <div className="rounded-card border border-glass-border bg-surface-raised p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-full bg-accent-soft text-accent-foreground">
          <Icon className="size-4" aria-hidden />
        </span>
        <h3 className="font-display text-base font-medium">{title}</h3>
      </div>
      <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-muted">{body}</p>
    </div>
  );
}
