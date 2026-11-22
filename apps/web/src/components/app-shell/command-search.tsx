'use client';

import { CornerDownLeft, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { NavItem } from './nav-items';

/**
 * Ctrl/Cmd+K quick navigation across the modules the user can access.
 * Record search (trips, bookings, customers) plugs in here once those APIs land.
 */
export function CommandSearch({
  open,
  onOpenChange,
  items,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: NavItem[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className="top-[18%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0"
      >
        <DialogTitle className="sr-only">Search TravelOS</DialogTitle>
        <DialogDescription className="sr-only">Jump to a module by name.</DialogDescription>
        {open && <CommandBody items={items} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function CommandBody({ items, onDone }: { items: NavItem[]; onDone: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) => i.label.toLowerCase().includes(q) || i.description.toLowerCase().includes(q),
    );
  }, [items, query]);

  const go = (item: NavItem | undefined) => {
    if (!item) return;
    onDone();
    router.push(item.href);
  };

  const current = Math.min(active, Math.max(results.length - 1, 0));

  return (
    <>
      <div className="flex items-center gap-3 border-b border-border px-5">
        <Search className="size-4 shrink-0 text-muted" aria-hidden />
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((current + 1) % Math.max(results.length, 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((current - 1 + results.length) % Math.max(results.length, 1));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              go(results[current]);
            }
          }}
          placeholder="Jump to trips, bookings, finance…"
          aria-label="Search modules"
          role="combobox"
          aria-expanded
          aria-controls="command-results"
          aria-activedescendant={results[current] ? `cmd-${results[current].href}` : undefined}
          className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-subtle"
        />
        <kbd className="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-muted">
          Esc
        </kbd>
      </div>
      <ul id="command-results" role="listbox" className="max-h-80 overflow-y-auto p-2">
        {results.length === 0 && (
          <li className="px-3 py-8 text-center text-sm text-muted">No modules match “{query}”.</li>
        )}
        {results.map((item, i) => {
          const Icon = item.icon;
          const selected = i === current;
          return (
            <li
              key={item.href}
              id={`cmd-${item.href}`}
              role="option"
              aria-selected={selected}
              onMouseMove={() => setActive(i)}
              onClick={() => go(item)}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-tile px-3 py-2.5',
                selected && 'bg-surface',
              )}
            >
              <span
                className={cn(
                  'grid size-9 place-items-center rounded-full transition-colors',
                  selected
                    ? 'bg-ink text-ink-foreground'
                    : 'bg-surface-raised text-muted ring-1 ring-border',
                )}
              >
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="block truncate text-xs text-muted">{item.description}</span>
              </span>
              {selected && <CornerDownLeft className="size-4 text-muted" aria-hidden />}
            </li>
          );
        })}
      </ul>
    </>
  );
}
