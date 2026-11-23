'use client';

import { Languages, Moon, Search, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Tooltip } from '@/components/ui/tooltip';
import { defineMessages, useLocale, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import { cn } from '@/lib/utils';

const m = defineMessages({
  ar: { search: 'بحث', toggleTheme: 'تبديل المظهر' },
  en: { search: 'Search', toggleTheme: 'Toggle theme' },
});

const circle =
  'relative grid size-10 shrink-0 place-items-center rounded-full border border-border bg-surface-raised text-foreground transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

export function SearchButton({ onOpen }: { onOpen: () => void }) {
  const t = useMessages(m);
  return (
    <Tooltip
      content={
        <span>
          {t.search} <kbd className="ms-1 opacity-70">Ctrl K</kbd>
        </span>
      }
      side="bottom"
    >
      <button type="button" onClick={onOpen} className={circle} aria-label={t.search} aria-keyshortcuts="Control+K">
        <Search className="size-4" aria-hidden />
      </button>
    </Tooltip>
  );
}

/** Switches Arabic (RTL) ⇄ English (LTR); the whole layout mirrors. */
export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  const c = useMessages(common);
  return (
    <Tooltip content={c.language} side="bottom">
      <button
        type="button"
        onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
        className={cn(circle, 'w-auto gap-1.5 px-3 text-xs font-semibold', className)}
        aria-label={`${c.language}: ${c.switchLanguage}`}
      >
        <Languages className="size-4" aria-hidden />
        <span lang={locale === 'ar' ? 'en' : 'ar'}>{locale === 'ar' ? 'EN' : 'ع'}</span>
      </button>
    </Tooltip>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useMessages(m);
  const isDark = resolvedTheme === 'dark';
  return (
    <Tooltip content={t.toggleTheme} side="bottom">
      <button
        type="button"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        aria-label={t.toggleTheme}
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-full bg-ink text-ink-foreground transition-transform hover:bg-ink-hover active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          className,
        )}
      >
        {/* Both icons rendered; CSS picks one, so SSR and client markup match. */}
        <Moon className="size-4 dark:hidden" aria-hidden />
        <Sun className="hidden size-4 dark:block" aria-hidden />
      </button>
    </Tooltip>
  );
}
