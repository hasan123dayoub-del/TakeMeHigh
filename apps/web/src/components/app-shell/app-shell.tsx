'use client';

import { ClipboardList, KeyRound, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth, useOfficeSettings } from '@/lib/auth';
import { useResource } from '@/lib/hooks';
import { defineMessages, useLocale, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import type { Notifications } from '@/lib/types/api';
import { cn } from '@/lib/utils';
import { Brand } from './brand';
import { CommandSearch } from './command-search';
import { LanguageToggle, SearchButton, ThemeToggle } from './header-actions';
import { MobileNav } from './mobile-nav';
import { isActive, useNavGroups, useNavItems } from './nav-items';

const m = defineMessages({
  ar: {
    notifications: 'المهام المعلّقة',
    noAlerts: 'لا توجد مهام معلّقة الآن',
    allBranches: 'كل الفروع',
    changePassword: 'تغيير كلمة المرور',
    NEW_REQUESTS: 'طلبات رحلات جديدة من الصفحة العامة',
    DEADLINES_SOON: 'رحلات تقترب مهلة تسجيلها',
    AWAITING_DECISION: 'رحلات وبرامج مغلقة بانتظار القرار',
    COSTS_CHANGED: 'رحلات تغيّرت كلف مورّديها',
    INTEGRATION_ERRORS: 'أخطاء في مزامنة الموردين',
    VISAS_MISSING: 'تأشيرات غير معتمدة قبل السفر',
  },
  en: {
    notifications: 'Pending tasks',
    noAlerts: 'No pending tasks',
    allBranches: 'All branches',
    changePassword: 'Change password',
    NEW_REQUESTS: 'New trip requests from the public page',
    DEADLINES_SOON: 'Trips whose registration closes soon',
    AWAITING_DECISION: 'Closed trips and programs awaiting a decision',
    COSTS_CHANGED: 'Trips whose supplier costs changed',
    INTEGRATION_ERRORS: 'Supplier sync errors',
    VISAS_MISSING: 'Visas not approved before departure',
  },
});

/**
 * Authenticated layout (SRS 3.1): a sidebar filtered by the role's permissions, and a top bar
 * with the user, branch, notifications, language and theme. The API enforces the same rules.
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
    <div className="flex min-h-dvh flex-1 bg-canvas">
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-ink px-4 py-2 text-sm text-ink-foreground focus:not-sr-only focus:fixed focus:top-4 focus:start-4"
      >
        Skip to content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col p-2 sm:p-4 lg:ps-0 lg:pe-6 lg:py-6">
        <div className="glass flex min-h-[calc(100dvh-1rem)] flex-1 flex-col rounded-panel p-3 shadow-glass sm:min-h-[calc(100dvh-2rem)] sm:p-6 lg:min-h-[calc(100dvh-3rem)] xl:p-8">
          <header className="flex items-center gap-2 sm:gap-3">
            <MobileNav />
            <Link href="/dashboard" aria-label="Take Me High" className="rounded-full lg:hidden">
              <Brand wordmarkClassName="max-sm:sr-only" />
            </Link>
            <BranchChip />
            <div className="ms-auto flex items-center gap-1.5 sm:gap-2">
              <SearchButton onOpen={() => setSearchOpen(true)} />
              <NotificationsBell />
              <span className="hidden sm:contents">
                <LanguageToggle />
              </span>
              <ThemeToggle />
              <UserMenu />
            </div>
          </header>
          <main id="main" className="mt-6 flex flex-1 flex-col sm:mt-8 lg:mt-10">
            {children}
          </main>
        </div>
      </div>
      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} items={items} />
    </div>
  );
}

function Sidebar() {
  const groups = useNavGroups();
  const pathname = usePathname();
  const settings = useOfficeSettings().data;
  const { locale } = useLocale();
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto px-4 py-6 lg:flex">
      <Link href="/dashboard" className="rounded-full px-2" aria-label="Take Me High">
        <Brand />
      </Link>
      {settings && <p className="mt-2 truncate px-2 text-xs text-muted">{(locale === 'en' && settings.officeNameEn) || settings.officeName}</p>}
      <nav aria-label="Main" className="mt-6 flex flex-col gap-5">
        {groups.map((g, i) => (
          <div key={g.label ?? i}>
            {g.label && <p className="eyebrow mb-1.5 px-3 text-[12px] text-subtle">{g.label}</p>}
            <ul className="flex flex-col gap-0.5">
              {g.items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-3 rounded-full px-3 py-2 text-[13.5px] font-medium transition-colors',
                        active ? 'bg-ink text-ink-foreground shadow-card' : 'text-muted hover:bg-surface-raised/70 hover:text-foreground',
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

function BranchChip() {
  const { user, roleName } = useAuth();
  const t = useMessages(m);
  if (!user) return null;
  return (
    <div className="hidden items-center gap-2 md:flex">
      <Badge tone="ink" size="md">
        {roleName}
      </Badge>
      <Badge tone="primary" size="md">
        {user.branch?.name ?? t.allBranches}
      </Badge>
    </div>
  );
}

const circle =
  'relative grid size-10 shrink-0 place-items-center rounded-full border border-border bg-surface-raised text-foreground transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

/** AUD-04: live alerts for the role, refreshed every minute. */
function NotificationsBell() {
  const t = useMessages(m);
  const { data } = useResource<Notifications>('/notifications', undefined, { refetchInterval: 60_000 });
  const total = data?.total ?? 0;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={circle} aria-label={`${t.notifications}${total ? ` (${total})` : ''}`}>
        <ClipboardList className="size-4" aria-hidden />
        {total > 0 && (
          <span className="num absolute -top-1 -end-1 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[11px] font-semibold text-danger-foreground">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>{t.notifications}</DropdownMenuLabel>
        {!data?.items.length && <p className="px-3 pb-3 text-sm text-muted">{t.noAlerts}</p>}
        {data?.items.map((n) => (
          <DropdownMenuItem key={n.type} asChild>
            <Link href={n.link} className="flex items-center gap-3">
              <span className={cn('size-2 shrink-0 rounded-full', n.severity === 'danger' ? 'bg-danger' : n.severity === 'warning' ? 'bg-warning' : 'bg-primary')} aria-hidden />
              <span className="flex-1 text-[14px]">{t[n.type]}</span>
              <span className="num text-xs font-semibold">{n.count}</span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu() {
  const { user, roleName, logout } = useAuth();
  const t = useMessages(m);
  const c = useMessages(common);
  if (!user) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" aria-label={user.fullName}>
        <Avatar name={user.fullName} src={null} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="flex items-center gap-3 px-2.5 pt-2 pb-3">
          <Avatar name={user.fullName} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.fullName}</p>
            <p className="truncate text-xs text-muted ltr-nums">{user.email}</p>
            <Badge size="sm" tone="primary" className="mt-1.5">
              {roleName} · {user.branch?.name ?? t.allBranches}
            </Badge>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/change-password">
            <KeyRound /> {t.changePassword}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem variant="danger" onSelect={() => logout()}>
          <LogOut className="rtl-flip" /> {c.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
