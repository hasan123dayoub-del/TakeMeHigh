import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Arabic, Inter, Outfit, Readex_Pro } from 'next/font/google';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers';
import { getLocale } from '@/lib/i18n/server';
import { dirOf } from '@/lib/i18n/shared';
import './globals.css';

/** Latin body / UI font. Tabular figures are enabled per element with the `num` utility. */
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

/** Latin display font for the Cirrus headings. */
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', weight: ['300', '400', '500', '600'], display: 'swap' });

/** Arabic body font (fallback after Inter, so Arabic glyphs use it automatically). */
const plexArabic = IBM_Plex_Sans_Arabic({ subsets: ['arabic'], variable: '--font-arabic', weight: ['300', '400', '500', '600', '700'], display: 'swap' });

/** Arabic display font matching Outfit's geometric feel. */
const readex = Readex_Pro({ subsets: ['arabic', 'latin'], variable: '--font-arabic-display', weight: ['300', '400', '500', '600'], display: 'swap' });

/*
 * Every request reads the language cookie so the server renders the right lang/dir on first paint
 * (no RTL flash). That makes routes request-time rendered, which this app needs anyway
 * (live seat availability, per-user dashboards).
 */
export const instant = false;

export const metadata: Metadata = {
  title: { default: 'TakeMeHigh', template: '%s · TakeMeHigh' },
  description: 'TakeMeHigh: نظام تشغيل مكتب السياحة — الرحلات والبرامج والعروض والحجوزات والعملاء والموردون والمقاعد في لوحة واحدة.',
  applicationName: 'TakeMeHigh',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#DCE9F7' },
    { media: '(prefers-color-scheme: dark)', color: '#0B1626' },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      dir={dirOf(locale)}
      className={`${inter.variable} ${outfit.variable} ${plexArabic.variable} ${readex.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
