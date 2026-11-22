import type { ReactNode } from 'react';
import { AuthGate } from '@/components/auth/auth-gate';

/*
 * The session lives in client storage, so the protected subtree is rendered
 * only after GET /auth/me succeeds in the browser (the server shell shows the
 * loader). That intentionally "drops" pages from the prerender, so instant
 * navigation validation is skipped for this group. Navigation between app
 * pages stays client-side and instant because the gate stays mounted.
 */
export const instant = false;

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
