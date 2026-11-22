import type { Metadata } from 'next';
import { ModulePage } from '@/components/app-shell/module-placeholder';

// Rendered behind the client-side auth gate; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: 'Reports' };

export default function ReportsPage() {
  return <ModulePage module="reports" />;
}
