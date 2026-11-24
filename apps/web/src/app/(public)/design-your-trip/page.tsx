import type { Metadata } from 'next';
import { DesignTripPage } from '@/components/landing/design-trip-page';
import { designMetadata } from '@/components/landing/metadata';

export const instant = false;

export function generateMetadata(): Promise<Metadata> {
  return designMetadata();
}

export default function Page() {
  return <DesignTripPage />;
}
