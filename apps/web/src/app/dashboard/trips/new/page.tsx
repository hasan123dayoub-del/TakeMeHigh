import { TripFormView } from '@/components/trips/trip-form-view';

export const instant = false;

export default async function NewTripPage({ searchParams }: { searchParams: Promise<{ tourId?: string | string[] }> }) {
  const { tourId } = await searchParams;
  return <TripFormView initialTourId={typeof tourId === 'string' ? tourId : undefined} />;
}
