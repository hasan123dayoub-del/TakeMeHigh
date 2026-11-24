import { OfferDetail } from '@/components/offers/offer-detail';

export const instant = false;

export default async function OfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OfferDetail id={id} />;
}
