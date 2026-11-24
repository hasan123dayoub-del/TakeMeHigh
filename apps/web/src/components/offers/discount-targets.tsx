'use client';

/* OFR-02: target trips and programs of a discount offer, with the price before / after for each. */
import type { ProductStatus, ProfitMode } from '@travelos/shared';
import { Check, Map as MapIcon, Route } from 'lucide-react';
import { useMemo } from 'react';
import { StatusBadge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useList } from '@/lib/hooks';
import { fmt, useMessages } from '@/lib/i18n';
import type { Program, TripListItem } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';
import { discountCents, fromCents, toCents } from '../programs/product-bits';
import { offerMessages } from './messages';

export interface TargetRef {
  id: string;
  code: string;
  title: string;
  status: ProductStatus;
  pricePerPerson: string;
  currencyCode: string;
}

export function DiscountTargets({
  tripIds,
  programIds,
  onChange,
  mode,
  value,
  known,
}: {
  tripIds: string[];
  programIds: string[];
  onChange: (next: { tripIds: string[]; programIds: string[] }) => void;
  mode: ProfitMode;
  value: string;
  /** Targets already on the offer (may not be OPEN any more) */
  known: { trips: TargetRef[]; programs: TargetRef[] };
}) {
  const t = useMessages(offerMessages);
  const trips = useList<TripListItem>('/trips', { status: 'OPEN', pageSize: 100, sort: 'startsAt', order: 'asc' });
  const programs = useList<Program>('/programs', { status: 'OPEN', pageSize: 100 });

  const tripRows = useMemo(() => merge(known.trips, trips.data?.data ?? []), [known.trips, trips.data]);
  const programRows = useMemo(() => merge(known.programs, programs.data?.data ?? []), [known.programs, programs.data]);

  const toggle = (list: 'tripIds' | 'programIds', id: string) => {
    const cur = list === 'tripIds' ? tripIds : programIds;
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    onChange({ tripIds: list === 'tripIds' ? next : tripIds, programIds: list === 'programIds' ? next : programIds });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <TargetList
        icon={Route}
        title={t.trips}
        rows={tripRows}
        selected={tripIds}
        loading={trips.isLoading}
        mode={mode}
        value={value}
        onToggle={(id) => toggle('tripIds', id)}
      />
      <TargetList
        icon={MapIcon}
        title={t.programs}
        rows={programRows}
        selected={programIds}
        loading={programs.isLoading}
        mode={mode}
        value={value}
        onToggle={(id) => toggle('programIds', id)}
      />
    </div>
  );
}

function merge(known: TargetRef[], open: TargetRef[]) {
  const ids = new Set(open.map((x) => x.id));
  return [...known.filter((k) => !ids.has(k.id)), ...open];
}

function TargetList({
  icon: Icon,
  title,
  rows,
  selected,
  loading,
  mode,
  value,
  onToggle,
}: {
  icon: typeof Route;
  title: string;
  rows: TargetRef[];
  selected: string[];
  loading: boolean;
  mode: ProfitMode;
  value: string;
  onToggle: (id: string) => void;
}) {
  const t = useMessages(offerMessages);
  const f = useFormat();
  return (
    <div className="min-w-0">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="inline-flex items-center gap-2 text-sm font-medium">
          <Icon className="size-4 text-primary" aria-hidden /> {title}
        </h3>
        <span className="num text-xs text-muted">{fmt(t.selected, { n: selected.length })}</span>
      </div>
      <div className="flex max-h-[440px] flex-col gap-2 overflow-y-auto pe-1">
        {loading && Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[68px] rounded-[14px]" />)}
        {!loading && !rows.length && <p className="py-6 text-center text-sm text-muted">{t.noTargets}</p>}
        {rows.map((r) => {
          const on = selected.includes(r.id);
          const price = toCents(r.pricePerPerson);
          const after = price - discountCents(price, mode, value);
          return (
            <button
              key={r.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => onToggle(r.id)}
              className={cn(
                'flex items-center gap-3 rounded-[14px] border p-3 text-start transition-colors',
                on ? 'border-primary/50 bg-primary/6 ring-1 ring-primary/25' : 'border-border bg-surface-raised hover:border-border-strong',
              )}
            >
              <span className={cn('grid size-5 shrink-0 place-items-center rounded-[6px] border', on ? 'border-primary bg-primary text-primary-foreground' : 'border-border-strong')}>
                {on && <Check className="size-3.5" aria-hidden />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="num ltr-nums text-[12px] font-medium text-muted">{r.code}</span>
                  {r.status !== 'OPEN' && <StatusBadge kind="product" status={r.status} size="sm" />}
                </span>
                <span className="mt-0.5 block truncate text-[14px] font-medium">{r.title}</span>
              </span>
              <span className="shrink-0 text-end">
                <span className="num block text-[12px] text-muted line-through decoration-danger/60">{f.money(r.pricePerPerson, r.currencyCode)}</span>
                <span className={cn('num block text-[14px] font-semibold', on && 'text-[color-mix(in_srgb,var(--success)_75%,var(--text))]')}>{f.money(fromCents(after), r.currencyCode)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
