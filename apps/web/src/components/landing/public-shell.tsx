import type { ReactNode } from 'react';
import { getLocale, getMessages } from '@/lib/i18n/server';
import { landingMessages } from './messages';
import { getSite } from './server';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';
import { chatLink, officeName } from './utils';

/** Header + main landmark + footer of every public page (no auth, BR-18). */
export async function PublicShell({ children }: { children: ReactNode }) {
  const [site, locale, t] = await Promise.all([getSite(), getLocale(), getMessages(landingMessages)]);
  const name = site ? officeName(site.office, locale) : 'Take Me High';
  const whatsappHref = site ? chatLink(site.office.whatsappNumber, locale === 'ar' ? 'مرحباً' : 'Hello') : null;

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-canvas">
      <SiteHeader name={name} logoUrl={site?.office.logoUrl ?? null} whatsappHref={whatsappHref} />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      {site && <SiteFooter site={site} t={t} locale={locale} whatsappHref={whatsappHref} />}
    </div>
  );
}
