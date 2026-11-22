'use client';

import { defineMessages, fmt, useMessages } from '@/lib/i18n';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';

const m = defineMessages({
  ar: {
    seats: '{c} / {max} مقعد مؤكد',
    min: 'الحد الأدنى {n}',
    aria: '{c} من {max} مقعد مؤكد، الحد الأدنى {min}',
    full: 'مكتملة',
  },
  en: {
    seats: '{c} / {max} seats confirmed',
    min: 'Min {n}',
    aria: '{c} of {max} seats confirmed, minimum {min}',
    full: 'Full',
  },
});

/**
 * Confirmed / max seats bar with a tick at the minimum-passengers mark.
 * Only CONFIRMED bookings consume seats (server value `confirmedSeats`).
 */
export function SeatsBar({
  confirmed,
  max,
  min,
  compact = false,
  className,
}: {
  confirmed: number;
  max: number;
  min: number;
  compact?: boolean;
  className?: string;
}) {
  const t = useMessages(m);
  const f = useFormat();
  const pct = max > 0 ? Math.min(100, (confirmed / max) * 100) : 0;
  const minPct = max > 0 ? Math.min(100, (min / max) * 100) : 0;
  const reached = confirmed >= min;
  const full = confirmed >= max;
  return (
    <div className={cn('grid gap-1.5', className)}>
      {!compact && (
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="num font-medium text-foreground">
            {fmt(t.seats, { c: f.number(confirmed), max: f.number(max) })}
          </span>
          <span className={cn('num', reached ? 'text-success' : 'text-muted')}>
            {full ? t.full : fmt(t.min, { n: f.number(min) })}
          </span>
        </div>
      )}
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={confirmed}
        aria-label={fmt(t.aria, { c: confirmed, max, min })}
        className="relative h-2 rounded-full bg-surface-sunken"
      >
        <div
          className={cn(
            'absolute inset-y-0 start-0 rounded-full transition-[width] duration-500 ease-out-soft',
            full ? 'bg-ink' : reached ? 'bg-primary' : 'bg-sky-400',
          )}
          style={{ width: `${pct}%` }}
        />
        {min > 0 && min < max && (
          <span
            aria-hidden
            className="absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 rounded-full bg-foreground/70 rtl:translate-x-1/2"
            style={{ insetInlineStart: `${minPct}%` }}
          />
        )}
      </div>
    </div>
  );
}

/** Circular occupancy ring for the trip KPI strip. */
export function SeatsRing({ confirmed, max, size = 72 }: { confirmed: number; max: number; size?: number }) {
  const f = useFormat();
  const stroke = 7;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, confirmed / max) : 0;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} aria-hidden>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-surface-sunken" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          className="stroke-primary transition-[stroke-dashoffset] duration-700 ease-out-soft"
        />
      </svg>
      <span className="num absolute text-[13px] font-medium">{f.number(Math.round(pct * 100))}%</span>
    </div>
  );
}
