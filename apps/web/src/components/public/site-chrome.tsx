'use client';

import { ArrowUpRight, LogIn } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Brand } from '@/components/app-shell/brand';
import { LanguageToggle, ThemeToggle } from '@/components/app-shell/header-actions';
import { useMessages } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { pm } from './messages';

/** Sky canvas wrapper shared by every public page. */
export function PublicShell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('public-site flex min-h-dvh flex-1 flex-col bg-canvas', className)}>{children}</div>;
}

/** Floating glass pill header: brand, anchors, language, theme, office sign-in. */
export function SiteHeader({ anchors = true }: { anchors?: boolean }) {
  const t = useMessages(pm);
  return (
    <header className="sticky top-0 z-40 px-2 pt-2 sm:px-4 sm:pt-3">
      <div className="glass mx-auto flex h-14 max-w-[1280px] items-center gap-2 rounded-full ps-2 pe-2 shadow-pop sm:h-16 sm:ps-3">
        <Link href="/" className="rounded-full focus-visible:outline-2 focus-visible:outline-ring" aria-label={t.home}>
          <Brand />
        </Link>
        {anchors && (
          <nav className="ms-4 hidden items-center gap-1 text-[13px] font-medium text-muted md:flex">
            <Link href="/#trips" className="rounded-full px-3.5 py-2 transition-colors hover:bg-surface-raised hover:text-foreground">
              {t.navTrips}
            </Link>
            <Link href="/#how" className="rounded-full px-3.5 py-2 transition-colors hover:bg-surface-raised hover:text-foreground">
              {t.navHow}
            </Link>
          </nav>
        )}
        <div className="ms-auto flex items-center gap-1.5 sm:gap-2">
          <LanguageToggle />
          <ThemeToggle className="hidden sm:grid" />
          <Link
            href="/login"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface-raised px-3 text-[13px] font-medium text-foreground transition-colors hover:border-border-strong sm:px-4"
          >
            <LogIn className="size-4 rtl-flip" aria-hidden />
            <span className="hidden sm:inline">{t.forOffices}</span>
            <span className="sm:hidden">{t.signIn}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ className }: { className?: string }) {
  const t = useMessages(pm);
  return (
    <footer className={cn('mx-auto mt-auto w-full max-w-[1280px] px-4 pt-16 pb-10 sm:px-6', className)}>
      <div className="flex flex-col gap-6 border-t border-border-strong/60 pt-8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Brand compact />
          <div>
            <p className="text-sm font-medium text-foreground">{t.poweredBy}</p>
            <p className="text-xs text-muted">{t.rights}</p>
          </div>
        </div>
        <Link
          href="/login"
          className="group inline-flex items-center gap-3 self-start rounded-full bg-ink py-2 ps-5 pe-2 text-sm font-medium text-ink-foreground transition-colors hover:bg-ink-hover md:self-auto"
        >
          <span>
            <span className="block text-[11px] opacity-70">{t.footerOffices}</span>
            {t.footerOfficesCta}
          </span>
          <span className="grid size-8 place-items-center rounded-full bg-ink-foreground/15 transition-transform group-hover:-translate-y-0.5">
            <ArrowUpRight className="size-4 rtl-flip" aria-hidden />
          </span>
        </Link>
      </div>
    </footer>
  );
}
