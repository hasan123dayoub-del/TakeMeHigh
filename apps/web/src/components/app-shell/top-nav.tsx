'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { isActive, type NavItem } from './nav-items';

/**
 * White pill navigation with the ink-black active pill (animated between items).
 * xl+: icon-less labels as in the approved preview. md–xl: icons only, active
 * item keeps its label. Below md the mobile Sheet menu takes over.
 */
export function TopNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="hidden items-center gap-0.5 rounded-full border border-border bg-surface-raised p-1 md:flex"
    >
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        const link = (
          <Link
            href={item.href}
            aria-current={active ? 'page' : undefined}
            aria-label={item.label}
            className={cn(
              'relative inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full text-[13px] font-medium transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              active
                ? 'px-4 text-ink-foreground'
                : 'w-9 text-muted hover:text-foreground xl:w-auto xl:px-4',
            )}
          >
            {active && (
              <motion.span
                layoutId="top-nav-active"
                aria-hidden
                className="absolute inset-0 rounded-full bg-ink"
                transition={{ type: 'spring', stiffness: 520, damping: 42 }}
              />
            )}
            <Icon className={cn('relative size-4 xl:hidden')} aria-hidden />
            <span className={cn('relative', !active && 'sr-only xl:not-sr-only')}>
              {item.label}
            </span>
          </Link>
        );
        return active ? (
          <span key={item.href}>{link}</span>
        ) : (
          <Tooltip key={item.href} content={item.label} side="bottom" contentClassName="xl:hidden">
            {link}
          </Tooltip>
        );
      })}
    </nav>
  );
}
