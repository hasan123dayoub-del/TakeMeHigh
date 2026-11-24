'use client';

import { Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Brand } from './brand';
import { isActive, useNavGroups } from './nav-items';

/** Below lg: the menu button opens the sidebar navigation in a sheet. */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { dir } = useLocale();
  const groups = useNavGroups();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-surface-raised text-foreground lg:hidden" aria-label="Menu">
        <Menu className="size-4" aria-hidden />
      </SheetTrigger>
      <SheetContent side={dir === 'rtl' ? 'right' : 'left'} className="gap-0">
        <SheetHeader>
          <SheetTitle asChild>
            <div>
              <Brand />
            </div>
          </SheetTitle>
          <SheetDescription className="sr-only">Main navigation</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <nav aria-label="Main" className="flex flex-col gap-4">
            {groups.map((g, i) => (
              <div key={g.label ?? i}>
                {g.label && <p className="eyebrow mb-1 px-3 text-[12px] text-subtle">{g.label}</p>}
                {g.items.map((item) => {
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
                        active ? 'bg-ink text-ink-foreground' : 'text-muted hover:bg-surface hover:text-foreground',
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
