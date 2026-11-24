import type { ReactNode } from 'react';
import { PublicShell } from '@/components/landing/public-shell';

/* Public site: request-time rendered (live seats and prices, language cookie). */
export const instant = false;

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
