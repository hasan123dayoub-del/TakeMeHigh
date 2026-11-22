import type { Metadata } from 'next';
import { DashboardView } from './dashboard-view';

// Rendered behind the client-side auth gate; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage() {
  return <DashboardView />;
}
