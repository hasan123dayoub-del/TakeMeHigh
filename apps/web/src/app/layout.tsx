import type { Metadata, Viewport } from 'next';
import { Inter, Outfit } from 'next/font/google';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers';
import './globals.css';

/** Body / UI font. Tabular figures are enabled per element with the `num` utility. */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

/** Display font for the uppercase light Cirrus headings. */
const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  weight: ['300', '400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'TravelOS',
    template: '%s · TravelOS',
  },
  description:
    'Operations platform for travel agencies: trips, bookings, customers, suppliers and finance.',
  applicationName: 'TravelOS',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#DCE9F7' },
    { media: '(prefers-color-scheme: dark)', color: '#0B1626' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
