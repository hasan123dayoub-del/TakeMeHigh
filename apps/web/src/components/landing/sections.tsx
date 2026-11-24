import { ArrowUpRight, BedDouble, Clock, FileText, MapPin, Navigation, Phone, Route, Send } from 'lucide-react';
import Link from 'next/link';
import { fmt, type Locale } from '@/lib/i18n/shared';
import { WhatsAppIcon } from './icons';
import type { LandingMessages } from './messages';
import { Reveal } from './reveal';
import { SectionHeading } from './section-heading';
import type { PublicBranch, PublicSite } from './types';
import { chatLink, cityName, telHref } from './utils';

export function mapHref(b: PublicBranch) {
  if (b.latitude && b.longitude) return `https://www.google.com/maps/search/?api=1&query=${b.latitude},${b.longitude}`;
  const q = [b.address, b.city?.nameAr].filter(Boolean).join(' ');
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}

export function BranchesSection({ branches, t, locale }: { branches: PublicBranch[]; t: LandingMessages; locale: Locale }) {
  if (!branches.length) return null;
  return (
    <section id="branches" aria-labelledby="branches-title" className="scroll-mt-24 px-3 pt-24 sm:px-6">
      <div className="mx-auto max-w-[1280px]">
        <Reveal>
          <SectionHeading id="branches-title" eyebrow={t.branchesEyebrow} titleA={t.branchesTitleA} titleB={t.branchesTitleB} body={t.branchesBody} />
        </Reveal>
        <ul className="mt-10 grid gap-5 md:grid-cols-2">
          {branches.map((b, i) => {
            const map = mapHref(b);
            const wa = chatLink(b.whatsapp, fmt(t.branchWhatsappMessage, { branch: b.name }));
            return (
              <li key={b.id}>
                <Reveal delay={i * 0.06} className="h-full">
                  <article className="glass relative flex h-full flex-col overflow-hidden rounded-card p-6 sm:p-7">
                    <span aria-hidden className="pointer-events-none absolute -top-16 -end-16 size-48 rounded-full bg-accent-soft/80" />
                    <div className="relative flex items-start justify-between gap-4">
                      <div>
                        {b.city && <p className="eyebrow">{cityName(b.city, locale)}</p>}
                        <h3 className="mt-1.5 font-display text-[22px] leading-snug font-medium">{b.name}</h3>
                      </div>
                      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-altitude shadow-primary">
                        <MapPin className="size-5" aria-hidden />
                      </span>
                    </div>
                    <dl className="relative mt-5 grid gap-3 text-sm">
                      {b.address && (
                        <div className="flex items-start gap-3">
                          <dt className="sr-only">{t.map}</dt>
                          <Navigation className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                          <dd>{b.address}</dd>
                        </div>
                      )}
                      {b.phone && (
                        <div className="flex items-start gap-3">
                          <dt className="sr-only">{t.call}</dt>
                          <Phone className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                          <dd className="ltr-nums num">{b.phone}</dd>
                        </div>
                      )}
                      {b.workingHours && (
                        <div className="flex items-start gap-3">
                          <dt className="sr-only">{t.workingHours}</dt>
                          <Clock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                          <dd>{b.workingHours}</dd>
                        </div>
                      )}
                    </dl>
                    <div className="relative mt-6 flex flex-wrap gap-2 border-t border-border pt-5">
                      {wa && (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={fmt(t.whatsappBranch, { name: b.name })}
                          className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground shadow-primary transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-primary-hover"
                        >
                          <WhatsAppIcon className="size-4" />
                          {t.bookNow}
                          <span className="ltr-nums num text-xs opacity-80">+{b.whatsapp?.replace(/[^\d]/g, '')}</span>
                        </a>
                      )}
                      {b.phone && (
                        <a
                          href={telHref(b.phone)}
                          aria-label={fmt(t.callBranch, { name: b.name })}
                          className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface-raised px-4 text-sm font-medium transition-colors hover:border-border-strong"
                        >
                          <Phone className="size-4" aria-hidden />
                          {t.call}
                        </a>
                      )}
                      {map && (
                        <a
                          href={map}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={fmt(t.openMap, { name: b.name })}
                          className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface-raised px-4 text-sm font-medium transition-colors hover:border-border-strong"
                        >
                          <MapPin className="size-4" aria-hidden />
                          {t.map}
                          <ArrowUpRight className="size-3.5 rtl-flip" aria-hidden />
                        </a>
                      )}
                    </div>
                  </article>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export function PoliciesSection({ policies, t }: { policies: PublicSite['policies']; t: LandingMessages }) {
  if (!policies.length) return null;
  return (
    <section id="policies" aria-labelledby="policies-title" className="scroll-mt-24 px-3 pt-24 sm:px-6">
      <div className="mx-auto max-w-[1280px]">
        <Reveal>
          <SectionHeading id="policies-title" eyebrow={t.policiesEyebrow} titleA={t.policiesTitleA} titleB={t.policiesTitleB} body={t.policiesBody} />
        </Reveal>
        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {policies.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/policies/${p.slug}`}
                className="group flex h-full items-center gap-4 rounded-card border border-border bg-surface-raised p-5 shadow-card transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-pop"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-primary">
                  <FileText className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{p.title}</span>
                  <span className="mt-0.5 block text-xs text-muted">{t.read}</span>
                </span>
                <ArrowUpRight className="size-4 text-muted transition-transform group-hover:-translate-y-0.5 rtl-flip" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** "Design your trip" call to action between the catalog and the offers. */
export function DesignCta({ t }: { t: LandingMessages }) {
  const steps = [
    { Icon: Route, label: t.designStep1 },
    { Icon: BedDouble, label: t.designStep2 },
    { Icon: Send, label: t.designStep3 },
  ];
  return (
    <section aria-labelledby="design-title" className="px-3 pt-24 sm:px-6">
      <Reveal className="mx-auto max-w-[1280px]">
        <div className="relative grid items-center gap-8 overflow-hidden rounded-panel bg-powder p-6 sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:p-14">
          <span aria-hidden className="pointer-events-none absolute -end-24 -bottom-32 size-[420px] rounded-full border border-white/40" />
          <span aria-hidden className="pointer-events-none absolute -end-10 -bottom-20 size-[300px] rounded-full border border-white/30" />
          <div className="relative">
            <p className="eyebrow text-[#18263b]/80">{t.designEyebrow}</p>
            <h2 id="design-title" className="heading-display mt-3 text-[32px] leading-[1.1] sm:text-[44px]">
              {t.designTitleA} <strong className="font-medium">{t.designTitleB}</strong>
            </h2>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[#18263b]/85">{t.designBody}</p>
            <Link
              href="/design-your-trip"
              className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-[15px] font-medium text-ink-foreground transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-ink-hover"
            >
              {t.designCta}
              <ArrowUpRight className="size-4 rtl-flip" aria-hidden />
            </Link>
          </div>
          <ol className="relative grid gap-3">
            {steps.map(({ Icon, label }, i) => (
              <li key={label} className="flex items-center gap-4 rounded-tile bg-white/80 p-4 text-[#111418] shadow-card backdrop-blur-md dark:bg-sky-950/60 dark:text-sky-50">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-sm font-medium text-ink-foreground num">{i + 1}</span>
                <span className="flex-1 text-[15px] font-medium">{label}</span>
                <Icon className="size-5 text-sky-600" aria-hidden />
              </li>
            ))}
          </ol>
        </div>
      </Reveal>
    </section>
  );
}
