'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Brand } from '@/components/app-shell/brand';
import { FullPageLoader } from '@/components/app-shell/full-page-loader';
import { TravelScene } from '@/components/brand/travel-scene';
import { GlassPanel } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { defineMessages, useMessages } from '@/lib/i18n';

const m = defineMessages({
  ar: {
    opening: 'جارٍ فتح مساحة العمل',
    eyebrow: 'مساحة عمل المكتب',
    titleA: 'أهلاً',
    titleB: 'بعودتك',
    lead: 'سجّل الدخول لإدارة الرحلات والبرامج والعروض والحجوزات والدفعات في مكتبك.',
    footer: '© 2026 Take Me High · نظام تشغيل مكتب السياحة والسفر',
  },
  en: {
    opening: 'Opening your workspace',
    eyebrow: 'Office workspace',
    titleA: 'Welcome',
    titleB: 'back',
    lead: 'Sign in to manage trips, programs, offers, bookings and payments for your office.',
    footer: '© 2026 Take Me High · Travel agency operations system',
  },
});
import { LoginForm } from './login-form';

export function LoginView() {
  const { status } = useAuth();
  const router = useRouter();
  const t = useMessages(m);

  useEffect(() => {
    if (status === 'authenticated') router.replace('/dashboard');
  }, [status, router]);

  if (status === 'authenticated') return <FullPageLoader label={t.opening} />;

  return (
    <div className="min-h-dvh flex-1 bg-canvas p-2 sm:p-4 lg:p-6">
      <GlassPanel className="mx-auto grid min-h-[calc(100dvh-1rem)] max-w-[1440px] gap-3 p-2 sm:min-h-[calc(100dvh-2rem)] sm:p-3 lg:min-h-[calc(100dvh-3rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
        {/* Form column */}
        <main className="flex flex-col px-4 py-5 sm:px-8 sm:py-7 lg:px-12">
          <Brand />
          <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10 animate-rise">
            <p className="text-xs font-medium tracking-[0.22em] text-muted uppercase">
              {t.eyebrow}
            </p>
            <h1 className="heading-display mt-2 text-[34px] leading-[1.05] sm:text-[44px]">
              {t.titleA} <strong className="font-medium">{t.titleB}</strong>
            </h1>
            <p className="mt-3 text-[16px] leading-relaxed text-muted">
              {t.lead}
            </p>
            <LoginForm />
          </div>
          <p className="text-center text-xs text-subtle lg:text-start">
            {t.footer}
          </p>
        </main>

        {/* Visual column */}
        <aside aria-hidden className="relative hidden overflow-hidden rounded-[26px] bg-altitude lg:flex">
          <TravelScene />
        </aside>
      </GlassPanel>
    </div>
  );
}
