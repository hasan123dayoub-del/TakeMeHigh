'use client';

import { BOOKING_STATUSES, LABELS } from '@travelos/shared';
import { Plus, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { FilterSelect, ResourceTable, type ResourceColumn } from '@/components/data/resource-table';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth, useCan } from '@/lib/auth';
import { useLookups } from '@/lib/hooks';
import { defineMessages, useLocale, useMessages } from '@/lib/i18n';
import type { BookingListItem } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';
import { DateRange } from './date-range';
import { BalanceText, TargetLink } from './parts';

const m = defineMessages({
  ar: {
    eyebrow: 'الاستقبال',
    title: 'الحجوزات',
    description: 'كل حجز يبدأ «قيد الانتظار» ولا يأخذ مقاعد إلا عند التأكيد. إن امتلأت الرحلة ينتقل إلى قائمة الانتظار.',
    add: 'إضافة عميل إلى رحلة',
    bookingNo: 'رقم الحجز',
    date: 'التاريخ',
    payer: 'الدافع',
    target: 'الحجز على',
    passengers: 'الركاب',
    total: 'الإجمالي',
    paid: 'المدفوع',
    balance: 'المتبقي',
    currency: 'العملة',
    paymentState: 'الدفع',
    status: 'الحالة',
    branch: 'الفرع',
    employee: 'الموظف',
    search: 'رقم الحجز أو الدافع أو الهاتف أو راكب…',
    empty: 'لا توجد حجوزات',
    emptyBody: 'ابدأ بإضافة عميل إلى رحلة أو برنامج أو عرض.',
    filteredTrip: 'رحلة محددة',
    filteredProgram: 'برنامج محدد',
    filteredOffer: 'عرض محدد',
    clear: 'إزالة',
  },
  en: {
    eyebrow: 'Front desk',
    title: 'Bookings',
    description: 'Every booking starts pending and takes seats only when confirmed. When a trip is full it joins the waiting list.',
    add: 'Add customer to a trip',
    bookingNo: 'Booking no.',
    date: 'Date',
    payer: 'Payer',
    target: 'Booked on',
    passengers: 'Passengers',
    total: 'Total',
    paid: 'Paid',
    balance: 'Balance',
    currency: 'Currency',
    paymentState: 'Payment',
    status: 'Status',
    branch: 'Branch',
    employee: 'Employee',
    search: 'Booking no., payer, phone or passenger…',
    empty: 'No bookings',
    emptyBody: 'Start by adding a customer to a trip, program or offer.',
    filteredTrip: 'One trip',
    filteredProgram: 'One program',
    filteredOffer: 'One offer',
    clear: 'Remove',
  },
});

export function BookingsView() {
  const t = useMessages(m);
  const { locale } = useLocale();
  const f = useFormat();
  const router = useRouter();
  const search = useSearchParams();
  const { isAdmin } = useAuth();
  const canCreate = useCan('bookings.create');
  const lookups = useLookups();

  const target = (['tripId', 'programId', 'offerId'] as const).find((k) => search.get(k));
  const newHref = target ? `/dashboard/bookings/new?${target}=${search.get(target)}` : '/dashboard/bookings/new';

  const columns = useMemo<ResourceColumn<BookingListItem>[]>(
    () => [
      { id: 'bookingNo', header: t.bookingNo, sortKey: 'bookingNo', cell: (b) => <span className="num font-medium whitespace-nowrap">{b.bookingNo}</span> },
      { id: 'date', header: t.date, sortKey: 'createdAt', cell: (b) => <span className="num whitespace-nowrap">{f.date(b.createdAt, 'short')}</span> },
      {
        id: 'payer',
        header: t.payer,
        cell: (b) => (
          <div className="flex flex-col">
            <span className="font-medium">{b.payer.fullName}</span>
            <span className="ltr-nums text-xs text-muted" dir="ltr">
              {b.payer.phone}
            </span>
          </div>
        ),
        print: (b) => `${b.payer.fullName} — ${b.payer.phone}`,
      },
      { id: 'target', header: t.target, cell: (b) => <TargetLink b={b} className="line-clamp-2 max-w-[240px]" />, print: (b) => b.targetTitle },
      { id: 'passengers', header: t.passengers, align: 'end', cell: (b) => <span className="num">{b.passengerCount}</span> },
      { id: 'total', header: t.total, sortKey: 'totalAmount', align: 'end', cell: (b) => <span className="num whitespace-nowrap">{f.money(b.totalAmount, b.currencyCode)}</span> },
      { id: 'paid', header: t.paid, align: 'end', cell: (b) => <span className="num whitespace-nowrap">{f.money(b.netPaid, b.currencyCode)}</span> },
      {
        id: 'balance',
        header: t.balance,
        align: 'end',
        cell: (b) => (b.status === 'CANCELLED' ? <span className="text-subtle">—</span> : <BalanceText value={b.balance} currency={b.currencyCode} />),
        print: (b) => f.money(b.balance, b.currencyCode),
      },
      { id: 'currency', header: t.currency, cell: (b) => <span className="num text-xs text-muted">{b.currencyCode}</span> },
      {
        id: 'paymentState',
        header: t.paymentState,
        cell: (b) => <StatusBadge kind="paymentState" status={b.paymentState} />,
        print: (b) => LABELS.paymentState[b.paymentState][locale],
      },
      { id: 'status', header: t.status, cell: (b) => <StatusBadge kind="booking" status={b.status} />, print: (b) => LABELS.bookingStatus[b.status][locale] },
      { id: 'branch', header: t.branch, cell: (b) => <span className="text-muted">{b.branch.name}</span> },
      { id: 'employee', header: t.employee, cell: (b) => <span className="text-muted">{b.createdBy.fullName}</span> },
    ],
    [t, f, locale],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
        actions={
          canCreate && (
            <Button asChild>
              <Link href={newHref}>
                <Plus /> {t.add}
              </Link>
            </Button>
          )
        }
      />
      <ResourceTable<BookingListItem>
        endpoint="/bookings"
        columns={columns}
        exportTitle={t.title}
        searchPlaceholder={t.search}
        filterKeys={['status', 'paymentState', 'branchId', 'tripId', 'programId', 'offerId', 'from', 'to']}
        defaultSort={{ key: 'createdAt', order: 'desc' }}
        minWidth={1300}
        filters={(fl, set) => (
          <>
            <FilterSelect
              label={t.status}
              value={fl.status}
              onChange={(v) => set({ status: v })}
              options={BOOKING_STATUSES.map((s) => ({ value: s, label: LABELS.bookingStatus[s][locale] }))}
            />
            <FilterSelect
              label={t.paymentState}
              value={fl.paymentState}
              onChange={(v) => set({ paymentState: v })}
              options={(['UNPAID', 'PARTIAL', 'PAID'] as const).map((s) => ({ value: s, label: LABELS.paymentState[s][locale] }))}
            />
            {isAdmin && (
              <FilterSelect
                label={t.branch}
                value={fl.branchId}
                onChange={(v) => set({ branchId: v })}
                options={(lookups.data?.branches ?? []).map((b) => ({ value: b.id, label: b.name }))}
              />
            )}
            <DateRange from={fl.from} to={fl.to} onChange={(p) => set(p)} />
            {(['tripId', 'programId', 'offerId'] as const)
              .filter((k) => fl[k])
              .map((k) => (
                <Badge key={k} tone="primary" className="h-8 gap-2 ps-3 pe-1">
                  {k === 'tripId' ? t.filteredTrip : k === 'programId' ? t.filteredProgram : t.filteredOffer}
                  <button type="button" className="grid size-6 place-items-center rounded-full hover:bg-primary/15" aria-label={t.clear} onClick={() => set({ [k]: undefined })}>
                    <X className="size-3.5" />
                  </button>
                </Badge>
              ))}
          </>
        )}
        onRowClick={(b) => router.push(`/dashboard/bookings/${b.id}`)}
        getRowId={(b) => b.id}
        empty={{ title: t.empty, description: t.emptyBody }}
      />
    </div>
  );
}
