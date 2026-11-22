import { TripDetailView } from '@/components/trips/trip-detail-view';

export const instant = false;

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TripDetailView id={id} />;
}
