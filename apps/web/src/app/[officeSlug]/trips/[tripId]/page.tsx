import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicNotFoundError } from '@/components/public/api';
import { getTripPage } from '@/components/public/data.server';
import { PublicError } from '@/components/public/states';
import { TripView } from '@/components/public/trip-view';
import { getLocale } from '@/lib/i18n/server';

type Params = Promise<{ officeSlug: string; tripId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { officeSlug, tripId } = await params;
  const locale = await getLocale();
  try {
    const trip = await getTripPage(officeSlug, tripId);
    const title = `${trip.title} · ${trip.office.name}`;
    const description = trip.description ?? trip.destination;
    return {
      title,
      description,
      openGraph: { title, description, type: 'website', locale: locale === 'ar' ? 'ar_SY' : 'en_GB', images: trip.coverImageUrl ? [trip.coverImageUrl] : undefined },
    };
  } catch {
    return { title: locale === 'ar' ? 'الرحلة غير متاحة' : 'Trip not available', robots: { index: false } };
  }
}

/** `/[officeSlug]/trips/[tripId]`: public trip page with WhatsApp booking. */
export default async function TripPage({ params }: { params: Params }) {
  const { officeSlug, tripId } = await params;
  // Fetch first, render after: JSX is never built inside try/catch (errors surface to the boundary).
  let trip: Awaited<ReturnType<typeof getTripPage>> | null = null;
  try {
    trip = await getTripPage(officeSlug, tripId);
  } catch (e) {
    if (e instanceof PublicNotFoundError) notFound();
  }
  if (!trip) return <PublicError />;
  return <TripView trip={trip} />;
}
