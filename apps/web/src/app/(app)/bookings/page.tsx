import type { Metadata } from 'next';
import { ModulePage } from '@/components/app-shell/module-placeholder';

// Rendered behind the client-side auth gate; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: 'Bookings' };

export default function BookingsPage() {
  return <ModulePage module="bookings" />;
}
