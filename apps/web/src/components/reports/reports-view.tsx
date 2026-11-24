'use client';

import type { BookingStatus, PaymentState } from '@travelos/shared';
import { ArrowUpRight, CalendarCheck, ClipboardList, Lock, Map, Stamp, Wallet, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { FilterSelect, ResourceTable, type ResourceColumn } from '@/components/data/resource-table';
import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { useLookups } from '@/lib/hooks';
import { defineMessages, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import type { Paginated } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';

/** GET /reports/outstanding row */
interface OutstandingRow {
  id: string;
  bookingNo: string;
  status: BookingStatus;
  currencyCode: string;
  totalAmount: string;
  netPaid: string;
  balance: string;
  paymentState: PaymentState;
  createdAt: string;
  payer: { fullName: string; phone: string };
  branch: { name: string };
  trip: { title: string; startsAt: string } | null;
  program: { title: string } | null;
  offer: { title: string } | null;
}

/** GET /reports/daily-payments row */
interface DailyRow {
  day: string;
  currency: string;
  payments: number;
  received: string;
  refunded: string;
  net: string;
}

const m = defineMessages({
  ar: {
    eyebrow: 'التقارير',
    title: 'التقارير التشغيلية',
    description: 'الأرصدة المستحقة على الحجوزات والنقد اليومي لكل عملة، مع تصدير Excel وPDF لكل صف مطابق للتصفية.',
    outstanding: 'الأرصدة المستحقة',
    daily: 'الدفعات اليومية',
    shortcuts: 'قوائم تشغيلية أخرى',
    bookingNo: 'رقم الحجز',
    payer: 'الدافع',
    phone: 'الهاتف',
    target: 'الحجز على',
    total: 'الإجمالي',
    paid: 'المدفوع',
    balance: 'المتبقي',
    currency: 'العملة',
    status: 'الحالة',
    branch: 'الفرع',
    from: 'من',
    to: 'إلى',
    day: 'اليوم',
    count: 'عدد الدفعات',
    received: 'المقبوض',
    refunded: 'المسترجع',
    net: 'الصافي',
    noOutstanding: 'لا أرصدة مستحقة',
    noOutstandingBody: 'كل الحجوزات ضمن هذه التصفية مدفوعة بالكامل.',
    noDaily: 'لا دفعات في هذه الفترة',
    noDailyBody: 'افتراضياً تُعرض آخر 30 يوماً. غيّر التاريخ لعرض فترة أخرى.',
    netTotal: 'صافي الفترة',
    dailyHint: 'آخر 30 يوماً ما لم تحدد الفترة',
    tripsTitle: 'قائمة الرحلات',
    tripsBody: 'الرحلات المفتوحة والمغلقة والمؤكدة مع المقاعد',
    bookingsTitle: 'الحجوزات غير المدفوعة',
    bookingsBody: 'حجوزات لم تُسجل عليها أي دفعة',
    visasTitle: 'تأشيرات مستحقة قريباً',
    visasBody: 'تأشيرات غير مكتملة لرحلات تبدأ قريباً',
    manifestTitle: 'قوائم الركاب',
    manifestBody: 'افتح رحلة مؤكدة ثم تبويب الركاب للطباعة',
    paymentsTitle: 'سجل الدفعات',
    paymentsBody: 'كل الوصولات والاسترجاعات',
  },
  en: {
    eyebrow: 'Reports',
    title: 'Operational reports',
    description: 'Balances still due on bookings and daily cash per currency, with Excel and PDF export of every matching row.',
    outstanding: 'Outstanding balances',
    daily: 'Daily payments',
    shortcuts: 'Other operational lists',
    bookingNo: 'Booking no.',
    payer: 'Payer',
    phone: 'Phone',
    target: 'Booked',
    total: 'Total',
    paid: 'Paid',
    balance: 'Balance',
    currency: 'Currency',
    status: 'Status',
    branch: 'Branch',
    from: 'From',
    to: 'To',
    day: 'Day',
    count: 'Payments',
    received: 'Received',
    refunded: 'Refunded',
    net: 'Net',
    noOutstanding: 'No outstanding balances',
    noOutstandingBody: 'Every booking in this filter is fully paid.',
    noDaily: 'No payments in this period',
    noDailyBody: 'The last 30 days are shown by default. Change the dates to see another period.',
    netTotal: 'Net for the period',
    dailyHint: 'Last 30 days unless you pick dates',
    tripsTitle: 'Trips',
    tripsBody: 'Open, closed and confirmed trips with seats',
    bookingsTitle: 'Unpaid bookings',
    bookingsBody: 'Bookings without any payment yet',
    visasTitle: 'Visas due soon',
    visasBody: 'Incomplete visas for trips starting soon',
    manifestTitle: 'Passenger manifests',
    manifestBody: 'Open a confirmed trip, then its Passengers tab to print',
    paymentsTitle: 'Payments log',
    paymentsBody: 'All receipts and refunds',
  },
});

export function ReportsView() {
  const { can } = useAuth();
  const c = useMessages(common);
  if (!can('reports.operational')) return <EmptyState icon={Lock} title={c.forbiddenTitle} description={c.forbiddenBody} />;
  return <Reports />;
}

function DateFilters({ f, set }: { f: Record<string, string | undefined>; set: (p: Record<string, string | undefined>) => void }) {
  const t = useMessages(m);
  return (
    <>
      <label className="inline-flex items-center gap-2 text-[14px] text-subtle">
        {t.from}
        <Input type="date" dir="ltr" className="h-10 w-[150px] rounded-full px-3.5" value={f.from ?? ''} max={f.to} onChange={(e) => set({ from: e.target.value || undefined })} aria-label={t.from} />
      </label>
      <label className="inline-flex items-center gap-2 text-[14px] text-subtle">
        {t.to}
        <Input type="date" dir="ltr" className="h-10 w-[150px] rounded-full px-3.5" value={f.to ?? ''} min={f.from} onChange={(e) => set({ to: e.target.value || undefined })} aria-label={t.to} />
      </label>
    </>
  );
}

function Reports() {
  const t = useMessages(m);
  const f = useFormat();
  const { isAdmin, can } = useAuth();
  const lookups = useLookups();
  // tab lives in local state: ResourceTable forwards every URL param to the API, which rejects unknown ones
  const [picked, setPicked] = useState<'outstanding' | 'daily'>('outstanding');
  const canOutstanding = can('bookings.view');
  const canDaily = can('payments.view');
  const tab = picked === 'daily' || !canOutstanding ? 'daily' : 'outstanding';

  const branchFilter = (fl: Record<string, string | undefined>, setF: (p: Record<string, string | undefined>) => void) =>
    isAdmin ? <FilterSelect label={t.branch} value={fl.branchId} onChange={(v) => setF({ branchId: v })} options={(lookups.data?.branches ?? []).map((b) => ({ value: b.id, label: b.name }))} /> : null;

  const outstandingCols = useMemo<ResourceColumn<OutstandingRow>[]>(
    () => [
      {
        id: 'bookingNo',
        header: t.bookingNo,
        cell: (b) => (
          <Link href={`/dashboard/bookings/${b.id}`} className="num font-medium whitespace-nowrap text-primary hover:underline" dir="ltr" onClick={(e) => e.stopPropagation()}>
            {b.bookingNo}
          </Link>
        ),
        print: (b) => b.bookingNo,
      },
      { id: 'payer', header: t.payer, cell: (b) => <span className="font-medium whitespace-nowrap">{b.payer.fullName}</span> },
      { id: 'phone', header: t.phone, cell: (b) => <span className="ltr-nums" dir="ltr">{b.payer.phone}</span> },
      { id: 'target', header: t.target, cell: (b) => <span className="line-clamp-1 max-w-56">{b.trip?.title ?? b.program?.title ?? b.offer?.title ?? '—'}</span> },
      { id: 'total', header: t.total, align: 'end', cell: (b) => <span className="num">{f.money(b.totalAmount, b.currencyCode)}</span> },
      { id: 'paid', header: t.paid, align: 'end', cell: (b) => <span className="num">{f.money(b.netPaid, b.currencyCode)}</span> },
      { id: 'balance', header: t.balance, align: 'end', cell: (b) => <span className="num font-medium text-danger">{f.money(b.balance, b.currencyCode)}</span> },
      { id: 'currency', header: t.currency, cell: (b) => <span className="num">{b.currencyCode}</span> },
      {
        id: 'status',
        header: t.status,
        cell: (b) => (
          <span className="flex flex-wrap gap-1">
            <StatusBadge kind="booking" status={b.status} size="sm" />
            <StatusBadge kind="paymentState" status={b.paymentState} size="sm" />
          </span>
        ),
      },
      { id: 'branch', header: t.branch, cell: (b) => <span className="whitespace-nowrap">{b.branch.name}</span>, print: (b) => b.branch.name },
    ],
    [t, f],
  );

  const dailyCols = useMemo<ResourceColumn<DailyRow>[]>(
    () => [
      { id: 'day', header: t.day, cell: (r) => <span className="num font-medium">{f.date(r.day, 'medium')}</span> },
      { id: 'currency', header: t.currency, cell: (r) => <span className="num">{r.currency}</span> },
      { id: 'payments', header: t.count, align: 'end', cell: (r) => <span className="num">{f.number(r.payments)}</span> },
      { id: 'received', header: t.received, align: 'end', cell: (r) => <span className="num">{f.money(r.received, r.currency)}</span> },
      { id: 'refunded', header: t.refunded, align: 'end', cell: (r) => <span className={Number(r.refunded) ? 'num text-danger' : 'num text-subtle'}>{f.money(r.refunded, r.currency)}</span> },
      { id: 'net', header: t.net, align: 'end', cell: (r) => <span className="num font-medium">{f.money(r.net, r.currency)}</span> },
    ],
    [t, f],
  );

  const dailySummary = (page: Paginated<DailyRow> | undefined) => {
    if (!page?.data.length) return null;
    const by = new globalThis.Map<string, number>();
    for (const r of page.data) by.set(r.currency, (by.get(r.currency) ?? 0) + Number(r.net));
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">{t.netTotal}:</span>
        {[...by].map(([cur, v]) => (
          <span key={cur} className="num rounded-full bg-surface-raised px-3 py-1 font-medium shadow-card">
            {f.money(v, cur)}
          </span>
        ))}
      </div>
    );
  };

  const shortcuts: { icon: LucideIcon; title: string; body: string; href: string; show: boolean }[] = [
    { icon: Map, title: t.tripsTitle, body: t.tripsBody, href: '/dashboard/trips', show: can('trips.view') },
    { icon: CalendarCheck, title: t.bookingsTitle, body: t.bookingsBody, href: '/dashboard/bookings?paymentState=UNPAID', show: can('bookings.view') },
    { icon: Stamp, title: t.visasTitle, body: t.visasBody, href: '/dashboard/visas?dueSoon=true', show: can('visas.manage') },
    { icon: ClipboardList, title: t.manifestTitle, body: t.manifestBody, href: '/dashboard/trips?status=CONFIRMED', show: can('trips.view') },
    { icon: Wallet, title: t.paymentsTitle, body: t.paymentsBody, href: '/dashboard/payments', show: can('payments.view') },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />

      <Tabs value={tab} onValueChange={(v) => setPicked(v === 'daily' ? 'daily' : 'outstanding')}>
        <TabsList>
          {canOutstanding && <TabsTrigger value="outstanding">{t.outstanding}</TabsTrigger>}
          {canDaily && <TabsTrigger value="daily">{t.daily}</TabsTrigger>}
        </TabsList>
        {canOutstanding && (
          <TabsContent value="outstanding">
            <ResourceTable<OutstandingRow>
              endpoint="/reports/outstanding"
              columns={outstandingCols}
              exportTitle={t.outstanding}
              noSearch
              filterKeys={['from', 'to', 'branchId']}
              filters={(fl, setF) => (
                <>
                  <DateFilters f={fl} set={setF} />
                  {branchFilter(fl, setF)}
                </>
              )}
              getRowId={(b) => b.id}
              minWidth={1280}
              empty={{ title: t.noOutstanding, description: t.noOutstandingBody }}
            />
          </TabsContent>
        )}
        {canDaily && (
          <TabsContent value="daily">
            <ResourceTable<DailyRow>
              endpoint="/reports/daily-payments"
              columns={dailyCols}
              exportTitle={t.daily}
              noSearch
              filterKeys={['from', 'to', 'branchId']}
              filters={(fl, setF) => (
                <>
                  <DateFilters f={fl} set={setF} />
                  {branchFilter(fl, setF)}
                </>
              )}
              summary={dailySummary}
              getRowId={(r) => `${r.day}-${r.currency}`}
              pageSizes={[100]}
              empty={{ title: t.noDaily, description: t.noDailyBody }}
            />
            <p className="mt-2 px-1 text-xs text-muted">{t.dailyHint}</p>
          </TabsContent>
        )}
      </Tabs>

      <section aria-label={t.shortcuts} className="flex flex-col gap-3">
        <h2 className="heading-display text-[16px]">{t.shortcuts}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {shortcuts
            .filter((s) => s.show)
            .map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  className="group flex h-full flex-col gap-4 rounded-card bg-surface p-5 transition-colors hover:bg-surface-raised hover:shadow-card focus-visible:outline-2 focus-visible:outline-ring dark:border dark:border-border/80"
                >
                  <span className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-full bg-accent-soft text-primary" aria-hidden>
                      <s.icon className="size-[18px]" />
                    </span>
                    <ArrowUpRight className="size-4 text-subtle transition-transform group-hover:rotate-45 rtl:-scale-x-100" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{s.title}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted">{s.body}</span>
                  </span>
                </Link>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
