'use client';

import { ROLE_LABELS } from '@travelos/shared';
import { LogOut, Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Brand } from './brand';
import { isActive, type NavItem } from './nav-items';

/** Below md: menu button opens a left Sheet with the full navigation + account. */
export function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user, role, agency, logout } = useAuth();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-surface-raised text-foreground md:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-4" aria-hidden />
      </SheetTrigger>
      <SheetContent side="left" className="gap-0">
        <SheetHeader>
          <SheetTitle asChild>
            <div>
              <Brand />
            </div>
          </SheetTitle>
          <SheetDescription className="sr-only">Main navigation</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <nav aria-label="Main" className="flex flex-col gap-1">
            {items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-ink text-ink-foreground'
                      : 'text-muted hover:bg-surface hover:text-foreground',
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </SheetBody>
        {user && (
          <SheetFooter className="border-t border-border">
            <div className="flex items-center gap-3">
              <Avatar name={user.fullName} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user.fullName}</p>
                <p className="truncate text-xs text-muted">
                  {role ? ROLE_LABELS[role] : ''}
                  {agency ? ` · ${agency.name}` : ''}
                </p>
              </div>
            </div>
            <Button variant="secondary" onClick={() => logout()} className="mt-2 w-full">
              <LogOut /> Sign out
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
