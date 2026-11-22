import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicNotFoundError } from '@/components/public/api';
import { getOfficePage } from '@/components/public/data.server';
import { OfficeView } from '@/components/public/office-view';
import { PublicError } from '@/components/public/states';
import { getLocale } from '@/lib/i18n/server';

type Params = Promise<{ officeSlug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { officeSlug } = await params;
  const locale = await getLocale();
  try {
    const { office } = await getOfficePage(officeSlug);
    const description = office.description ?? (locale === 'ar' ? `رحلات ${office.name} على سفرني` : `Trips by ${office.name} on Safarni`);
    return {
      title: office.name,
      description,
      openGraph: { title: office.name, description, type: 'website', locale: locale === 'ar' ? 'ar_SY' : 'en_GB', images: office.coverImageUrl ? [office.coverImageUrl] : undefined },
    };
  } catch {
    return { title: locale === 'ar' ? 'الصفحة غير متاحة' : 'Page not available', robots: { index: false } };
  }
}

/** `/[officeSlug]`: the office's public page (404 when unknown or disabled). */
export default async function OfficePage({ params }: { params: Params }) {
  const { officeSlug } = await params;
  // Fetch first, render after: JSX is never built inside try/catch (errors surface to the boundary).
  let data: Awaited<ReturnType<typeof getOfficePage>> | null = null;
  try {
    data = await getOfficePage(officeSlug);
  } catch (e) {
    if (e instanceof PublicNotFoundError) notFound();
  }
  if (!data) return <PublicError />;
  return <OfficeView data={data} />;
}
