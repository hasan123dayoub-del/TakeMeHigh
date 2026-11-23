'use client';

import { CloudOff, LogOut, RotateCw } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { AppShell } from '@/components/app-shell/app-shell';
import { FullPageLoader } from '@/components/app-shell/full-page-loader';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { GlassPanel } from '@/components/ui/card';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { defineMessages, useMessages } from '@/lib/i18n';

const m = defineMessages({
  ar: { failed: 'تعذّر تحميل مساحة العمل', retry: 'إعادة المحاولة', signOut: 'تسجيل الخروج', redirecting: 'جارٍ التحويل إلى تسجيل الدخول', loading: 'جارٍ التحميل' },
  en: { failed: 'We couldn’t load your workspace', retry: 'Try again', signOut: 'Sign out', redirecting: 'Redirecting to sign in', loading: 'Loading' },
});

/**
 * Client-side route protection for the (app) group. Nothing protected renders
 * until GET /auth/me succeeds; signed-out visitors go to /login?next=<path>.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { status, error, retry, logout, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const t = useMessages(m);

  useEffect(() => {
    if (status === 'unauthenticated') {
      const next =
        pathname && pathname !== '/dashboard' ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${next}`);
    }
    // AUTH-10: nothing else is reachable until the initial password is changed
    if (status === 'authenticated' && user?.mustChangePassword) router.replace('/change-password');
  }, [status, pathname, router, user]);

  if (status === 'authenticated' && !user?.mustChangePassword) return <AppShell>{children}</AppShell>;

  if (status === 'error') {
    return (
      <div className="grid min-h-dvh flex-1 place-items-center bg-canvas p-4">
        <GlassPanel className="w-full max-w-lg">
          <EmptyState
            icon={CloudOff}
            title={t.failed}
            description={errorMessage(error)}
            action={
              <Button onClick={retry}>
                <RotateCw /> {t.retry}
              </Button>
            }
            secondaryAction={
              <Button variant="secondary" onClick={() => logout()}>
                <LogOut className="rtl-flip" /> {t.signOut}
              </Button>
            }
          />
        </GlassPanel>
      </div>
    );
  }

  return (
    <FullPageLoader label={status === 'unauthenticated' ? t.redirecting : t.loading} />
  );
}
