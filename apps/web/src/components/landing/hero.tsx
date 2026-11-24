import { ArrowDown, Sparkles } from 'lucide-react';
import Link from 'next/link';
import type { Locale } from '@/lib/i18n/shared';
import { WhatsAppIcon } from './icons';
import type { LandingMessages } from './messages';
import { HeroSlider, type HeroSlide } from './hero-slider';
import type { PublicSite } from './types';
import { officeName } from './utils';

export function Hero({
  site,
  t,
  locale,
  whatsappHref,
  openCount,
  offersCount,
}: {
  site: PublicSite;
  t: LandingMessages;
  locale: Locale;
  whatsappHref: string | null;
  openCount: number;
  offersCount: number;
}) {
  const { office } = site;
  const name = officeName(office, locale);
  const kind = { TRIP: t.trip, PROGRAM: t.program, OFFER: t.navOffers } as Record<string, string>;
  const slides: HeroSlide[] = site.slides.map((s) => ({
    id: s.id,
    title: s.title,
    subtitle: s.subtitle,
    imageUrl: s.imageUrl,
    kindLabel: kind[s.linkType] ?? null,
    href:
      s.linkType === 'TRIP' && s.tripId
        ? `/trips/${s.tripId}`
        : s.linkType === 'PROGRAM' && s.programId
          ? `/programs/${s.programId}`
          : s.linkType === 'OFFER' && s.offerId
            ? `/#offer-${s.offerId}`
            : null,
  }));
  const stats = [
    { value: openCount, label: t.heroStatTrips },
    { value: offersCount, label: t.heroStatOffers },
    { value: site.branches.length, label: t.heroStatBranches },
  ].filter((s) => s.value > 0);

  return (
    <section aria-labelledby="hero-title" className="px-3 pt-3 sm:px-6">
      <div className="relative mx-auto max-w-[1280px] overflow-hidden rounded-panel bg-altitude">
        {office.heroImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={office.heroImageUrl} alt="" aria-hidden className="absolute inset-0 size-full object-cover opacity-20 mix-blend-luminosity" />
        )}
        <span aria-hidden className="pointer-events-none absolute -top-40 -start-32 size-[520px] rounded-full bg-white/8" />
        <span aria-hidden className="pointer-events-none absolute -bottom-56 end-[30%] size-[560px] rounded-full border border-white/15" />
        <span aria-hidden className="pointer-events-none absolute -bottom-40 end-[34%] size-[400px] rounded-full border border-white/10" />
        <svg aria-hidden viewBox="0 0 120 50" className="scene-cloud pointer-events-none absolute top-[12%] w-36 text-white/25 [animation-duration:58s]"><path d="M18 44 C4 44 4 26 18 26 C18 12 38 8 46 18 C52 4 78 4 82 20 C96 14 112 24 104 36 C114 40 110 46 100 46 Z" fill="currentColor" /></svg>
        <svg aria-hidden viewBox="0 0 120 50" className="scene-cloud pointer-events-none absolute top-[62%] w-52 text-white/15 [animation-delay:-26s] [animation-duration:84s]"><path d="M18 44 C4 44 4 26 18 26 C18 12 38 8 46 18 C52 4 78 4 82 20 C96 14 112 24 104 36 C114 40 110 46 100 46 Z" fill="currentColor" /></svg>
        <span aria-hidden className="hero-flight pointer-events-none">
          <svg viewBox="0 0 48 48" className="size-9 -translate-x-1/2 -translate-y-1/2 text-white/90 drop-shadow-[0_6px_10px_rgb(10_22_38/0.35)]"><path d="M44 24 c0-1.6-1.4-2.6-3-2.6 H30 L19 5 h-4.5 l5.5 16.4 H10 l-3.6-4.6 H3 l2.4 7.2 L3 31.2 h3.4 L10 26.6 h10 L14.5 43 H19 l11-16.4 h11 c1.6 0 3-1 3-2.6 Z" fill="currentColor" /></svg>
        </span>

        <div className="relative grid items-center gap-8 p-5 pt-10 sm:p-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12 lg:p-14">
          <div className="animate-rise">
            <p className="flex items-center gap-2 text-xs font-medium tracking-[0.22em] text-white/80 uppercase">
              <Sparkles className="size-3.5" aria-hidden />
              {t.heroEyebrow}
            </p>
            <h1 id="hero-title" className="heading-display mt-4 text-[36px] leading-[1.08] sm:text-[50px] lg:text-[58px]">
              <strong className="font-medium">{name}</strong>
            </h1>
            <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-white/90 sm:text-[19px]">{office.tagline || t.heroFallbackTagline}</p>

            <div className="mt-8 flex flex-wrap gap-2.5">
              <Link
                href="#trips"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[16px] font-medium text-[#111418] shadow-pop transition-transform hover:-translate-y-0.5"
              >
                {t.browseTrips}
                <ArrowDown className="size-4" aria-hidden />
              </Link>
              <Link
                href="/design-your-trip"
                className="inline-flex h-12 items-center rounded-full border border-white/40 bg-white/10 px-6 text-[16px] font-medium text-white backdrop-blur-md transition-colors hover:bg-white/20"
              >
                {t.designTrip}
              </Link>
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center gap-2 rounded-full px-4 text-[16px] font-medium text-white underline-offset-4 hover:underline"
                >
                  <WhatsAppIcon className="size-5" />
                  {t.chatOnWhatsapp}
                </a>
              )}
            </div>

            {stats.length > 0 && (
              <dl className="mt-10 grid max-w-md grid-cols-3 gap-3 border-t border-white/20 pt-6">
                {stats.map((s) => (
                  <div key={s.label}>
                    <dt className="sr-only">{s.label}</dt>
                    <dd className="font-display text-[30px] leading-none font-light num sm:text-[36px]">{s.value}</dd>
                    <dd aria-hidden className="mt-1.5 text-xs leading-snug text-white/75">
                      {s.label}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <HeroSlider slides={slides} />
        </div>
      </div>
    </section>
  );
}
