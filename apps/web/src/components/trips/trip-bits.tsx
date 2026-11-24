'use client';

import { ArrowRight, Clock } from 'lucide-react';
import { fmt, useMessages } from '@/lib/i18n';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';
import { tripWords } from './trip-messages';
import { daysUntil } from './trip-utils';

/** Confirmed / max with a thin progress bar and the free seats. */
export function SeatsBar({ confirmed, max, className }: { confirmed: number; max: number; className?: string }) {
  const t = useMessages(tripWords);
  const ratio = max > 0 ? Math.min(1, confirmed / max) : 0;
  const full = confirmed >= max;
  return (
    <div className={cn('min-w-28', className)}>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="num ltr-nums font-medium">
          {confirmed}/{max}
        </span>
        <span className={cn('text-xs', full ? 'font-medium text-danger' : 'text-muted')}>
          <span className="num">{Math.max(0, max - confirmed)}</span> {t.available}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral/15" aria-hidden>
        <div
          className={cn('h-full rounded-full transition-[width]', full ? 'bg-danger' : ratio >= 0.8 ? 'bg-warning' : 'bg-primary')}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}

/** Deadline with a warning chip when fewer than 3 days remain (registration open). */
export function DeadlineCell({ iso, open }: { iso: string; open: boolean }) {
  const t = useMessages(tripWords);
  const f = useFormat();
  const days = daysUntil(iso);
  const soon = open && days > 0 && days < 3;
  return (
    <div className="flex flex-col gap-1">
      <span className={cn('text-sm whitespace-nowrap', soon && 'font-medium text-[color-mix(in_srgb,var(--warning)_75%,var(--text))]')}>
        {f.date(iso, 'medium')} <span className="num text-xs text-muted">{f.date(iso, 'time')}</span>
      </span>
      {soon && (
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-warning/14 px-2 py-0.5 text-[11px] font-medium text-[color-mix(in_srgb,var(--warning)_72%,var(--text))] ring-1 ring-warning/24 ring-inset">
          <Clock className="size-3" aria-hidden />
          {days >= 1 ? fmt(t.daysLeft, { n: Math.floor(days) }) : fmt(t.hoursLeft, { n: Math.max(1, Math.floor(days * 24)) })}
        </span>
      )}
      {open && days <= 0 && <span className="text-[11px] text-muted">{t.ended}</span>}
    </div>
  );
}

/** "Damascus → Latakia" with a direction-aware arrow. */
export function RouteText({ from, to, className }: { from: string; to: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span>{from}</span>
      <ArrowRight className="rtl-flip size-3.5 shrink-0 text-subtle" aria-hidden />
      <span>{to}</span>
    </span>
  );
}
