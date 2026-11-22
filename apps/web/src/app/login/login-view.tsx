'use client';

import { Check, MapPin, ShieldCheck, Users, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Brand } from '@/components/app-shell/brand';
import { FullPageLoader } from '@/components/app-shell/full-page-loader';
import { GlassPanel } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { LoginForm } from './login-form';

export function LoginView() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') router.replace('/dashboard');
  }, [status, router]);

  if (status === 'authenticated') return <FullPageLoader label="Opening your workspace" />;

  return (
    <div className="min-h-dvh flex-1 bg-canvas p-2 sm:p-4 lg:p-6">
      <GlassPanel className="mx-auto grid min-h-[calc(100dvh-1rem)] max-w-[1440px] gap-3 p-2 sm:min-h-[calc(100dvh-2rem)] sm:p-3 lg:min-h-[calc(100dvh-3rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
        {/* Form column */}
        <main className="flex flex-col px-4 py-5 sm:px-8 sm:py-7 lg:px-12">
          <Brand />
          <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
            <p className="text-xs font-medium tracking-[0.22em] text-muted uppercase">
              Agency workspace
            </p>
            <h1 className="heading-display mt-2 text-[34px] leading-[1.05] sm:text-[44px]">
              Welcome <strong className="font-medium">back</strong>
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              Sign in to manage trips, bookings and payments for your agency.
            </p>
            <LoginForm />
          </div>
          <p className="text-center text-xs text-subtle lg:text-left">
            © 2026 TravelOS · Operations platform for travel agencies
          </p>
        </main>

        {/* Visual column */}
        <aside
          aria-hidden
          className="relative hidden overflow-hidden rounded-[26px] bg-altitude p-10 lg:flex lg:flex-col xl:p-12"
        >
          <span className="pointer-events-none absolute -top-24 -right-24 size-[420px] rounded-full bg-white/10" />
          <span className="pointer-events-none absolute -bottom-40 -left-20 size-[460px] rounded-full border border-white/15" />
          <span className="pointer-events-none absolute -bottom-28 -left-8 size-[340px] rounded-full border border-white/10" />

          <div className="relative">
            <p className="text-xs font-medium tracking-[0.22em] uppercase opacity-80">
              Travel agency operations
            </p>
            <p className="heading-display mt-3 max-w-md text-[36px] leading-[1.08] xl:text-[46px] 2xl:text-[52px]">
              Every departure, <strong className="font-medium">one calm place</strong>
            </p>
          </div>

          <div className="relative mt-auto grid gap-3 pt-10">
            {/* Illustrative boarding card */}
            <div className="rounded-card bg-white/95 p-5 text-[#111418] shadow-glass backdrop-blur dark:bg-sky-950/70 dark:text-sky-50">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium tracking-[0.16em] text-[#5a6878] uppercase dark:text-sky-300">
                  Departure checklist
                </span>
                <span className="rounded-full bg-[#1c1c1e] px-2.5 py-1 text-[11px] font-medium text-white dark:bg-sky-100 dark:text-[#111418]">
                  Ready
                </span>
              </div>
              <ol className="relative mt-4 grid gap-3.5">
                <span className="absolute top-3 bottom-3 left-[13px] w-0.5 rounded-full bg-linear-to-b from-sky-600 to-sky-300" />
                {[
                  { title: 'Seats confirmed', meta: '38 of 40 travellers', done: true },
                  { title: 'Balances collected', meta: 'Final payments received', done: true },
                  { title: 'Hotel and coach', meta: 'Supplier vouchers sent', done: false },
                ].map((s) => (
                  <li key={s.title} className="relative flex items-center gap-3.5">
                    <span
                      className={
                        s.done
                          ? 'z-10 grid size-7 place-items-center rounded-full bg-sky-600 text-white'
                          : 'z-10 grid size-7 place-items-center rounded-full border-2 border-sky-400 bg-white dark:bg-sky-950'
                      }
                    >
                      {s.done ? (
                        <Check className="size-3.5" strokeWidth={3} />
                      ) : (
                        <span className="size-1.5 rounded-full bg-sky-400" />
                      )}
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{s.title}</span>
                      <span className="block text-xs text-[#5a6878] dark:text-sky-300">
                        {s.meta}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <ul className="grid grid-cols-2 gap-3 text-sm">
              {[
                { icon: MapPin, label: 'Trips & seats' },
                { icon: Users, label: 'Customers' },
                { icon: Wallet, label: 'Payments' },
                { icon: ShieldCheck, label: 'Role-based access' },
              ].map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-2.5 rounded-full bg-white/14 px-3.5 py-2.5 backdrop-blur"
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </GlassPanel>
    </div>
  );
}
