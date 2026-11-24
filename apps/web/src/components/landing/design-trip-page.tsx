import { MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { getLocale, getMessages } from '@/lib/i18n/server';
import { Breadcrumbs } from './detail-parts';
import { DesignTripForm } from './design-trip-form';
import { landingMessages } from './messages';
import { getRequestOptions, getSite } from './server';
import { officeName } from './utils';

/** "Design your trip" (CTR-01..05): the request form with every option loaded on the server. */
export async function DesignTripPage() {
  const [options, site, locale, t] = await Promise.all([getRequestOptions(), getSite(), getLocale(), getMessages(landingMessages)]);
  const office = site ? officeName(site.office, locale) : 'TakeMeHigh';

  return (
    <div className="mx-auto max-w-[1280px] px-3 pt-6 sm:px-6">
      <Breadcrumbs t={t} current={t.navDesign} section={{ href: '/#trips', label: t.navTrips }} />
      <div className="mt-4 grid items-start gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="relative overflow-hidden rounded-panel bg-altitude p-6 sm:p-8 lg:sticky lg:top-24 lg:min-h-[560px] lg:p-10">
          {site?.office.heroImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={site.office.heroImageUrl} alt="" aria-hidden className="absolute inset-0 size-full object-cover opacity-20 mix-blend-luminosity" />
          )}
          <span aria-hidden className="pointer-events-none absolute -bottom-40 -start-24 size-[420px] rounded-full border border-white/15" />
          <span aria-hidden className="pointer-events-none absolute -top-24 -end-24 size-[300px] rounded-full bg-white/8" />
          <div className="relative">
            <p className="text-xs font-medium tracking-[0.22em] text-white/80 uppercase">{t.formEyebrow}</p>
            <h1 className="heading-display mt-3 text-[34px] leading-[1.08] sm:text-[44px]">
              {t.formTitleA} <strong className="font-medium">{t.formTitleB}</strong>
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-white/85">{t.formBody}</p>
            <ol className="mt-8 grid gap-3">
              {[t.designStep1, t.designStep2, t.designStep3].map((s, i) => (
                <li key={s} className="flex items-center gap-3 rounded-full bg-white/12 py-2 ps-2 pe-4 text-sm backdrop-blur">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-sm font-medium text-[#111418] num">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
            <ul className="mt-8 grid gap-2.5 text-[13px] text-white/80">
              <li className="flex items-center gap-2">
                <ShieldCheck className="size-4" aria-hidden />
                {t.privacyNote}
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="size-4" aria-hidden />
                {t.noAccountsNote}
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="size-4" aria-hidden />
                {office}
              </li>
            </ul>
          </div>
        </aside>

        <div className="glass rounded-panel p-4 sm:p-8 lg:p-10">
          {options ? (
            <DesignTripForm options={options} officeName={office} whatsappNumber={site?.office.whatsappNumber ?? null} />
          ) : (
            <p role="alert" className="py-10 text-center text-muted">
              {t.optionsError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
