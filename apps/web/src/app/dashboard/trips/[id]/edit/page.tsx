import { TripFormView } from '@/components/trips/trip-form-view';

export const instant = false;

export default async function EditTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TripFormView tripId={id} />;
}
