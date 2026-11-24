'use client';

import {
  BarChart3,
  CalendarCheck,
  CalendarClock,
  Clock3,
  Gavel,
  Hourglass,
  MapPin,
  MessageSquarePlus,
  Plus,
  Receipt,
  TicketCheck,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { QueryState } from '@/components/data/states';
import { ChartFrame, KpiMoney, ChartLegend, ChartTooltip, CHART, currenciesOf, seriesFor, useChartAxes, useCompact, usePeriodLabel } from '@/components/reports/chart-kit';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { StatCard } from '@/components/ui/stat-card';
import { useAuth, useDefaultCurrency } from '@/lib/auth';
import { greeting } from '@/lib/format';
import { useResource } from '@/lib/hooks';
import { defineMessages, fmt, useLocale, useMessages } from '@/lib/i18n';
import type { DashboardData } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';
import { AlertsPanel, CountTile, DateChip, RecentBookings, Shortcut, UpcomingTrips } from './widgets';

const m = defineMessages({
  ar: {
    office: 'كل الفروع',
    adminLead: 'نظرة على أداء المكتب هذا الشهر: الإيرادات والتحصيل والأرباح لكل عملة على حدة.',
    staffLead: 'حجوزات فرعك وتحصيله هذا الشهر، والرحلات القريبة.',
    currency: 'العملة',
    revenue: 'الإجمالي هذا الشهر',
    bookings: 'الحجوزات المؤكدة',
    passengers: '{n} راكب',
    collected: 'المحصّل',
    collectedNote: '{p} من الإجمالي',
    expected: 'الربح المتوقع',
    realized: 'الربح المحقق',
    realizedNote: 'رحلات منتهية ومدفوعة بالكامل',
    vsLast: 'مقارنة بالشهر السابق',
    chartTitle: 'الإيرادات والأرباح خلال {year}',
    chartHint: 'شهرياً، بعملة {c} فقط — لا تُجمع العملات المختلفة',
    rev: 'الإجمالي',
    exp: 'الربح المتوقع',
    real: 'الربح المحقق',
    statsLink: 'الإحصائيات المفصّلة',
    attention: 'بانتظار الإجراء',
    awaiting: 'بانتظار القرار',
    awaitingHint: 'رحلات مغلقة تحتاج تأكيداً أو تمديداً أو إلغاءً',
    newRequests: 'طلبات جديدة',
    newRequestsHint: 'طلبات «صمّم رحلتك» لم يُتواصل معها',
    pending: 'حجوزات معلّقة',
    pendingHint: 'تنتظر الدفعة الأولى أو التأكيد',
    newBooking: 'حجز جديد',
    newCustomer: 'عميل جديد',
    newCustomerHint: 'تسجيل عميل ووثائق سفره',
    newBookingHint: 'حجز على رحلة أو برنامج أو عرض',
    payment: 'تسجيل دفعة',
    paymentHint: 'الحجوزات غير المدفوعة',
    shortcuts: 'اختصارات',
    bookingsMonth: 'حجوزات هذا الشهر',
    collectedMonth: 'المحصّل هذا الشهر · {c}',
    noCash: 'لا دفعات هذا الشهر',
    myTrips: 'رحلاتي',
    guideLead: 'الرحلات المسندة إليك. افتح الرحلة لعرض قائمة الركاب وتسجيل الحضور.',
    noTrips: 'لا رحلات مسندة إليك حالياً',
    noTripsBody: 'عندما يسندك المدير إلى رحلة ستظهر هنا مع قائمة ركابها.',
    pax: '{n} راكب',
    openManifest: 'قائمة الركاب',
    nothing: 'لا بيانات بعد',
  },
  en: {
    office: 'All branches',
    adminLead: 'How the office is doing this month: revenue, cash and profit, each currency on its own.',
    staffLead: 'Your branch’s bookings and cash this month, and the trips coming up.',
    currency: 'Currency',
    revenue: 'Revenue this month',
    bookings: 'Confirmed bookings',
    passengers: '{n} passengers',
    collected: 'Collected',
    collectedNote: '{p} of revenue',
    expected: 'Expected profit',
    realized: 'Realized profit',
    realizedNote: 'Finished, fully paid trips',
    vsLast: 'vs last month',
    chartTitle: 'Revenue and profit in {year}',
    chartHint: 'Monthly, in {c} only — currencies are never added together',
    rev: 'Revenue',
    exp: 'Expected profit',
    real: 'Realized profit',
    statsLink: 'Detailed statistics',
    attention: 'Waiting for action',
    awaiting: 'Awaiting decision',
    awaitingHint: 'Closed trips to confirm, extend or cancel',
    newRequests: 'New requests',
    newRequestsHint: '“Design your trip” requests not contacted yet',
    pending: 'Pending bookings',
    pendingHint: 'Waiting for a first payment or confirmation',
    newBooking: 'New booking',
    newCustomer: 'New customer',
    newCustomerHint: 'Register a customer and travel documents',
    newBookingHint: 'Book a trip, program or offer',
    payment: 'Record a payment',
    paymentHint: 'Unpaid bookings',
    shortcuts: 'Shortcuts',
    bookingsMonth: 'Bookings this month',
    collectedMonth: 'Collected this month · {c}',
    noCash: 'No payments this month',
    myTrips: 'My trips',
    guideLead: 'Trips assigned to you. Open a trip to see its passengers and record attendance.',
    noTrips: 'No trips assigned to you',
    noTripsBody: 'When a manager assigns you to a trip it shows up here with its passenger list.',
    pax: '{n} passengers',
    openManifest: 'Passenger list',
    nothing: 'No data yet',
  },
});

export function DashboardHome() {
  const { scope, can } = useAuth();
  const q = useResource<DashboardData>('/dashboard');
  return (
    <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => void q.refetch()}>
      {q.data &&
        (scope === 'ASSIGNED' || q.data.myTrips ? (
          <GuideHome data={q.data} />
        ) : can('stats.view') && q.data.yearSeries ? (
          <AdminHome data={q.data} />
        ) : (
          <StaffHome data={q.data} />
        ))}
    </QueryState>
  );
}

function Greeting({ lead, actions }: { lead: string; actions?: ReactNode }) {
  const { user, roleName } = useAuth();
  const { locale } = useLocale();
  const t = useMessages(m);
  const first = user?.fullName.split(' ')[0] ?? '';
  return (
    <PageHeader
      size="hero"
      actions={actions}
      title={
        <>
          {greeting(new Date(), locale)}، <strong>{first}</strong>
        </>
      }
      description={
        <>
          <span className="font-medium text-foreground">
            {roleName} · {user?.branch?.name ?? t.office}
          </span>
          <span className="block">{lead}</span>
        </>
      }
    />
  );
}

function pctChange(now: number, before: number | undefined) {
  if (before === undefined || before === 0) return undefined;
  return (now - before) / Math.abs(before);
}

// ------------------------------------------------------------------ Admin (DSH-01)

function AdminHome({ data }: { data: DashboardData }) {
  const t = useMessages(m);
  const f = useFormat();
  const defaultCurrency = useDefaultCurrency();
  const currencies = useMemo(
    () => currenciesOf([...(data.month ?? []).map((x) => x.currency), ...(data.yearSeries ?? []).map((x) => x.currency)], defaultCurrency),
    [data, defaultCurrency],
  );
  const [picked, setPicked] = useState<string | null>(null);
  const currency = picked && currencies.includes(picked) ? picked : (currencies[0] ?? defaultCurrency);

  const now = new Date();
  const thisPeriod = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const series = seriesFor(data.yearSeries, currency);
  const idx = series.findIndex((r) => r.period === thisPeriod);
  const prev = idx > 0 ? series[idx - 1] : undefined;
  const month = data.month?.find((x) => x.currency === currency);
  const profit = data.profit?.find((x) => x.currency === currency);
  const revenue = Number(month?.revenue ?? 0);
  const collected = Number(month?.collected ?? 0);
  const expected = Number(profit?.expectedProfit ?? 0);
  const realized = Number(profit?.realizedProfit ?? 0);
  const upToNow = idx >= 0 ? series.slice(0, idx + 1) : series;

  const delta = (n: number, before: number | undefined) => {
    const p = pctChange(n, before);
    if (p === undefined) return {};
    return { delta: f.percent(p, { signed: true, digits: 0 }), trend: p > 0 ? ('up' as const) : p < 0 ? ('down' as const) : ('flat' as const), note: t.vsLast };
  };

  return (
    <div className="flex flex-col gap-6">
      <Greeting
        lead={t.adminLead}
        actions={
          <>
          {currencies.length > 1 && (
            <SegmentedControl aria-label={t.currency} value={currency} onValueChange={setPicked} options={currencies.map((c) => ({ value: c, label: c }))} />
          )}
          <Button asChild variant="secondary">
            <Link href="/dashboard/statistics">
              <BarChart3 /> {t.statsLink}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/bookings/new">
              <Plus /> {t.newBooking}
            </Link>
          </Button>
          </>
        }
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label={t.revenue}>
        <StatCard featured label={t.revenue} value={<KpiMoney value={revenue} currency={currency} full={f.money(revenue, currency)} />} sparkline={upToNow.map((r) => r.revenue)} icon={TrendingUp} href="/dashboard/statistics" {...delta(revenue, prev?.revenue)} />
        <StatCard
          label={t.collected}
          value={<KpiMoney value={collected} currency={currency} full={f.money(collected, currency)} />}
          icon={Wallet}
          href="/dashboard/payments"
          note={revenue ? fmt(t.collectedNote, { p: f.percent(collected / revenue, { digits: 0 }) }) : undefined}
          sparkline={upToNow.map((r) => r.collected)}
        />
        <StatCard
          label={t.bookings}
          value={f.number(month?.bookings ?? 0)}
          icon={TicketCheck}
          href="/dashboard/bookings?status=CONFIRMED"
          {...delta(month?.bookings ?? 0, prev?.bookings)}
          note={fmt(t.passengers, { n: f.number(month?.passengers ?? 0) })}
          sparkline={upToNow.map((r) => r.bookings)}
        />
        <StatCard label={t.expected} value={<KpiMoney value={expected} currency={currency} full={f.money(expected, currency)} />} icon={TrendingUp} {...delta(expected, prev?.expectedProfit)} sparkline={upToNow.map((r) => r.expectedProfit)} />
        <StatCard label={t.realized} value={<KpiMoney value={realized} currency={currency} full={f.money(realized, currency)} />} icon={Receipt} note={t.realizedNote} sparkline={upToNow.map((r) => r.realizedProfit)} />
        <Card className="flex flex-col gap-2 p-4">
          <span className="px-1 pt-1 text-xs font-medium tracking-[0.16em] text-muted uppercase">{t.attention}</span>
          <CountTile icon={Gavel} label={t.awaiting} hint={t.awaitingHint} value={data.awaitingDecision} href="/dashboard/trips?status=CLOSED" tone="warning" />
          <CountTile icon={MessageSquarePlus} label={t.newRequests} hint={t.newRequestsHint} value={data.newRequests} href="/dashboard/requests?status=NEW" tone="info" />
        </Card>
      </section>

      <section className="grid gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>{fmt(t.chartTitle, { year: now.getUTCFullYear() })}</CardTitle>
              <CardDescription>{fmt(t.chartHint, { c: currency })}</CardDescription>
            </div>
            <ChartLegend
              items={[
                { label: t.rev, color: CHART.c1 },
                { label: t.exp, color: CHART.c3 },
                { label: t.real, color: CHART.c6, dashed: true },
              ]}
            />
          </CardHeader>
          <ChartFrame>
            <RevenueChart rows={series} currency={currency} labels={{ rev: t.rev, exp: t.exp, real: t.real }} />
          </ChartFrame>
        </Card>
        <AlertsPanel />
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        <UpcomingTrips trips={data.upcomingTrips} />
        <RecentBookings bookings={data.recentBookings} />
      </section>
    </div>
  );
}

function RevenueChart({ rows, currency, labels }: { rows: ReturnType<typeof seriesFor>; currency: string; labels: { rev: string; exp: string; real: string } }) {
  const axes = useChartAxes();
  const period = usePeriodLabel();
  const compact = useCompact();
  const f = useFormat();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={rows} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="home-rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.c1} stopOpacity={0.28} />
            <stop offset="100%" stopColor={CHART.c1} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...axes.grid} />
        <XAxis dataKey="period" {...axes.x} tickFormatter={(v: string) => period(v)} />
        <YAxis {...axes.y} tickFormatter={(v: number) => compact(v)} />
        <Tooltip
          cursor={{ stroke: 'var(--border-strong)' }}
          content={(p) => <ChartTooltip active={p.active} payload={p.payload} label={p.label} formatLabel={(l) => period(l, 'long')} formatValue={(v) => f.money(v, currency)} />}
        />
        <Area type="monotone" dataKey="revenue" name={labels.rev} stroke={CHART.c1} strokeWidth={2.25} fill="url(#home-rev)" activeDot={{ r: 4 }} />
        <Line type="monotone" dataKey="expectedProfit" name={labels.exp} stroke={CHART.c3} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        <Line type="monotone" dataKey="realizedProfit" name={labels.real} stroke={CHART.c6} strokeWidth={1.75} strokeDasharray="5 4" dot={false} activeDot={{ r: 4 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ------------------------------------------------------------------ Branch manager / employee (DSH-02, DSH-03)

function StaffHome({ data }: { data: DashboardData }) {
  const t = useMessages(m);
  const f = useFormat();
  const { can } = useAuth();
  const defaultCurrency = useDefaultCurrency();
  const month = [...(data.month ?? [])].sort((a, b) => (a.currency === defaultCurrency ? -1 : b.currency === defaultCurrency ? 1 : a.currency.localeCompare(b.currency)));
  const bookings = month.reduce((a, x) => a + x.bookings, 0);
  const passengers = month.reduce((a, x) => a + x.passengers, 0);
  const cash = month.length ? month : [{ currency: defaultCurrency, collected: '0', bookings: 0, passengers: 0, revenue: '0' }];

  return (
    <div className="flex flex-col gap-6">
      <Greeting lead={t.staffLead} />

      <section className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3" aria-label={t.bookingsMonth}>
        <StatCard featured label={t.bookingsMonth} value={f.number(bookings)} note={fmt(t.passengers, { n: f.number(passengers) })} icon={CalendarCheck} href="/dashboard/bookings?status=CONFIRMED" />
        {cash.map((c) => (
          <StatCard key={c.currency} label={fmt(t.collectedMonth, { c: c.currency })} value={<KpiMoney value={c.collected} currency={c.currency} full={f.money(c.collected, c.currency)} />} icon={Wallet} href={can('payments.view') ? '/dashboard/payments' : undefined} />
        ))}
        <StatCard label={t.pending} value={f.number(data.pendingBookings ?? 0)} note={t.pendingHint} icon={Hourglass} href="/dashboard/bookings?status=PENDING" />
        {can('requests.view') && <StatCard label={t.newRequests} value={f.number(data.newRequests ?? 0)} note={t.newRequestsHint} icon={MessageSquarePlus} href="/dashboard/requests?status=NEW" />}
      </section>

      <section aria-label={t.shortcuts} className="grid gap-3 sm:grid-cols-3">
        {can('customers.manage') ? <Shortcut icon={UserPlus} label={t.newCustomer} hint={t.newCustomerHint} href="/dashboard/customers" /> : null}
        {can('bookings.create') ? <Shortcut icon={Plus} label={t.newBooking} hint={t.newBookingHint} href="/dashboard/bookings/new" /> : null}
        {can('payments.create') ? <Shortcut icon={Wallet} label={t.payment} hint={t.paymentHint} href="/dashboard/bookings?paymentState=UNPAID" /> : null}
      </section>

      <section className="grid gap-3 xl:grid-cols-3">
        <RecentBookings bookings={data.recentBookings} className="xl:col-span-2 xl:row-span-2" />
        <UpcomingTrips trips={data.upcomingTrips} />
        <AlertsPanel />
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ Tour guide (DSH-04)

function GuideHome({ data }: { data: DashboardData }) {
  const t = useMessages(m);
  const f = useFormat();
  const trips = data.myTrips ?? [];
  return (
    <div className="flex flex-col gap-6">
      <Greeting lead={t.guideLead} />
      <h2 className="heading-display text-[15px]">{t.myTrips}</h2>
      {!trips.length ? (
        <Card>
          <EmptyState icon={CalendarClock} title={t.noTrips} description={t.noTripsBody} />
        </Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {trips.map((trip, i) => (
            <li key={trip.id}>
              <Link
                href={`/dashboard/trips/${trip.id}?tab=passengers`}
                className="group block h-full rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Card tone={i === 0 ? 'altitude' : 'surface'} className="flex h-full flex-col gap-5 p-5 transition-shadow group-hover:shadow-pop">
                  <div className="flex items-start justify-between gap-3">
                    <DateChip iso={trip.startsAt} className={i === 0 ? 'bg-white/18 text-current shadow-none [&_.text-muted]:text-current/80' : undefined} />
                    <StatusBadge kind="product" status={trip.status} className={i === 0 ? 'bg-white text-sky-900 ring-white' : undefined} />
                  </div>
                  <div className="min-w-0">
                    <div className={i === 0 ? 'num text-xs opacity-85' : 'num text-xs text-muted'} dir="ltr">
                      {trip.code}
                    </div>
                    <h3 className="mt-1 text-lg leading-snug font-medium text-balance">{trip.title}</h3>
                    <div className={i === 0 ? 'mt-2 flex items-center gap-1.5 text-sm opacity-90' : 'mt-2 flex items-center gap-1.5 text-sm text-muted'}>
                      <MapPin className="size-3.5 shrink-0" aria-hidden />
                      {trip.from} <span aria-hidden className="rtl-flip">→</span> {trip.to}
                    </div>
                  </div>
                  <div className={i === 0 ? 'mt-auto flex items-center justify-between gap-3 border-t border-white/25 pt-4 text-sm' : 'mt-auto flex items-center justify-between gap-3 border-t border-border pt-4 text-sm'}>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="size-3.5" aria-hidden />
                      <span className="num">
                        {f.date(trip.startsAt, 'short')} – {f.date(trip.endsAt, 'short')}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <Users className="size-3.5" aria-hidden />
                      <span className="num">{fmt(t.pax, { n: trip.passengers })}</span>
                    </span>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
