import { TripFormPage } from '@/components/trips/trip-form';

export const instant = false;

export default async function EditTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TripFormPage id={id} />;
}
