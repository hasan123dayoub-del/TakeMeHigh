import { Globe, Mail, MapPin, Phone } from 'lucide-react';
import Link from 'next/link';
import type { Locale } from '@/lib/i18n/shared';
import { FacebookIcon, InstagramIcon, WhatsAppIcon } from './icons';
import type { LandingMessages } from './messages';
import { BrandMark } from './brand-mark';
import type { PublicSite } from './types';
import { officeName, telHref } from './utils';

const SOCIAL: Record<string, { label: string; Icon: typeof FacebookIcon }> = {
  facebook: { label: 'Facebook', Icon: FacebookIcon },
  instagram: { label: 'Instagram', Icon: InstagramIcon },
};

export function SiteFooter({ site, t, locale, whatsappHref }: { site: PublicSite; t: LandingMessages; locale: Locale; whatsappHref: string | null }) {
  const { office } = site;
  const name = officeName(office, locale);
  const year = new Date().getFullYear();
  const social = Object.entries(office.socialLinks ?? {}).filter(([, url]) => typeof url === 'string' && url);

  return (
    <footer className="mt-24 px-3 pb-3 sm:px-6 sm:pb-6">
      <div className="relative mx-auto max-w-[1280px] overflow-hidden rounded-panel bg-altitude px-6 pt-12 pb-6 sm:px-10 lg:px-14">
        <span aria-hidden className="pointer-events-none absolute -top-32 -end-24 size-[420px] rounded-full bg-white/8" />
        <span aria-hidden className="pointer-events-none absolute -bottom-48 -start-24 size-[460px] rounded-full border border-white/15" />

        <div className="relative grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <BrandMark name={name} logoUrl={office.logoUrl} inverse className="size-11" />
              <p className="font-display text-lg font-medium">{name}</p>
            </div>
            {office.about && <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/80">{office.about}</p>}
            <p className="mt-4 text-xs text-white/70">{t.noAccountsNote}</p>
          </div>

          <div>
            <h2 className="eyebrow text-white/70">{t.footerContact}</h2>
            <ul className="mt-4 grid gap-2.5 text-sm">
              {office.phone && (
                <li>
                  <a href={telHref(office.phone)} className="inline-flex items-center gap-2 text-white/90 hover:text-white">
                    <Phone className="size-4 opacity-70" aria-hidden />
                    <span className="ltr-nums num">{office.phone}</span>
                  </a>
                </li>
              )}
              {whatsappHref && (
                <li>
                  <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-white/90 hover:text-white">
                    <WhatsAppIcon className="size-4 opacity-70" />
                    {t.whatsapp}
                  </a>
                </li>
              )}
              {office.email && (
                <li>
                  <a href={`mailto:${office.email}`} className="inline-flex items-center gap-2 break-all text-white/90 hover:text-white">
                    <Mail className="size-4 shrink-0 opacity-70" aria-hidden />
                    {office.email}
                  </a>
                </li>
              )}
              {office.address && (
                <li className="flex items-start gap-2 text-white/90">
                  <MapPin className="mt-0.5 size-4 shrink-0 opacity-70" aria-hidden />
                  {office.address}
                </li>
              )}
            </ul>
          </div>

          <nav aria-label={t.footerLinks}>
            <h2 className="eyebrow text-white/70">{t.footerLinks}</h2>
            <ul className="mt-4 grid gap-2.5 text-sm">
              {[
                ['/#trips', t.navTrips],
                ['/#offers', t.navOffers],
                ['/#branches', t.navBranches],
                ['/design-your-trip', t.navDesign],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-white/90 hover:text-white hover:underline underline-offset-4">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label={t.footerPolicies}>
            <h2 className="eyebrow text-white/70">{t.footerPolicies}</h2>
            <ul className="mt-4 grid gap-2.5 text-sm">
              {site.policies.map((p) => (
                <li key={p.slug}>
                  <Link href={`/policies/${p.slug}`} className="text-white/90 hover:text-white hover:underline underline-offset-4">
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
            {social.length > 0 && (
              <ul className="mt-6 flex gap-2">
                {social.map(([key, url]) => {
                  const s = SOCIAL[key];
                  const Icon = s?.Icon ?? Globe;
                  return (
                    <li key={key}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={s?.label ?? key}
                        className="grid size-10 place-items-center rounded-full bg-white/12 transition-colors hover:bg-white/22"
                      >
                        <Icon className="size-[18px]" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </nav>
        </div>

        <div className="relative mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-5 text-xs text-white/75">
          <p>
            © <span className="num">{year}</span> {name}. {t.rights}
          </p>
          <p lang="en" dir="ltr" className="tracking-[0.14em] uppercase">
            {t.poweredBy}
          </p>
        </div>
      </div>
    </footer>
  );
}
