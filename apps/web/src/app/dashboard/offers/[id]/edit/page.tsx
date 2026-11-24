import { OfferEdit } from '@/components/offers/offer-form';

export const instant = false;

export default async function EditOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OfferEdit id={id} />;
}
