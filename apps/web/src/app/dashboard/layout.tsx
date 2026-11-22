import type { ReactNode } from 'react';
import { AuthGate } from '@/components/auth/auth-gate';

/*
 * The session lives in client storage, so everything under /dashboard renders only after
 * GET /auth/me succeeds in the browser (the server shell shows the loader). Pages in this
 * segment must export `instant = false` (see docs/design/design-system.md).
 */
export const instant = false;

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
