'use client';

import { BOOKING_STATUSES, type BookingStatus } from '@travelos/shared';
import { CalendarCheck, FilterX, Plus, SearchX, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/lib/auth';
import { fmt, LABELS, useLocale, useMessages } from '@/lib/i18n';
import { useBookings, useBranches } from '@/lib/queries/bookings';
import type { BookingListItem } from '@/lib/types/bookings';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';
import { Forbidden, ListSkeleton, Ltr, Money, Pager, QueryError, SearchField } from './kit';
import { bm } from './messages';
import { useDebounced } from './use-debounced';

type Tab = 'ALL' | BookingStatus;
const PAGE_SIZE = 20;

export function BookingsList() {
  const { can, scope } = useAuth();
  const t = useMessages(bm);
  const { locale } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const statusParam = sp.get('status') as BookingStatus | null;
  const status: Tab = statusParam && (BOOKING_STATUSES as readonly string[]).includes(statusParam) ? statusParam : 'ALL';
  const tripId = sp.get('tripId') ?? undefined;
  const customerId = sp.get('customerId') ?? undefined;
  const branchId = scope === 'OFFICE' ? (sp.get('branchId') ?? undefined) : undefined;
  const page = Math.max(1, Number(sp.get('page')) || 1);

  const [search, setSearch] = useState(sp.get('q') ?? '');
  const debounced = useDebounced(search.trim());

  const setParams = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!('page' in patch)) next.delete('page');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // keep ?q= in sync with the debounced search
  useEffect(() => {
    if ((sp.get('q') ?? '') !== debounced) setParams({ q: debounced || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const query = useBookings({
    page,
    pageSize: PAGE_SIZE,
    status: status === 'ALL' ? undefined : status,
    tripId,
    customerId,
    branchId,
    search: debounced || undefined,
  });
  const branches = useBranches(scope === 'OFFICE');

  if (!can('bookings.view')) return <Forbidden />;

  const rows = query.data?.data ?? [];
  const filtered = !!(debounced || tripId || customerId || branchId || status !== 'ALL');

  const tabs = [
    { value: 'ALL' as Tab, label: t.tabAll },
    ...BOOKING_STATUSES.map((s) => ({ value: s as Tab, label: LABELS.bookingStatus[s][locale] })),
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
        actions={
          can('bookings.create') && (
            <Button asChild size="lg">
              <Link href="/dashboard/bookings/new">
                <Plus /> {t.newBooking}
              </Link>
            </Button>
          )
        }
      />

      <section className="flex flex-col gap-4">
        <div className="-mx-1 overflow-x-auto px-1 pb-1 scrollbar-none">
          <SegmentedControl aria-label={t.colStatus} options={tabs} value={status} onValueChange={(v) => setParams({ status: v === 'ALL' ? undefined : v })} size="md" />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchField value={search} onChange={setSearch} placeholder={t.searchPh} className="sm:max-w-md sm:flex-1" />
          {scope === 'OFFICE' && (
            <Select value={branchId ?? 'ALL'} onValueChange={(v) => setParams({ branchId: v === 'ALL' ? undefined : v })}>
              <SelectTrigger className="sm:w-56" aria-label={t.colBranch}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t.allBranches}</SelectItem>
                {branches.data?.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {(tripId || customerId) && (
            <div className="flex flex-wrap gap-1.5">
              {tripId && <FilterChip label={t.filteredTrip} onClear={() => setParams({ tripId: undefined })} />}
              {customerId && <FilterChip label={t.filteredCustomer} onClear={() => setParams({ customerId: undefined })} />}
            </div>
          )}
        </div>

        {query.isError ? (
          <QueryError error={query.error} onRetry={() => query.refetch()} />
        ) : query.isPending ? (
          <ListSkeleton rows={8} />
        ) : rows.length === 0 ? (
          filtered ? (
            <EmptyState
              icon={SearchX}
              title={t.noResults}
              description={t.noResultsBody}
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch('');
                    router.replace(pathname);
                  }}
                >
                  <FilterX /> {t.clearFilters}
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={CalendarCheck}
              title={t.emptyTitle}
              description={t.emptyBody}
              action={
                can('bookings.create') && (
                  <Button asChild>
                    <Link href="/dashboard/bookings/new">
                      <Plus /> {t.newBooking}
                    </Link>
                  </Button>
                )
              }
            />
          )
        ) : (
          <div className={cn('transition-opacity', query.isPlaceholderData && 'opacity-60')}>
            <BookingsTable rows={rows} showBranch={scope === 'OFFICE'} />
            <BookingCards rows={rows} />
          </div>
        )}

        {query.data && query.data.meta.total > 0 && (
          <Pager {...query.data.meta} loading={query.isFetching} onPageChange={(p) => setParams({ page: String(p) })} />
        )}
      </section>
    </div>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <Badge tone="primary" className="h-7 gap-1.5 pe-1">
      {label}
      <button type="button" onClick={onClear} aria-label={label} className="grid size-5 place-items-center rounded-full hover:bg-primary/15">
        <X className="size-3" />
      </button>
    </Badge>
  );
}

function BookingsTable({ rows, showBranch }: { rows: BookingListItem[]; showBranch: boolean }) {
  const t = useMessages(bm);
  const f = useFormat();
  const router = useRouter();
  return (
    <div className="hidden md:block">
      <Table className="text-start">
        <TableHeader>
          <tr>
            <TableHead className="text-start">{t.colReference}</TableHead>
            <TableHead className="text-start">{t.colCustomer}</TableHead>
            <TableHead className="text-start">{t.colTrip}</TableHead>
            <TableHead className="text-center">{t.colPassengers}</TableHead>
            <TableHead className="text-start">{t.colStatus}</TableHead>
            <TableHead className="text-end">{t.colTotal}</TableHead>
            <TableHead className="text-end">{t.colPaid}</TableHead>
            <TableHead className="text-end">{t.colBalance}</TableHead>
            {showBranch && <TableHead className="hidden text-start xl:table-cell">{t.colBranch}</TableHead>}
            <TableHead className="hidden text-start lg:table-cell">{t.colCreated}</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {rows.map((b) => {
            const href = `/dashboard/bookings/${b.id}`;
            return (
              <TableRow key={b.id} className="cursor-pointer" onClick={() => router.push(href)}>
                <TableCell className="text-start">
                  <Link href={href} onClick={(e) => e.stopPropagation()} className="font-medium text-foreground hover:text-primary focus-visible:text-primary">
                    <Ltr className="num">{b.reference}</Ltr>
                  </Link>
                </TableCell>
                <TableCell className="text-start">
                  <div className="font-medium">{b.customer.fullName}</div>
                  <Ltr className="num text-xs text-muted">{b.customer.phone}</Ltr>
                </TableCell>
                <TableCell className="max-w-56 text-start">
                  <div className="flex items-center gap-1.5">
                    <Ltr className="num font-medium">{b.trip.code}</Ltr>
                    {b.trip.tripType === 'VIP' && <StatusBadge kind="tripType" status="VIP" size="sm" />}
                  </div>
                  <div className="truncate text-xs text-muted">
                    {b.trip.tour.name} · {f.date(b.trip.departureDate, 'short')}
                  </div>
                </TableCell>
                <TableCell className="num text-center">{f.number(b.passengerCount)}</TableCell>
                <TableCell className="text-start">
                  <StatusBadge kind="booking" status={b.status} />
                </TableCell>
                <TableCell className="text-end">
                  <Money value={b.totalAmount} currency={b.currencyCode} />
                </TableCell>
                <TableCell className="text-end text-muted">
                  <Money value={b.paidAmount} currency={b.currencyCode} />
                </TableCell>
                <TableCell className="text-end">
                  <BalanceCell b={b} />
                </TableCell>
                {showBranch && <TableCell className="hidden text-start text-muted xl:table-cell">{b.branch.name}</TableCell>}
                <TableCell className="hidden text-start whitespace-nowrap text-muted lg:table-cell">{f.relative(b.createdAt)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function BalanceCell({ b }: { b: BookingListItem }) {
  const t = useMessages(bm);
  if (b.status === 'CANCELLED') return <span className="text-subtle">—</span>;
  if (Number(b.balance) <= 0)
    return (
      <Badge tone="success" size="sm">
        {t.settled}
      </Badge>
    );
  return <Money value={b.balance} currency={b.currencyCode} className="font-medium text-danger" />;
}

function BookingCards({ rows }: { rows: BookingListItem[] }) {
  const t = useMessages(bm);
  const f = useFormat();
  return (
    <ul className="grid gap-2 md:hidden">
      {rows.map((b) => (
        <li key={b.id}>
          <Link
            href={`/dashboard/bookings/${b.id}`}
            className="block rounded-tile border border-border bg-surface-raised p-4 shadow-card transition-colors hover:border-border-strong"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-medium">{b.customer.fullName}</div>
                <Ltr className="num text-xs text-muted">{b.reference}</Ltr>
              </div>
              <StatusBadge kind="booking" status={b.status} />
            </div>
            <div className="mt-2 truncate text-[13px] text-muted">
              <Ltr className="num">{b.trip.code}</Ltr> · {b.trip.tour.name} · {f.date(b.trip.departureDate, 'short')}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3 text-[13px]">
              <span className="text-muted">{fmt(t.paxN, { n: f.number(b.passengerCount) })}</span>
              <span className="flex items-center gap-2">
                <Money value={b.totalAmount} currency={b.currencyCode} className="font-medium" />
                <BalanceCell b={b} />
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
