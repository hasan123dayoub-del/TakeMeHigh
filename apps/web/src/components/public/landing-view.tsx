'use client';

import { BadgeCheck, CheckCheck, Loader2, MapPin, Search, SearchX } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { defineMessages, fmt, useLocale, useMessages } from '@/lib/i18n';
import { useShowcasePages } from '@/lib/queries/public';
import type { ShowcaseFilters, ShowcaseResponse, TripCard as TripCardData } from '@/lib/types/public';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';
import { AdsMarquee } from './ads-marquee';
import { showcaseParams } from './api';
import { OfficeLogo, WhatsAppIcon } from './atoms';
import { day, tripsCountLabel } from './messages';
import { PublicShell, SiteFooter, SiteHeader } from './site-chrome';
import { TripCard, TripCardSkeleton } from './trip-card';
import { hasActiveFilters, TripFilters } from './trip-filters';

const m = defineMessages({
  ar: {
    eyebrow: 'رحلات من مكاتب سياحية في سوريا',
    titleA: 'رحلتك القادمة',
    titleB: 'تبدأ برسالة',
    lead: 'تصفح رحلات المكاتب السياحية بأسعارها ومقاعدها الحقيقية، ثم راسل المكتب مباشرة على واتساب ليثبّت حجزك.',
    searchPlaceholder: 'إلى أين؟ ابحث عن وجهة أو رحلة',
    searchLabel: 'ابحث عن رحلة',
    searchCta: 'ابحث',
    statTrips: 'رحلة متاحة الآن',
    statDestinations: 'وجهات',
    statNoAccount: 'بدون حساب أو دفع إلكتروني',
    tripsTitle: 'الرحلات المتاحة',
    tripsLead: 'أسعار بعملة كل رحلة، ومقاعد تتحدث لحظياً من نظام المكتب.',
    resultsFor: 'نتائج «{q}»',
    loadMore: 'عرض المزيد',
    shown: 'عرض {shown} من {total}',
    emptyTitle: 'لا توجد رحلات بهذه المواصفات',
    emptyBody: 'جرّب وجهة أخرى أو موعداً مختلفاً، أو امسح التصفية لرؤية كل الرحلات.',
    emptyNoTrips: 'لا توجد رحلات منشورة حالياً',
    emptyNoTripsBody: 'تعود المكاتب لنشر رحلاتها قريباً. تفقّد الصفحة لاحقاً.',
    clearFilters: 'مسح التصفية',
    howEyebrow: 'بدون حساب، بدون دفع إلكتروني',
    howTitle: 'كيف تحجز؟',
    step1: 'اختر رحلتك',
    step1Body: 'قارن البرامج والتواريخ والأسعار والمقاعد المتبقية لدى كل مكتب.',
    step2: 'راسل المكتب على واتساب',
    step2Body: 'زر الحجز يفتح محادثة مع المكتب ومعها رسالة جاهزة فيها اسم الرحلة ورمزها وموعدها.',
    step3: 'يؤكد المكتب مقاعدك',
    step3Body: 'يسجّل المكتب حجزك في نظامه ويؤكده لك، وتدفع لدى المكتب مباشرة.',
    chatOffice: 'المكتب',
    chatReply: 'أهلاً بك! تم تثبيت مقعدين باسمك ✔',
    chatPeople: 'عدد الأشخاص: 2',
    officesTitle: 'تدير مكتباً سياحياً؟',
    officesBody: 'سفرني ينظّم رحلاتك وحجوزاتك ودفعاتك ومقاعدك في مكان واحد، ويمنحك صفحة عامة تظهر رحلاتك هنا.',
    officesCta: 'ادخل إلى لوحة مكتبك',
  },
  en: {
    eyebrow: 'Trips from tourism offices in Syria',
    titleA: 'Your next trip',
    titleB: 'starts with a message',
    lead: 'Browse trips from tourism offices with real prices and live seats, then message the office on WhatsApp to secure your booking.',
    searchPlaceholder: 'Where to? Search a destination or trip',
    searchLabel: 'Search trips',
    searchCta: 'Search',
    statTrips: 'trips open now',
    statDestinations: 'destinations',
    statNoAccount: 'No account, no online payment',
    tripsTitle: 'Available trips',
    tripsLead: 'Prices in each trip’s own currency, seats live from the office’s system.',
    resultsFor: 'Results for “{q}”',
    loadMore: 'Show more',
    shown: 'Showing {shown} of {total}',
    emptyTitle: 'No trips match these filters',
    emptyBody: 'Try another destination or date, or clear the filters to see every trip.',
    emptyNoTrips: 'No trips are published right now',
    emptyNoTripsBody: 'Offices publish new departures regularly. Check back soon.',
    clearFilters: 'Clear filters',
    howEyebrow: 'No account, no online payment',
    howTitle: 'How booking works',
    step1: 'Pick a trip',
    step1Body: 'Compare programmes, dates, prices and seats left across offices.',
    step2: 'Message the office on WhatsApp',
    step2Body: 'The booking button opens a chat with the office, prefilled with the trip name, code and date.',
    step3: 'The office confirms your seats',
    step3Body: 'The office records your booking in its system and confirms it; you pay the office directly.',
    chatOffice: 'Office',
    chatReply: 'Welcome! Two seats are now held in your name ✔',
    chatPeople: 'Travellers: 2',
    officesTitle: 'Do you run a tourism office?',
    officesBody: 'Safarni runs your trips, bookings, payments and seats in one place, and gives you a public page that lists your trips here.',
    officesCta: 'Sign in to your office workspace',
  },
});

export function LandingView({ filters, data }: { filters: ShowcaseFilters; data: ShowcaseResponse }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const apply = (next: ShowcaseFilters) => {
    const qs = showcaseParams(next).toString();
    startTransition(() => router.push(qs ? `/?${qs}#trips` : '/#trips', { scroll: false }));
  };

  return (
    <PublicShell>
      <SiteHeader />
      <AdsMarquee banners={data.banners} className="mx-auto mt-4 w-full max-w-[1440px] sm:mt-6" />
      <Hero key={filters.search ?? ''} filters={filters} data={data} onSearch={(search) => apply({ ...filters, search: search || undefined })} />

      <section id="trips" className="mx-auto w-full max-w-[1280px] scroll-mt-24 px-3 pt-12 sm:px-6 sm:pt-16">
        <Results key={JSON.stringify(filters)} filters={filters} data={data} pending={pending} onChange={apply} />
      </section>

      <HowItWorks />
      <OfficesCta />
      <SiteFooter />
    </PublicShell>
  );
}

/* ------------------------------------------------------------------ hero */

function Hero({ filters, data, onSearch }: { filters: ShowcaseFilters; data: ShowcaseResponse; onSearch: (q: string) => void }) {
  const t = useMessages(m);
  const f = useFormat();
  const [q, setQ] = useState(filters.search ?? '');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(q.trim());
  };

  return (
    <section className="mx-auto w-full max-w-[1280px] px-3 pt-6 sm:px-6 sm:pt-8">
      <div className="relative isolate overflow-hidden rounded-panel bg-altitude px-5 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
        <span aria-hidden className="pointer-events-none absolute -top-32 -end-24 -z-10 size-[460px] rounded-full bg-white/10" />
        <span aria-hidden className="pointer-events-none absolute -bottom-48 -start-24 -z-10 size-[520px] rounded-full border border-white/15" />
        <span aria-hidden className="pointer-events-none absolute -bottom-36 -start-10 -z-10 size-[380px] rounded-full border border-white/10" />

        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div>
            <p className="text-xs font-medium tracking-[0.22em] uppercase opacity-85">{t.eyebrow}</p>
            <h1 className="heading-display mt-3 text-[38px] leading-[1.05] sm:text-[56px] lg:text-[64px]">
              {t.titleA} <strong className="block font-medium">{t.titleB}</strong>
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed opacity-90 sm:text-base">{t.lead}</p>

            <form onSubmit={submit} role="search" className="mt-7 flex max-w-xl items-center gap-2 rounded-full bg-surface-raised p-1.5 text-foreground shadow-pop">
              <Search className="ms-3 size-5 shrink-0 text-muted" aria-hidden />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t.searchPlaceholder}
                aria-label={t.searchLabel}
                maxLength={80}
                className="h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-subtle"
              />
              <Button type="submit" variant="ink" size="lg" className="h-11 px-5 sm:px-7">
                {t.searchCta}
              </Button>
            </form>

            <ul className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
              <li className="flex items-baseline gap-2">
                <span className="num font-display text-2xl font-medium">{f.number(data.meta.total)}</span>
                <span className="opacity-85">{t.statTrips}</span>
              </li>
              <li className="flex items-baseline gap-2">
                <span className="num font-display text-2xl font-medium">{f.number(data.facets.destinations.length)}</span>
                <span className="opacity-85">{t.statDestinations}</span>
              </li>
              <li className="flex items-center gap-2 opacity-90">
                <BadgeCheck className="size-4" aria-hidden />
                {t.statNoAccount}
              </li>
            </ul>
          </div>

          <ChatPreview sample={data.data[0]} className="hidden lg:block" />
        </div>
      </div>
    </section>
  );
}

/** Illustrative WhatsApp conversation: what happens after "Book on WhatsApp". */
function ChatPreview({ sample, className }: { sample?: TripCardData; className?: string }) {
  const t = useMessages(m);
  const f = useFormat();
  if (!sample) return null;
  return (
    <div aria-hidden className={cn('relative mx-auto w-full max-w-sm', className)}>
      <div className="rotate-[-2deg] rounded-[28px] bg-white/95 p-4 text-[#111418] shadow-glass dark:bg-sky-950/80 dark:text-sky-50">
        <div className="flex items-center gap-3 border-b border-black/5 pb-3 dark:border-white/10">
          <OfficeLogo name={sample.office.name} logoUrl={sample.office.logoUrl} brandColor={sample.office.brandColor} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{sample.office.name}</p>
            <p className="text-[11px] text-[#5a6878] dark:text-sky-300">{t.chatOffice} · WhatsApp</p>
          </div>
          <WhatsAppIcon className="ms-auto size-6 text-[#25D366]" />
        </div>
        <div className="grid gap-2 pt-3 text-[13px] leading-relaxed">
          <div className="ms-auto max-w-[85%] rounded-2xl rounded-se-md bg-[#d9fdd3] px-3 py-2 text-[#111418]">
            <p className="font-medium">{sample.title}</p>
            <p className="ltr-nums text-[12px] opacity-75">{sample.code}</p>
            <p className="text-[12px] opacity-75">{f.date(day(sample.departureDate), 'medium')}</p>
            <p className="text-[12px] opacity-75">{t.chatPeople}</p>
            <CheckCheck className="ms-auto size-3.5 text-[#34b7f1]" />
          </div>
          <div className="me-auto max-w-[85%] rounded-2xl rounded-ss-md bg-sky-100 px-3 py-2 text-[#111418] dark:bg-sky-800 dark:text-sky-50">
            {t.chatReply}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ results */

function Results({
  filters,
  data,
  pending,
  onChange,
}: {
  filters: ShowcaseFilters;
  data: ShowcaseResponse;
  pending: boolean;
  onChange: (next: ShowcaseFilters) => void;
}) {
  const t = useMessages(m);
  const { locale } = useLocale();
  const f = useFormat();
  const query = useShowcasePages(filters, data);
  const trips = query.data.pages.flatMap((p) => p.data);
  const total = query.data.pages[0]?.meta.total ?? 0;
  const filtered = hasActiveFilters(filters);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="heading-display text-[28px] leading-tight sm:text-[36px]">
            {filters.search ? fmt(t.resultsFor, { q: filters.search }) : t.tripsTitle}
          </h2>
          <p className="mt-1 text-sm text-muted">{t.tripsLead}</p>
        </div>
        <p className="flex items-center gap-2 text-sm font-medium text-muted" aria-live="polite">
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {tripsCountLabel(total, locale)}
        </p>
      </div>

      <TripFilters
        className="mt-5"
        value={filters}
        onChange={onChange}
        destinations={data.facets.destinations}
        categories={data.facets.categories}
      />

      <div className={cn('mt-6 transition-opacity duration-200', pending && 'pointer-events-none opacity-55')} aria-busy={pending}>
        {trips.length === 0 ? (
          <div className="glass rounded-panel">
            <EmptyState
              icon={SearchX}
              title={filtered ? t.emptyTitle : t.emptyNoTrips}
              description={filtered ? t.emptyBody : t.emptyNoTripsBody}
              action={
                filtered ? (
                  <Button variant="ink" onClick={() => onChange({})}>
                    {t.clearFilters}
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trips.map((trip, i) => (
                <TripCard key={trip.id} trip={trip} className="animate-rise" style={{ animationDelay: `${Math.min(i % 9, 8) * 40}ms` }} />
              ))}
              {query.isFetchingNextPage && Array.from({ length: 3 }, (_, i) => <TripCardSkeleton key={`s${i}`} />)}
            </div>
            <div className="mt-8 flex flex-col items-center gap-3">
              <p className="text-[13px] text-muted">{fmt(t.shown, { shown: f.number(trips.length), total: f.number(total) })}</p>
              {query.hasNextPage && (
                <Button variant="secondary" size="lg" loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
                  {t.loadMore}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ how it works */

function HowItWorks() {
  const t = useMessages(m);
  const steps = [
    { icon: MapPin, title: t.step1, body: t.step1Body },
    { icon: WhatsAppGlyph, title: t.step2, body: t.step2Body },
    { icon: BadgeCheck, title: t.step3, body: t.step3Body },
  ];
  return (
    <section id="how" className="mx-auto w-full max-w-[1280px] scroll-mt-24 px-3 pt-20 sm:px-6">
      <div className="glass rounded-panel p-6 sm:p-10">
        <p className="eyebrow">{t.howEyebrow}</p>
        <h2 className="heading-display mt-2 text-[28px] leading-tight sm:text-[36px]">{t.howTitle}</h2>
        <ol className="relative mt-8 grid gap-6 md:grid-cols-3 md:gap-4">
          <span aria-hidden className="absolute top-7 start-7 end-7 hidden h-0.5 rounded-full bg-linear-to-r from-sky-600 to-sky-300 md:block rtl:bg-linear-to-l" />
          {steps.map((s, i) => (
            <li key={s.title} className="relative flex gap-4 md:flex-col md:gap-5">
              <span className="relative z-10 grid size-14 shrink-0 place-items-center rounded-full bg-ink text-ink-foreground shadow-pop">
                <s.icon className="size-6" />
                <span className="num absolute -top-1 -end-1 grid size-6 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground ring-2 ring-surface-raised">
                  {i + 1}
                </span>
              </span>
              <div>
                <h3 className="font-display text-lg font-medium">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function WhatsAppGlyph({ className }: { className?: string }) {
  return <WhatsAppIcon className={className} />;
}

function OfficesCta() {
  const t = useMessages(m);
  return (
    <section className="mx-auto w-full max-w-[1280px] px-3 pt-6 sm:px-6">
      <div className="relative isolate flex flex-col items-start gap-5 overflow-hidden rounded-panel bg-ink p-6 text-ink-foreground sm:p-10 md:flex-row md:items-center md:justify-between">
        <span aria-hidden className="absolute -end-20 -top-24 -z-10 size-72 rounded-full bg-ink-foreground/5" />
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl font-medium">{t.officesTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed opacity-80">{t.officesBody}</p>
        </div>
        <Link
          href="/login"
          className="inline-flex h-12 shrink-0 items-center rounded-full bg-ink-foreground px-6 text-[15px] font-medium text-ink transition-transform hover:-translate-y-0.5"
        >
          {t.officesCta}
        </Link>
      </div>
    </section>
  );
}
