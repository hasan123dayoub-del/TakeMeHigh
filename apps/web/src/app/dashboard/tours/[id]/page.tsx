import { TourDetailView } from '@/components/tours/tour-detail-view';

export const instant = false;

export default async function TourPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TourDetailView id={id} />;
}
