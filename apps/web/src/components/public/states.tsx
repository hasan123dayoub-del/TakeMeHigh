'use client';

import { CloudOff, Compass, RotateCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useMessages } from '@/lib/i18n';
import { pm } from './messages';
import { PublicShell, SiteFooter, SiteHeader } from './site-chrome';
import { TripCardSkeleton } from './trip-card';

/** API unreachable: designed error with a retry that re-renders the server component. */
export function PublicError() {
  const t = useMessages(pm);
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <PublicShell>
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-3xl flex-1 place-items-center px-4 py-16">
        <div className="glass w-full rounded-panel">
          <EmptyState
            icon={CloudOff}
            title={t.errorTitle}
            description={t.errorBody}
            action={
              <Button variant="ink" loading={pending} onClick={() => start(() => router.refresh())}>
                <RotateCw aria-hidden />
                {t.retry}
              </Button>
            }
          />
        </div>
      </main>
      <SiteFooter />
    </PublicShell>
  );
}

/** Unknown office, disabled public page, or a trip that is no longer public. */
export function PublicNotFound() {
  const t = useMessages(pm);
  return (
    <PublicShell>
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-[1280px] flex-1 place-items-center px-3 py-10 sm:px-6">
        <div className="relative isolate w-full overflow-hidden rounded-panel bg-altitude px-6 py-16 text-center sm:py-24">
          <span aria-hidden className="absolute -top-28 -end-20 -z-10 size-96 rounded-full bg-white/10" />
          <span aria-hidden className="absolute -bottom-40 -start-16 -z-10 size-[420px] rounded-full border border-white/15" />
          <span aria-hidden className="absolute inset-0 -z-10 grid place-items-center font-display text-[180px] leading-none font-medium text-white/8 select-none sm:text-[280px]">
            404
          </span>
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-white/15 backdrop-blur">
            <Compass className="size-7" aria-hidden />
          </span>
          <p className="mt-6 text-xs font-medium tracking-[0.22em] uppercase opacity-85">{t.notFoundEyebrow}</p>
          <h1 className="heading-display mx-auto mt-2 max-w-2xl text-[32px] leading-tight sm:text-[48px]">{t.notFoundTitle}</h1>
          <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed opacity-90">{t.notFoundBody}</p>
          <Link
            href="/"
            className="mt-8 inline-flex h-12 items-center rounded-full bg-white px-7 text-[15px] font-medium text-[#111418] shadow-pop transition-transform hover:-translate-y-0.5"
          >
            {t.notFoundCta}
          </Link>
        </div>
      </main>
      <SiteFooter />
    </PublicShell>
  );
}

/** Loading skeleton for the office and trip pages. */
export function PublicPageSkeleton({ variant = 'office' }: { variant?: 'office' | 'trip' }) {
  return (
    <PublicShell>
      <SiteHeader />
      <div className="mx-auto w-full max-w-[1280px] px-3 pt-6 sm:px-6" aria-busy>
        <Skeleton className={variant === 'trip' ? 'h-[260px] rounded-panel sm:h-[420px]' : 'h-[300px] rounded-panel'} />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <TripCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </PublicShell>
  );
}

/** Landing results while the first page streams in. */
export function LandingSkeleton() {
  return (
    <PublicShell>
      <SiteHeader />
      <div className="mx-auto w-full max-w-[1440px] px-3 pt-6" aria-busy>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[148px] w-[360px] shrink-0 rounded-card" />
          ))}
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1280px] px-3 pt-6 sm:px-6">
        <Skeleton className="h-[380px] rounded-panel" />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <TripCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </PublicShell>
  );
}
