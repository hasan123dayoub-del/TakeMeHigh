'use client';

import { ROLE_LABELS } from '@travelos/shared';
import { Bell, BellOff, Building2, LogOut, Moon, Search, Sun, UserRound } from 'lucide-react';
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
import { cn } from '@/lib/utils';

const circle =
  'relative grid size-10 shrink-0 place-items-center rounded-full border border-border bg-surface-raised text-foreground transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

export function SearchButton({ onOpen }: { onOpen: () => void }) {
  return (
    <Tooltip
      content={
        <span>
          Search <kbd className="ml-1 opacity-70">Ctrl K</kbd>
        </span>
      }
      side="bottom"
    >
      <button
        type="button"
        onClick={onOpen}
        className={circle}
        aria-label="Search"
        aria-keyshortcuts="Control+K"
      >
        <Search className="size-4" aria-hidden />
      </button>
    </Tooltip>
  );
}

export function NotificationsButton() {
  return (
    <DropdownMenu>
      <Tooltip content="Notifications" side="bottom">
        <DropdownMenuTrigger className={circle} aria-label="Notifications">
          <Bell className="size-4" aria-hidden />
        </DropdownMenuTrigger>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-medium">Notifications</span>
          <Badge size="sm" tone="neutral">
            0 new
          </Badge>
        </div>
        <div className="flex flex-col items-center px-6 py-8 text-center">
          <span className="grid size-11 place-items-center rounded-full bg-accent-soft text-primary">
            <BellOff className="size-5" aria-hidden />
          </span>
          <p className="mt-3 text-sm font-medium">You&apos;re all caught up</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Booking confirmations, payment reminders and departure alerts will appear here.
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  return (
    <Tooltip content="Toggle theme" side="bottom">
      <button
        type="button"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        aria-label="Toggle dark mode"
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
  const { user, agency, role, logout } = useAuth();
  if (!user) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        aria-label={`Account menu for ${user.fullName}`}
      >
        <Avatar name={user.fullName} src={null} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="flex items-center gap-3 px-2.5 pt-2 pb-3">
          <Avatar name={user.fullName} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.fullName}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
            {role && (
              <Badge size="sm" tone="primary" className="mt-1.5">
                {ROLE_LABELS[role]}
              </Badge>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        {agency && (
          <>
            <DropdownMenuLabel>Agency</DropdownMenuLabel>
            <div className="flex items-center gap-2.5 px-2.5 pb-2 text-sm">
              <Building2 className="size-4 text-muted" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{agency.name}</span>
              <span className="num text-xs text-muted">{agency.currency}</span>
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuGroup>
          <DropdownMenuItem disabled>
            <UserRound /> Profile
            <span className="ml-auto text-[11px] text-subtle">Soon</span>
          </DropdownMenuItem>
          <DropdownMenuItem variant="danger" onSelect={() => logout()}>
            <LogOut /> Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
