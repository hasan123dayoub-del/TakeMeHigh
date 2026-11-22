'use client';

import { Building2, Languages, LogOut, MapPin, Moon, Search, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip } from '@/components/ui/tooltip';
import { useAuth } from '@/lib/auth';
import { defineMessages, useLocale, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import { cn } from '@/lib/utils';

const m = defineMessages({
  ar: { search: 'بحث', toggleTheme: 'تبديل المظهر', account: 'حساب', scopeOffice: 'كل الفروع', scopeBranch: 'هذا الفرع فقط' },
  en: { search: 'Search', toggleTheme: 'Toggle theme', account: 'Account', scopeOffice: 'All branches', scopeBranch: 'This branch only' },
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

export function UserMenu() {
  const { user, office, scope, logout } = useAuth();
  const t = useMessages(m);
  const c = useMessages(common);
  if (!user) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        aria-label={`${t.account}: ${user.fullName}`}
      >
        <Avatar name={user.fullName} src={null} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="flex items-center gap-3 px-2.5 pt-2 pb-3">
          <Avatar name={user.fullName} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.fullName}</p>
            <p className="truncate text-xs text-muted ltr-nums">{user.email}</p>
            {user.role && (
              <Badge size="sm" tone="primary" className="mt-1.5">
                {user.role.name} · {scope === 'OFFICE' ? t.scopeOffice : t.scopeBranch}
              </Badge>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        {office && (
          <>
            <DropdownMenuLabel>{c.office}</DropdownMenuLabel>
            <div className="flex items-center gap-2.5 px-2.5 pb-1 text-sm">
              <Building2 className="size-4 text-muted" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{office.name}</span>
              <span className="num text-xs text-muted">{office.defaultCurrencyCode}</span>
            </div>
            {user.branch && (
              <div className="flex items-center gap-2.5 px-2.5 pb-2 text-sm">
                <MapPin className="size-4 text-muted" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{user.branch.name}</span>
              </div>
            )}
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuGroup>
          <DropdownMenuItem variant="danger" onSelect={() => logout()}>
            <LogOut className="rtl-flip" /> {c.signOut}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
