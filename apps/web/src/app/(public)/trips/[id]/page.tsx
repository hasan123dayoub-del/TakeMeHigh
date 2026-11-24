import type { Metadata } from 'next';
import { tripMetadata } from '@/components/landing/metadata';
import { TripDetail } from '@/components/landing/trip-detail';

export const instant = false;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return tripMetadata((await params).id);
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <TripDetail id={id} />;
}
