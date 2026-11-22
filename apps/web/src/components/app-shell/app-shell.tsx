'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { GlassPanel } from '@/components/ui/card';
import { Brand } from './brand';
import { CommandSearch } from './command-search';
import { LanguageToggle, SearchButton, ThemeToggle, UserMenu } from './header-actions';
import { MobileNav } from './mobile-nav';
import { useNavItems } from './nav-items';
import { TopNav } from './top-nav';

/**
 * Authenticated layout: sky canvas -> one frosted-glass panel -> pill top bar + page.
 * Navigation items are filtered by the role's permissions (UI only; the API enforces).
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const items = useNavItems();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="min-h-dvh flex-1 bg-canvas p-2 sm:p-4 lg:p-6 xl:p-8">
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-ink px-4 py-2 text-sm text-ink-foreground focus:not-sr-only focus:fixed focus:top-4 focus:start-4"
      >
        Skip to content
      </a>
      <GlassPanel className="mx-auto flex min-h-[calc(100dvh-1rem)] max-w-[1440px] flex-col p-3 sm:min-h-[calc(100dvh-2rem)] sm:p-6 lg:min-h-[calc(100dvh-3rem)] xl:min-h-[calc(100dvh-4rem)] xl:p-8">
        <header className="flex items-center gap-2 sm:gap-3">
          <MobileNav items={items} />
          <Link
            href="/dashboard"
            aria-label="Safarni"
            className="rounded-full pe-1 xl:pe-2"
          >
            <Brand wordmarkClassName="md:max-lg:sr-only" />
          </Link>
          <div className="mx-auto">
            <TopNav items={items} />
          </div>
          <div className="ms-auto flex items-center gap-1.5 sm:gap-2 md:ms-0">
            <SearchButton onOpen={() => setSearchOpen(true)} />
            <span className="hidden sm:contents">
              <LanguageToggle />
            </span>
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        <main id="main" className="mt-8 flex flex-1 flex-col sm:mt-10 lg:mt-12">
          {children}
        </main>
      </GlassPanel>
      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} items={items} />
    </div>
  );
}
