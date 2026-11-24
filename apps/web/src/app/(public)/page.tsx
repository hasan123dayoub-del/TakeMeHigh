import type { Metadata } from 'next';
import { LandingPage } from '@/components/landing/landing-page';
import { landingMetadata } from '@/components/landing/metadata';

export const instant = false;

export function generateMetadata(): Promise<Metadata> {
  return landingMetadata();
}

export default function Page() {
  return <LandingPage />;
}
