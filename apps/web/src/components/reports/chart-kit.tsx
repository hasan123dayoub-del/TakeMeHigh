'use client';

import type { ReactNode } from 'react';
import type { TooltipContentProps } from 'recharts';
import { useLocale } from '@/lib/i18n';
import type { StatRow } from '@/lib/types/api';
import { cn } from '@/lib/utils';

/*
 * Shared chart helpers for the home page and the statistics page.
 * Colours come from the design tokens (--chart-1..6) so light and dark themes switch for free.
 * RTL: the time axis runs right → left in Arabic (XAxis `reversed`) and the value axis sits on the right.
 */

export const CHART = {
  c1: 'var(--chart-1)',
  c2: 'var(--chart-2)',
  c3: 'var(--chart-3)',
  c4: 'var(--chart-4)',
  c5: 'var(--chart-5)',
  c6: 'var(--chart-6)',
  grid: 'var(--border)',
  tick: 'var(--text-muted)',
} as const;

/** Axis props that make charts read naturally in the current direction. */
export function useChartAxes() {
  const { dir } = useLocale();
  const rtl = dir === 'rtl';
  return {
    rtl,
    x: {
      reversed: rtl,
      tickLine: false,
      axisLine: false,
      tickMargin: 8,
      tick: { fill: 'var(--text-muted)', fontSize: 12 },
    },
    y: {
      orientation: rtl ? ('right' as const) : ('left' as const),
      tickLine: false,
      axisLine: false,
      tickMargin: 6,
      width: 64,
      tick: { fill: 'var(--text-muted)', fontSize: 12 },
    },
    grid: { vertical: false, stroke: 'var(--border)', strokeDasharray: '3 4' },
  };
}

/** "2026-03" → "Mar" / "آذار"; "2026" stays as is. */
export function usePeriodLabel() {
  const { intl } = useLocale();
  return (period: string, style: 'short' | 'long' = 'short') => {
    const m = /^(\d{4})-(\d{2})$/.exec(period);
    if (!m) return period;
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1));
    return new Intl.DateTimeFormat(intl, style === 'short' ? { month: 'short', timeZone: 'UTC' } : { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
  };
}

/** Compact axis numbers (165m / 165 مليون). */
export function useCompact() {
  const { intl } = useLocale();
  const f = new Intl.NumberFormat(intl, { notation: 'compact', maximumFractionDigits: 1 });
  return (v: number) => f.format(v);
}

/** Rows of one currency, as numbers, ready for recharts. */
export function seriesFor(rows: StatRow[] | undefined, currency: string) {
  return (rows ?? [])
    .filter((r) => r.currency === currency)
    .map((r) => ({
      period: r.period,
      bookings: r.bookings,
      passengers: r.passengers,
      revenue: Number(r.revenue),
      collected: Number(r.collected),
      expectedProfit: Number(r.expectedProfit),
      realizedProfit: Number(r.realizedProfit),
    }));
}

export type ChartRow = ReturnType<typeof seriesFor>[number];

/** Currencies present in a list of rows, the preferred one first. */
export function currenciesOf(codes: string[], preferred?: string) {
  const set = [...new Set(codes)];
  return set.sort((a, b) => (a === preferred ? -1 : b === preferred ? 1 : a.localeCompare(b)));
}

/** Frosted tooltip used by every chart. */
export function ChartTooltip({
  active,
  payload,
  label,
  formatLabel,
  formatValue,
}: Pick<Partial<TooltipContentProps<number, string>>, 'active' | 'payload' | 'label'> & {
  formatLabel?: (label: string) => string;
  formatValue: (v: number) => string;
}) {
  const { dir } = useLocale();
  if (!active || !payload?.length) return null;
  return (
    <div dir={dir} className="min-w-44 rounded-tile border border-border bg-surface-raised px-3.5 py-3 text-xs shadow-pop">
      <div className="mb-2 font-medium text-foreground">{formatLabel ? formatLabel(String(label)) : String(label)}</div>
      <ul className="grid gap-1.5">
        {payload.map((p) => (
          <li key={String(p.dataKey)} className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-2 text-muted">
              <span aria-hidden className="size-2 rounded-full" style={{ background: p.color ?? p.stroke ?? p.fill }} />
              {p.name}
            </span>
            <span className="num font-medium text-foreground">{formatValue(Number(p.value ?? 0))}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Small legend row (recharts' own legend ignores direction). */
export function ChartLegend({ items, className }: { items: { label: ReactNode; color: string; dashed?: boolean }[]; className?: string }) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted', className)}>
      {items.map((i, n) => (
        <li key={n} className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className={cn('inline-block h-2 w-4 rounded-full', i.dashed && 'h-0 border-t-2 border-dashed bg-transparent')}
            style={i.dashed ? { borderColor: i.color } : { background: i.color }}
          />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/** Big KPI money: number at full size, the currency code small beside it (fits narrow cards; full value in the tooltip). */
export function KpiMoney({ value, currency, full }: { value: number | string; currency: string; full: string }) {
  const { intl } = useLocale();
  const n = Number(value) || 0;
  const digits = currency === 'SYP' ? 0 : Number.isInteger(n) ? 0 : 2;
  const text = new Intl.NumberFormat(intl, { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
  return (
    <span title={full} className={cn('inline-flex items-baseline gap-1.5', text.length > 9 && 'text-[26px]', text.length > 12 && 'text-[22px]')}>
      <span>{text}</span>
      <span className="text-sm font-medium tracking-wide opacity-70">{currency}</span>
    </span>
  );
}

/** Recharts positions SVG text assuming LTR; keep the chart LTR and mirror it with the axis props instead. */
export function ChartFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div dir="ltr" className={cn('h-80 p-3 sm:p-4', className)}>
      {children}
    </div>
  );
}
