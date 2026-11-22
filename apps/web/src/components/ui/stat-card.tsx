import { ArrowUpRight, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card } from './card';
import { Skeleton } from './skeleton';
import { Sparkline } from './sparkline';

export interface StatCardProps {
  label: string;
  /** Pre-formatted value (use lib/format for money). */
  value: ReactNode;
  /** Pre-formatted change, e.g. "+12.4%". */
  delta?: string;
  /** Direction of the change. */
  trend?: 'up' | 'down' | 'flat';
  /** Whether the change is good news (drives green vs amber). Defaults to trend === 'up'. */
  positive?: boolean;
  /** Short context next to the delta, e.g. "vs last month". */
  note?: string;
  sparkline?: number[];
  /** Hero variant: altitude gradient with white ink (use once per row). */
  featured?: boolean;
  /** Corner action: makes the arrow a link. */
  href?: string;
  icon?: LucideIcon;
  loading?: boolean;
  className?: string;
}

/** KPI card from the approved Cirrus dashboard: label, big number, delta chip, sparkline. */
export function StatCard({
  label,
  value,
  delta,
  trend = 'flat',
  positive,
  note,
  sparkline,
  featured = false,
  href,
  icon: Icon = ArrowUpRight,
  loading = false,
  className,
}: StatCardProps) {
  const good = positive ?? trend === 'up';
  const TrendIcon = trend === 'down' ? TrendingDown : trend === 'up' ? TrendingUp : null;

  const corner = (
    <span
      className={cn(
        'grid size-8 place-items-center rounded-full transition-transform group-hover/stat:rotate-45',
        featured ? 'bg-white/18 text-current' : 'bg-surface-raised text-foreground',
      )}
    >
      <Icon className="size-4" aria-hidden />
    </span>
  );

  return (
    <Card
      tone={featured ? 'altitude' : 'surface'}
      className={cn(
        'group/stat flex min-h-40 flex-col justify-between gap-6 overflow-hidden p-5',
        className,
      )}
    >
      {featured && (
        <span
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-12 size-48 rounded-full bg-white/10"
        />
      )}
      <div className="relative flex items-center justify-between gap-3">
        <span
          className={cn(
            'text-xs font-medium tracking-[0.16em] uppercase',
            featured ? 'text-current opacity-85' : 'text-muted',
          )}
        >
          {label}
        </span>
        {href ? (
          <Link href={href} aria-label={`Open ${label}`} className="rounded-full">
            {corner}
          </Link>
        ) : (
          corner
        )}
      </div>

      <div className="relative flex items-end justify-between gap-3">
        <div className="min-w-0">
          {loading ? (
            <Skeleton className={cn('h-8 w-28', featured && 'opacity-40')} />
          ) : (
            <div className="num truncate text-[32px] leading-none font-medium tracking-tight">
              {value}
            </div>
          )}
          {(delta || note) && !loading && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {delta && (
                <span
                  className={cn(
                    'num inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium',
                    featured
                      ? 'bg-white text-sky-800'
                      : good
                        ? 'bg-success/14 text-[color-mix(in_srgb,var(--success)_72%,var(--text))]'
                        : 'bg-warning/14 text-[color-mix(in_srgb,var(--warning)_72%,var(--text))]',
                  )}
                >
                  {TrendIcon && <TrendIcon className="size-3" aria-hidden />}
                  {delta}
                </span>
              )}
              {note && <span className={featured ? 'opacity-85' : 'text-muted'}>{note}</span>}
            </div>
          )}
        </div>
        {sparkline && !loading && (
          <Sparkline
            data={sparkline}
            className={cn('shrink-0', featured ? 'text-current' : 'text-sky-600 dark:text-sky-400')}
          />
        )}
      </div>
    </Card>
  );
}
