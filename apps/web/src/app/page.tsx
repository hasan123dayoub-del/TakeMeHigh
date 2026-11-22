import type { Metadata } from 'next';
import { Suspense } from 'react';
import { parseShowcaseFilters } from '@/components/public/api';
import { getShowcase } from '@/components/public/data.server';
import { LandingView } from '@/components/public/landing-view';
import { LandingSkeleton, PublicError } from '@/components/public/states';
import { getLocale } from '@/lib/i18n/server';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const COPY = {
  ar: {
    title: 'سفرني · رحلات من مكاتب سياحية في سوريا',
    description: 'تصفح رحلات المكاتب السياحية إلى اللاذقية وحلب وطرطوس وغيرها، بأسعار ومقاعد حقيقية، واحجز مباشرة مع المكتب عبر واتساب.',
  },
  en: {
    title: 'Safarni · Trips from tourism offices in Syria',
    description: 'Browse trips from tourism offices with real prices and live seats, and book directly with the office on WhatsApp.',
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const c = COPY[locale];
  return {
    title: { absolute: c.title },
    description: c.description,
    openGraph: {
      title: c.title,
      description: c.description,
      type: 'website',
      siteName: locale === 'ar' ? 'سفرني' : 'Safarni',
      locale: locale === 'ar' ? 'ar_SY' : 'en_GB',
    },
    twitter: { card: 'summary_large_image', title: c.title, description: c.description },
  };
}

/** `/`: the Safarni showcase of published trips from offices with a public page. */
export default function HomePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<LandingSkeleton />}>
      <Landing searchParams={searchParams} />
    </Suspense>
  );
}

async function Landing({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseShowcaseFilters(await searchParams);
  let data;
  try {
    data = await getShowcase(JSON.stringify(filters));
  } catch {
    return <PublicError />;
  }
  return <LandingView filters={filters} data={data} />;
}
