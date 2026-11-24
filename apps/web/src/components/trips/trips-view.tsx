'use client';

import { LABELS } from '@travelos/shared';
import { Plus, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { FilterSelect, ResourceTable, type ResourceColumn } from '@/components/data/resource-table';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Tooltip } from '@/components/ui/tooltip';
import { useAuth } from '@/lib/auth';
import { useLookups, useName } from '@/lib/hooks';
import { defineMessages, useLocale, useMessages } from '@/lib/i18n';
import type { TripListItem } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';
import { DeadlineCell, RouteText, SeatsBar } from './trip-bits';
import { tripWords } from './trip-messages';

const m = defineMessages({
  ar: {
    description: 'كل رحلة إطار زمني ومسار تُبنى خدماته من الموردين (نقل، فندق، مطعم)، ويُحسب سعرها تلقائياً من مجموع الخدمات.',
    search: 'ابحث بالرمز أو العنوان أو المدينة…',
    from: 'من تاريخ',
    to: 'إلى تاريخ',
    visibility: 'الظهور',
    empty: 'لا توجد رحلات',
    emptyBody: 'أنشئ أول رحلة ثم أضف خدماتها وانشرها.',
  },
  en: {
    description: 'Each trip is a time frame and a route built from supplier services (transport, hotel, restaurant); its price is the sum of its services.',
    search: 'Search by code, title or city…',
    from: 'From',
    to: 'To',
    visibility: 'Visibility',
    empty: 'No trips',
    emptyBody: 'Create the first trip, add its services and publish it.',
  },
});

export function TripsView() {
  const t = useMessages(m);
  const w = useMessages(tripWords);
  const { locale } = useLocale();
  const { isAdmin, can } = useAuth();
  const canManage = can('trips.manage');
  const lookups = useLookups().data;
  const name = useName();
  const f = useFormat();
  const router = useRouter();

  const columns = useMemo<ResourceColumn<TripListItem>[]>(
    () => [
      { id: 'code', header: w.code, cell: (x) => <span className="num ltr-nums text-[14px] font-medium whitespace-nowrap">{x.code}</span> },
      {
        id: 'title',
        header: w.title,
        sortKey: 'title',
        cell: (x) => (
          <div className="min-w-40 max-w-60">
            <div className="font-medium leading-snug">{x.title}</div>
            <div className="mt-0.5 text-xs text-muted">
              {name(x.category)} · <span className={cn(x.branch && 'text-foreground/80')}>{x.branch?.name ?? w.allBranches}</span>
            </div>
          </div>
        ),
        print: (x) => `${x.title} — ${name(x.category)}`,
      },
      {
        id: 'status',
        header: w.status,
        cell: (x) => (
          <div className="flex items-center gap-1.5">
            <StatusBadge kind="product" status={x.status} />
            {x.costChangedAt && (
              <Tooltip content={w.costChangedHint}>
                <span className="grid size-6 place-items-center rounded-full bg-warning/14 text-[color-mix(in_srgb,var(--warning)_75%,var(--text))]" aria-label={w.costChangedHint} role="img">
                  <TriangleAlert className="size-3.5" />
                </span>
              </Tooltip>
            )}
          </div>
        ),
        print: (x) => `${LABELS.productStatus[x.status][locale]}${x.costChangedAt ? ` (${w.costChanged})` : ''}`,
      },
      {
        id: 'route',
        header: w.route,
        cell: (x) => (
          <div className="flex flex-col items-start gap-1">
            <RouteText from={name(x.originCity)} to={name(x.destinationCity)} className="text-sm whitespace-nowrap" />
            <StatusBadge kind="scope" status={x.scope} size="sm" />
          </div>
        ),
        print: (x) => `${name(x.originCity)} ← ${name(x.destinationCity)} (${LABELS.travelScope[x.scope][locale]})`,
      },
      {
        id: 'dates',
        header: w.dates,
        sortKey: 'startsAt',
        cell: (x) => (
          <div className="text-sm whitespace-nowrap">
            <div>{f.date(x.startsAt, 'medium')}</div>
            <div className="text-xs text-muted">{f.date(x.endsAt, 'medium')}</div>
          </div>
        ),
        print: (x) => `${f.date(x.startsAt, 'dateTime')} — ${f.date(x.endsAt, 'dateTime')}`,
      },
      {
        id: 'deadline',
        header: w.deadline,
        sortKey: 'registrationDeadline',
        cell: (x) => <DeadlineCell iso={x.registrationDeadline} open={x.status === 'OPEN'} />,
        print: (x) => f.date(x.registrationDeadline, 'dateTime'),
      },
      {
        id: 'seats',
        header: w.seats,
        cell: (x) => <SeatsBar confirmed={x.confirmedSeats} max={x.maxPassengers} />,
        print: (x) => `${x.confirmedSeats}/${x.maxPassengers}`,
      },
      {
        id: 'price',
        header: w.price,
        sortKey: 'pricePerPerson',
        align: 'end',
        cell: (x) => <span className="num font-medium whitespace-nowrap">{f.money(x.pricePerPerson, x.currencyCode)}</span>,
      },
      { id: 'branch', header: w.branch, printOnly: true, cell: (x) => x.branch?.name ?? w.allBranches },
    ],
    [w, name, f, locale],
  );

  const statusOptions = (Object.keys(LABELS.productStatus) as (keyof typeof LABELS.productStatus)[]).map((s) => ({ value: s, label: LABELS.productStatus[s][locale] }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={w.eyebrow}
        title={w.trips}
        description={t.description}
        actions={
          canManage && (
            <Button asChild>
              <Link href="/dashboard/trips/new">
                <Plus /> {w.newTrip}
              </Link>
            </Button>
          )
        }
      />
      <ResourceTable<TripListItem>
        endpoint="/trips"
        columns={columns}
        exportTitle={w.trips}
        searchPlaceholder={t.search}
        filterKeys={['status', 'categoryId', 'scope', 'branchId', 'from', 'to', 'isPublic', 'costChanged']}
        defaultSort={{ key: 'startsAt', order: 'desc' }}
        minWidth={960}
        filters={(fl, set) => (
          <>
            <FilterSelect label={w.status} value={fl.status} onChange={(v) => set({ status: v })} options={statusOptions} />
            <FilterSelect
              label={w.category}
              value={fl.categoryId}
              onChange={(v) => set({ categoryId: v })}
              options={(lookups?.categories ?? []).map((c) => ({ value: c.id, label: name(c) }))}
            />
            <FilterSelect
              label={w.scope}
              value={fl.scope}
              onChange={(v) => set({ scope: v })}
              options={(['DOMESTIC', 'INTERNATIONAL'] as const).map((s) => ({ value: s, label: LABELS.travelScope[s][locale] }))}
            />
            {isAdmin && (
              <FilterSelect
                label={w.branch}
                value={fl.branchId}
                onChange={(v) => set({ branchId: v })}
                options={(lookups?.branches ?? []).map((b) => ({ value: b.id, label: b.name }))}
              />
            )}
            <FilterSelect
              label={t.visibility}
              value={fl.isPublic}
              onChange={(v) => set({ isPublic: v })}
              options={[
                { value: 'true', label: w.public },
                { value: 'false', label: w.private },
              ]}
            />
            <DateFilter label={t.from} value={fl.from?.slice(0, 10)} onChange={(v) => set({ from: v })} />
            <DateFilter label={t.to} value={fl.to?.slice(0, 10)} onChange={(v) => set({ to: v ? `${v}T23:59:59` : undefined })} />
            <button
              type="button"
              aria-pressed={fl.costChanged === 'true'}
              onClick={() => set({ costChanged: fl.costChanged === 'true' ? undefined : 'true' })}
              className={cn(
                'inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-[14px] font-medium transition-colors',
                fl.costChanged === 'true'
                  ? 'border-warning/40 bg-warning/14 text-[color-mix(in_srgb,var(--warning)_75%,var(--text))]'
                  : 'border-border bg-surface-raised text-muted hover:text-foreground',
              )}
            >
              <TriangleAlert className="size-3.5" aria-hidden />
              {w.costChanged}
            </button>
          </>
        )}
        onRowClick={(x) => router.push(`/dashboard/trips/${x.id}`)}
        getRowId={(x) => x.id}
        empty={{
          title: t.empty,
          description: t.emptyBody,
          action: canManage ? (
            <Button asChild>
              <Link href="/dashboard/trips/new">
                <Plus /> {w.newTrip}
              </Link>
            </Button>
          ) : undefined,
        }}
      />
    </div>
  );
}

function DateFilter({ label, value, onChange }: { label: string; value: string | undefined; onChange: (v: string | undefined) => void }) {
  return (
    <label className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface-raised ps-3.5 pe-2 text-[14px] shadow-card">
      <span className="text-subtle">{label}:</span>
      <input
        type="date"
        dir="ltr"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="num bg-transparent text-[14px] outline-none"
        aria-label={label}
      />
    </label>
  );
}
