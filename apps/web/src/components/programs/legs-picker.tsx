'use client';

/*
 * PGM-01/02: the ordered chain of trips of a program, with reorder / remove, live continuity
 * hints between consecutive legs, and the list of trips that can be added.
 */
import { ArrowDown, ArrowRight, ArrowUp, Check, MapPin, Plus, Route, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useName } from '@/lib/hooks';
import { fmt, useMessages } from '@/lib/i18n';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';
import { programMessages } from './messages';
import { ModeIcon } from './product-bits';
import { linkCheck, type LegTrip, type LinkCheck } from './program-utils';

function LinkHint({ check, prev, next }: { check: LinkCheck; prev: LegTrip; next: LegTrip }) {
  const t = useMessages(programMessages);
  const name = useName();
  const f = useFormat();
  if (check.ok)
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[color-mix(in_srgb,var(--success)_75%,var(--text))]">
        <span className="grid size-4 place-items-center rounded-full bg-success/15">
          <Check className="size-3" aria-hidden />
        </span>
        {t.linkOk}
      </span>
    );
  return (
    <span className="flex flex-col gap-0.5 text-xs font-medium text-danger">
      {(check.kind === 'place' || check.kind === 'both') && (
        <span className="inline-flex items-center gap-1.5">
          <span className="grid size-4 shrink-0 place-items-center rounded-full bg-danger/12">
            <X className="size-3" aria-hidden />
          </span>
          {fmt(t.linkPlace, { prev: name(prev.destinationCity), next: name(next.originCity) })}
        </span>
      )}
      {(check.kind === 'time' || check.kind === 'both') && (
        <span className="inline-flex items-center gap-1.5">
          <span className="grid size-4 shrink-0 place-items-center rounded-full bg-danger/12">
            <X className="size-3" aria-hidden />
          </span>
          {fmt(t.linkTime, { at: f.date(prev.endsAt, 'dateTime') })}
        </span>
      )}
    </span>
  );
}

export function LegsChain({ legs, onChange, locked }: { legs: LegTrip[]; onChange: (legs: LegTrip[]) => void; locked?: boolean }) {
  const t = useMessages(programMessages);
  const name = useName();
  const f = useFormat();

  const move = (i: number, d: -1 | 1) => {
    const next = [...legs];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    onChange(next);
  };

  if (!legs.length)
    return (
      <div className="rounded-[18px] border border-dashed border-border-strong">
        <EmptyState size="sm" icon={Route} title={t.chainEmpty} description={t.chainEmptyBody} />
      </div>
    );

  return (
    <ol className="flex flex-col">
      {legs.map((leg, i) => {
        const prev = legs[i - 1];
        const check = prev ? linkCheck(prev, leg) : null;
        return (
          <li key={leg.id} className="relative flex flex-col">
            {prev && check && (
              <div className="flex items-stretch gap-3 ps-[15px]">
                <span className={cn('w-0.5 shrink-0 rounded-full', check.ok ? 'bg-success/50' : 'bg-danger/60')} aria-hidden />
                <div className="py-2.5 ps-4">
                  <LinkHint check={check} prev={prev} next={leg} />
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  'num relative z-[1] mt-3 grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold',
                  i === 0 || i === legs.length - 1 ? 'bg-ink text-ink-foreground' : 'bg-surface-raised text-foreground ring-1 ring-border',
                )}
                aria-label={fmt(t.leg, { n: i + 1 })}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1 rounded-[16px] border border-border bg-surface-raised p-3.5 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="num ltr-nums text-xs font-medium text-muted">{leg.code}</span>
                      <StatusBadge kind="product" status={leg.status} size="sm" />
                      {leg.modes?.map((mode) => <ModeIcon key={mode} mode={mode} className="size-3.5 text-muted" />)}
                    </div>
                    <div className="mt-1 truncate text-sm font-medium">{leg.title}</div>
                  </div>
                  {!locked && (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button type="button" size="icon-sm" variant="ghost" aria-label={t.moveUp} disabled={i === 0} onClick={() => move(i, -1)}>
                        <ArrowUp />
                      </Button>
                      <Button type="button" size="icon-sm" variant="ghost" aria-label={t.moveDown} disabled={i === legs.length - 1} onClick={() => move(i, 1)}>
                        <ArrowDown />
                      </Button>
                      <Button type="button" size="icon-sm" variant="ghost" aria-label={`${t.remove} ${leg.code}`} onClick={() => onChange(legs.filter((x) => x.id !== leg.id))}>
                        <X className="text-danger" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-[13px]">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-subtle" aria-hidden />
                    <span className="font-medium">{name(leg.originCity)}</span>
                    <ArrowRight className="rtl-flip size-3.5 text-subtle" aria-hidden />
                    <span className="font-medium">{name(leg.destinationCity)}</span>
                  </span>
                  <span className="num text-muted">
                    {f.date(leg.startsAt, 'dateTime')} <span className="text-subtle">—</span> {f.date(leg.endsAt, 'dateTime')}
                  </span>
                  <span className="num font-semibold">{f.money(leg.pricePerPerson, leg.currencyCode)}</span>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function TripPicker({
  trips,
  loading,
  selected,
  currency,
  last,
  allowedBranch,
  onAdd,
}: {
  trips: LegTrip[];
  loading: boolean;
  selected: LegTrip[];
  /** Currency of the chain (first leg), if any */
  currency: string | null;
  last: LegTrip | null;
  /** undefined = no branch filter, null = shared trips only, id = that branch + shared */
  allowedBranch: string | null | undefined;
  onAdd: (leg: LegTrip) => void;
}) {
  const t = useMessages(programMessages);
  const name = useName();
  const f = useFormat();
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const taken = new Set(selected.map((s) => s.id));
    const needle = q.trim().toLowerCase();
    return trips
      .filter((tr) => !taken.has(tr.id))
      .filter((tr) => allowedBranch === undefined || tr.branchId === null || tr.branchId === allowedBranch)
      .filter(
        (tr) =>
          !needle ||
          [tr.code, tr.title, tr.originCity.nameAr, tr.originCity.nameEn, tr.destinationCity.nameAr, tr.destinationCity.nameEn].some((s) => s?.toLowerCase().includes(needle)),
      )
      .map((tr) => { const sameCurrency = !currency || tr.currencyCode === currency; return { tr, continues: sameCurrency && !!last && linkCheck(last, tr).ok, sameCurrency }; })
      .sort((a, b) => Number(b.continues) - Number(a.continues) || Number(b.sameCurrency) - Number(a.sameCurrency) || a.tr.startsAt.localeCompare(b.tr.startsAt));
  }, [trips, selected, q, last, currency, allowedBranch]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.pickSearch} aria-label={t.pickSearch} className="h-10 ps-10" />
      </div>
      <div className="grid max-h-[460px] content-start gap-2 overflow-y-auto pe-1 md:grid-cols-2">
        {loading &&
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[84px] rounded-[14px]" />)}
        {!loading && !rows.length && <p className="py-8 text-center text-sm text-muted md:col-span-2">{t.pickNone}</p>}
        {rows.map(({ tr, continues, sameCurrency }) => (
          <div
            key={tr.id}
            className={cn(
              'group rounded-[14px] border p-3 transition-colors',
              continues ? 'border-success/40 bg-success/5' : 'border-border bg-surface-raised',
              !sameCurrency && 'opacity-55',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="num ltr-nums text-[11px] font-medium text-muted">{tr.code}</span>
                  <StatusBadge kind="product" status={tr.status} size="sm" />
                  {continues && (
                    <span className="inline-flex h-5 items-center gap-1 rounded-full bg-success/14 px-2 text-[11px] font-medium text-[color-mix(in_srgb,var(--success)_75%,var(--text))]">
                      <Check className="size-3" aria-hidden /> {t.continues}
                    </span>
                  )}
                  {!sameCurrency && <span className="text-[11px] font-medium text-warning">{t.otherCurrency}</span>}
                </div>
                <div className="mt-1 truncate text-[13px] font-medium">{tr.title}</div>
              </div>
              <Button type="button" size="xs" variant={continues ? 'primary' : 'secondary'} disabled={!sameCurrency} onClick={() => onAdd(tr)} aria-label={`${t.add_} ${tr.code}`}>
                <Plus /> {t.add_}
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
              <span className="inline-flex items-center gap-1">
                {name(tr.originCity)}
                <ArrowRight className="rtl-flip size-3 text-subtle" aria-hidden />
                {name(tr.destinationCity)}
              </span>
              <span className="num text-muted">
                {f.date(tr.startsAt, 'short')} — {f.date(tr.endsAt, 'short')}
              </span>
              <span className="num font-medium">{f.money(tr.pricePerPerson, tr.currencyCode)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
