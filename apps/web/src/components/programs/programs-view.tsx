'use client';

import { PRODUCT_STATUSES, TRAVEL_SCOPES } from '@travelos/shared';
import { ArrowRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fragment, useMemo } from 'react';
import { FilterSelect, ResourceTable, type ResourceColumn } from '@/components/data/resource-table';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth, useCan } from '@/lib/auth';
import { useLookups, useName } from '@/lib/hooks';
import { LABELS, useLocale, useMessages } from '@/lib/i18n';
import type { Program } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';
import { programMessages } from './messages';
import { routeCities } from './program-utils';

export function ProgramsView() {
  const t = useMessages(programMessages);
  const { locale } = useLocale();
  const { isAdmin } = useAuth();
  const canManage = useCan('programs.manage');
  const lookups = useLookups();
  const name = useName();
  const f = useFormat();
  const router = useRouter();

  const columns = useMemo<ResourceColumn<Program>[]>(
    () => [
      {
        id: 'code',
        header: t.code,
        cell: (p) => <span className="num ltr-nums text-xs font-medium whitespace-nowrap text-muted">{p.code}</span>,
      },
      {
        id: 'title',
        header: t.programTitle,
        sortKey: 'title',
        cell: (p) => (
          <div className="min-w-[180px]">
            <Link href={`/dashboard/programs/${p.id}`} className="font-medium hover:text-primary" onClick={(e) => e.stopPropagation()}>
              {p.title}
            </Link>
            <div className="mt-0.5 text-xs text-muted">{name(p.category)}</div>
          </div>
        ),
        print: (p) => `${p.title} — ${name(p.category)}`,
      },
      {
        id: 'route',
        header: t.route,
        cell: (p) => {
          const cities = routeCities(p);
          return (
            <div className="min-w-[200px]">
              <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[14px]">
                {cities.map((c, i) => (
                  <Fragment key={`${c.id}-${i}`}>
                    {i > 0 && <ArrowRight className="rtl-flip size-3 text-subtle" aria-hidden />}
                    <span className={cn(i === 0 || i === cities.length - 1 ? 'font-medium' : 'text-muted')}>{name(c)}</span>
                  </Fragment>
                ))}
              </div>
              <div className="num ltr-nums mt-0.5 text-[12px] text-subtle" dir="ltr">
                {p.legs.map((l) => l.trip.code).join(' → ')}
              </div>
            </div>
          );
        },
        print: (p) => routeCities(p).map((c) => name(c)).join(' ← '),
      },
      {
        id: 'dates',
        header: t.dates,
        cell: (p) => (
          <span className="num text-[14px] whitespace-nowrap">
            {f.date(p.startsAt, 'short')} <span className="text-subtle">—</span> {f.date(p.endsAt, 'short')}
          </span>
        ),
      },
      {
        id: 'deadline',
        header: t.deadline,
        sortKey: 'registrationDeadline',
        cell: (p) => <span className="num text-[14px] whitespace-nowrap">{f.date(p.registrationDeadline, 'short')}</span>,
      },
      {
        id: 'seats',
        header: t.seatsShort,
        align: 'center',
        cell: (p) => (
          <span className="num whitespace-nowrap">
            <span className="font-medium">{p.confirmedSeats}</span>
            <span className="text-subtle"> / </span>
            <span className={cn(p.availableSeats === 0 ? 'text-danger' : 'text-muted')}>{p.availableSeats}</span>
          </span>
        ),
        print: (p) => `${p.confirmedSeats} / ${p.availableSeats}`,
      },
      {
        id: 'price',
        header: t.price,
        sortKey: 'pricePerPerson',
        align: 'end',
        cell: (p) => <span className="num font-medium whitespace-nowrap">{f.money(p.pricePerPerson, p.currencyCode)}</span>,
      },
      {
        id: 'status',
        header: `${t.status} · ${t.scope}`,
        cell: (p) => (
          <div className="flex flex-col items-start gap-1.5">
            <StatusBadge kind="product" status={p.status} />
            <StatusBadge kind="scope" status={p.scope} size="sm" />
          </div>
        ),
        print: (p) => `${LABELS.productStatus[p.status][locale]} · ${LABELS.travelScope[p.scope][locale]}`,
      },
      {
        id: 'branch',
        header: t.branch,
        cell: (p) => <span className="text-[14px] whitespace-nowrap text-muted">{p.branch?.name ?? t.shared}</span>,
      },
    ],
    [t, name, f, locale],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
        actions={
          canManage && (
            <Button asChild>
              <Link href="/dashboard/programs/new">
                <Plus /> {t.add}
              </Link>
            </Button>
          )
        }
      />
      <ResourceTable<Program>
        endpoint="/programs"
        columns={columns}
        exportTitle={t.title}
        searchPlaceholder={t.search}
        filterKeys={['status', 'categoryId', 'scope', 'branchId']}
        defaultSort={{ key: 'createdAt', order: 'desc' }}
        minWidth={1040}
        filters={(flt, set) => (
          <>
            <FilterSelect
              label={t.status}
              value={flt.status}
              onChange={(v) => set({ status: v })}
              options={PRODUCT_STATUSES.map((s) => ({ value: s, label: LABELS.productStatus[s][locale] }))}
            />
            <FilterSelect
              label={t.category}
              value={flt.categoryId}
              onChange={(v) => set({ categoryId: v })}
              options={(lookups.data?.categories ?? []).map((c) => ({ value: c.id, label: name(c) }))}
            />
            <FilterSelect
              label={t.scope}
              value={flt.scope}
              onChange={(v) => set({ scope: v })}
              options={TRAVEL_SCOPES.map((s) => ({ value: s, label: LABELS.travelScope[s][locale] }))}
            />
            {isAdmin && (
              <FilterSelect
                label={t.branch}
                value={flt.branchId}
                onChange={(v) => set({ branchId: v })}
                options={(lookups.data?.branches ?? []).map((b) => ({ value: b.id, label: b.name }))}
              />
            )}
          </>
        )}
        onRowClick={(p) => router.push(`/dashboard/programs/${p.id}`)}
        getRowId={(p) => p.id}
        empty={{
          title: t.empty,
          description: t.emptyBody,
          action: canManage ? (
            <Button asChild>
              <Link href="/dashboard/programs/new">
                <Plus /> {t.add}
              </Link>
            </Button>
          ) : undefined,
        }}
      />
    </div>
  );
}
