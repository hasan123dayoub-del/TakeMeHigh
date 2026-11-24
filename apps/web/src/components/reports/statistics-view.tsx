'use client';

import { BadgeCheck, CalendarRange, Coins, FileSpreadsheet, FileText, Info, Loader2, Lock, Receipt, TicketCheck, TrendingUp, Users, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { FilterSelect } from '@/components/data/filter-select';
import { PrintHeader, PrintPortal } from '@/components/data/print';
import { QueryState } from '@/components/data/states';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatCard } from '@/components/ui/stat-card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, errorMessage } from '@/lib/api';
import { useAuth, useDefaultCurrency } from '@/lib/auth';
import { useLookups, useName, useResource, useUrlState } from '@/lib/hooks';
import { defineMessages, fmt, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import type { Stats } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';
import { ChartFrame, CHART, ChartLegend, ChartTooltip, currenciesOf, KpiMoney, seriesFor, useChartAxes, useCompact, usePeriodLabel, type ChartRow } from './chart-kit';

const m = defineMessages({
  ar: {
    eyebrow: 'التقارير',
    title: 'الإحصائيات',
    description: 'الإجمالي والحجوزات والأرباح شهرياً أو سنوياً، لكل عملة على حدة (لا تُجمع العملات المختلفة).',
    monthly: 'شهرية',
    yearly: 'سنوية',
    period: 'الفترة',
    year: 'السنة',
    branch: 'الفرع',
    category: 'التصنيف',
    currency: 'العملة',
    bookings: 'الحجوزات المؤكدة',
    passengers: 'الركاب',
    revenue: 'الإجمالي (الإيرادات)',
    collected: 'المحصّل',
    expected: 'الربح المتوقع',
    realized: 'الربح المحقق',
    collectedNote: '{p} من الإجمالي',
    marginNote: 'هامش {p}',
    realizedNote: '{p} من المتوقع',
    revVsCol: 'الإجمالي مقابل المحصّل',
    revVsColHint: 'لكل {unit} بعملة {c}',
    profitTitle: 'الربح المتوقع مقابل المحقق',
    profitHint: 'المحقق يُحتسب عند انتهاء الرحلة واكتمال الدفع',
    month: 'شهر',
    yearUnit: 'سنة',
    table: 'جدول الفترات',
    tableHint: '{range} · {c}',
    total: 'المجموع',
    excel: 'Excel',
    pdf: 'PDF',
    exported: 'تم تنزيل ملف Excel',
    defsTitle: 'كيف تُحسب الأرقام؟',
    defRevenue: 'الإجمالي: مجموع قيم الحجوزات التي تأكدت في الفترة.',
    defCollected: 'المحصّل: الدفعات المقبوضة في الفترة ناقص المبالغ المسترجعة، مهما كان تاريخ الحجز.',
    defExpected: 'الربح المتوقع: الإجمالي ناقص تكلفة الموردين للحجوزات المؤكدة في الفترة.',
    defRealized: 'الربح المحقق: ربح حجوزات الرحلات والبرامج والعروض التي انتهت في الفترة ودُفعت بالكامل (TBD-12).',
    lastFive: 'آخر خمس سنوات حتى {y}',
    monthsOf: 'أشهر سنة {y}',
    printTitle: 'الإحصائيات {kind} {y}',
    monthlyKind: 'الشهرية',
    yearlyKind: 'السنوية',
    noData: 'لا بيانات لهذه الفترة',
  },
  en: {
    eyebrow: 'Reports',
    title: 'Statistics',
    description: 'Revenue, bookings and profit by month or year, each currency on its own (currencies are never added together).',
    monthly: 'Monthly',
    yearly: 'Yearly',
    period: 'Period',
    year: 'Year',
    branch: 'Branch',
    category: 'Category',
    currency: 'Currency',
    bookings: 'Confirmed bookings',
    passengers: 'Passengers',
    revenue: 'Revenue',
    collected: 'Collected',
    expected: 'Expected profit',
    realized: 'Realized profit',
    collectedNote: '{p} of revenue',
    marginNote: '{p} margin',
    realizedNote: '{p} of expected',
    revVsCol: 'Revenue vs collected',
    revVsColHint: 'Per {unit}, in {c}',
    profitTitle: 'Expected vs realized profit',
    profitHint: 'Realized counts when the trip has finished and is fully paid',
    month: 'month',
    yearUnit: 'year',
    table: 'Periods',
    tableHint: '{range} · {c}',
    total: 'Total',
    excel: 'Excel',
    pdf: 'PDF',
    exported: 'Excel file downloaded',
    defsTitle: 'How are these numbers calculated?',
    defRevenue: 'Revenue: the value of bookings confirmed in the period.',
    defCollected: 'Collected: payments received in the period minus refunds, whatever the booking date.',
    defExpected: 'Expected profit: revenue minus the supplier cost of bookings confirmed in the period.',
    defRealized: 'Realized profit: profit of bookings whose trip, program or offer finished in the period and are fully paid (TBD-12).',
    lastFive: 'Five years up to {y}',
    monthsOf: 'Months of {y}',
    printTitle: '{kind} statistics {y}',
    monthlyKind: 'Monthly',
    yearlyKind: 'Yearly',
    noData: 'No data for this period',
  },
});

const THIS_YEAR = new Date().getFullYear();

export function StatisticsView() {
  const { can } = useAuth();
  const c = useMessages(common);
  if (!can('stats.view')) return <EmptyState icon={Lock} title={c.forbiddenTitle} description={c.forbiddenBody} />;
  return <Statistics />;
}

function Statistics() {
  const t = useMessages(m);
  const f = useFormat();
  const name = useName();
  const lookups = useLookups();
  const defaultCurrency = useDefaultCurrency();
  const periodLabel = usePeriodLabel();
  const [state, set] = useUrlState({ period: 'month', year: String(THIS_YEAR), branchId: undefined, categoryId: undefined, currency: undefined } as Record<string, string | undefined>);
  const period = state.period === 'year' ? 'year' : 'month';
  const year = Number(state.year) || THIS_YEAR;
  const params = { period, year, branchId: state.branchId, categoryId: state.categoryId };
  const q = useResource<Stats>('/stats', params);
  const [busy, setBusy] = useState<'xlsx' | null>(null);
  const [printing, setPrinting] = useState(false);

  const currencies = currenciesOf(Object.keys(q.data?.totals ?? {}), defaultCurrency);
  const currency = state.currency && currencies.includes(state.currency) ? state.currency : (currencies[0] ?? defaultCurrency);
  const rows = seriesFor(q.data?.series, currency);
  const totals = q.data?.totals[currency];
  const num = (v: string | undefined) => Number(v ?? 0);
  const revenue = num(totals?.revenue);
  const expected = num(totals?.expectedProfit);
  const realized = num(totals?.realizedProfit);
  const collected = num(totals?.collected);
  const ratio = (a: number, b: number) => (b ? f.percent(a / b, { digits: 0 }) : undefined);
  const unit = period === 'year' ? t.yearUnit : t.month;
  const range = period === 'year' ? fmt(t.lastFive, { y: year }) : fmt(t.monthsOf, { y: year });
  const exportTitle = fmt(t.printTitle, { kind: period === 'year' ? t.yearlyKind : t.monthlyKind, y: year });
  const money = (v: number) => f.money(v, currency);

  const exportXlsx = async () => {
    setBusy('xlsx');
    try {
      await api.download('/stats', { ...params, export: 'xlsx' }, `${exportTitle}.xlsx`);
      toast.success(t.exported);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setPrinting(true)} disabled={!q.data}>
              <FileText /> {t.pdf}
            </Button>
            <Button variant="secondary" size="sm" onClick={exportXlsx} disabled={!!busy || !q.data}>
              {busy ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />} {t.excel}
            </Button>
          </>
        }
      />

      <Card className="flex flex-wrap items-center gap-2 p-3 sm:p-4">
        <SegmentedControl
          aria-label={t.period}
          value={period}
          onValueChange={(v) => set({ period: v === 'month' ? undefined : v })}
          options={[
            { value: 'month', label: t.monthly },
            { value: 'year', label: t.yearly },
          ]}
        />
        <Select value={String(year)} onValueChange={(v) => set({ year: v })}>
          <SelectTrigger size="sm" className="h-10 w-auto min-w-[120px] rounded-full" aria-label={t.year}>
            <CalendarRange className="size-4 text-subtle" aria-hidden />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 8 }, (_, i) => THIS_YEAR + 1 - i).map((y) => (
              <SelectItem key={y} value={String(y)}>
                <span className="num">{y}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FilterSelect label={t.branch} value={state.branchId} onChange={(v) => set({ branchId: v })} options={(lookups.data?.branches ?? []).map((b) => ({ value: b.id, label: b.name }))} />
        <FilterSelect label={t.category} value={state.categoryId} onChange={(v) => set({ categoryId: v })} options={(lookups.data?.categories ?? []).map((x) => ({ value: x.id, label: name(x) }))} />
        {currencies.length > 0 && (
          <SegmentedControl
            className="ms-auto"
            aria-label={t.currency}
            value={currency}
            onValueChange={(v) => set({ currency: v })}
            options={currencies.map((x) => ({ value: x, label: <span className="num">{x}</span> }))}
          />
        )}
      </Card>

      <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => void q.refetch()}>
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label={t.title}>
          <StatCard featured label={t.revenue} value={<KpiMoney value={revenue} currency={currency} full={money(revenue)} />} icon={TrendingUp} sparkline={rows.map((r) => r.revenue)} note={range} />
          <StatCard label={t.collected} value={<KpiMoney value={collected} currency={currency} full={money(collected)} />} icon={Wallet} sparkline={rows.map((r) => r.collected)} note={ratio(collected, revenue) && fmt(t.collectedNote, { p: ratio(collected, revenue)! })} />
          <StatCard label={t.bookings} value={f.number(totals?.bookings ?? 0)} icon={TicketCheck} sparkline={rows.map((r) => r.bookings)} note={`${f.number(totals?.passengers ?? 0)} · ${t.passengers}`} />
          <StatCard label={t.expected} value={<KpiMoney value={expected} currency={currency} full={money(expected)} />} icon={Coins} sparkline={rows.map((r) => r.expectedProfit)} note={ratio(expected, revenue) && fmt(t.marginNote, { p: ratio(expected, revenue)! })} />
          <StatCard label={t.realized} value={<KpiMoney value={realized} currency={currency} full={money(realized)} />} icon={BadgeCheck} sparkline={rows.map((r) => r.realizedProfit)} note={ratio(realized, expected) && fmt(t.realizedNote, { p: ratio(realized, expected)! })} />
          <StatCard label={t.passengers} value={f.number(totals?.passengers ?? 0)} icon={Users} sparkline={rows.map((r) => r.passengers)} note={range} />
        </section>

        <section className="grid gap-3 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{t.revVsCol}</CardTitle>
                <CardDescription>{fmt(t.revVsColHint, { unit, c: currency })}</CardDescription>
              </div>
              <ChartLegend
                items={[
                  { label: t.revenue, color: CHART.c1 },
                  { label: t.collected, color: CHART.c4 },
                ]}
              />
            </CardHeader>
            <ChartFrame>
              <RevenueBars rows={rows} money={money} labels={{ revenue: t.revenue, collected: t.collected }} />
            </ChartFrame>
          </Card>
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{t.profitTitle}</CardTitle>
                <CardDescription>{t.profitHint}</CardDescription>
              </div>
              <ChartLegend
                items={[
                  { label: t.expected, color: CHART.c3 },
                  { label: t.realized, color: CHART.c6, dashed: true },
                ]}
              />
            </CardHeader>
            <ChartFrame>
              <ProfitLines rows={rows} money={money} labels={{ expected: t.expected, realized: t.realized }} />
            </ChartFrame>
          </Card>
        </section>

          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-full bg-accent-soft text-primary" aria-hidden>
                <Info className="size-4" />
              </span>
              <h2 className="heading-display text-[16px]">{t.defsTitle}</h2>
            </div>
            <dl className="mt-4 grid gap-4 text-sm leading-relaxed sm:grid-cols-2 xl:grid-cols-4">
              {[
                { icon: Receipt, text: t.defRevenue },
                { icon: Wallet, text: t.defCollected },
                { icon: Coins, text: t.defExpected },
                { icon: BadgeCheck, text: t.defRealized },
              ].map(({ icon: Icon, text }, i) => {
                const [head, ...rest] = text.split(':');
                return (
                  <div key={i} className="flex gap-3">
                    <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <div>
                      <dt className="inline font-medium">{head}:</dt> <dd className="inline text-muted">{rest.join(':').trim()}</dd>
                    </div>
                  </div>
                );
              })}
            </dl>
          </Card>
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{t.table}</CardTitle>
                <CardDescription>{fmt(t.tableHint, { range, c: currency })}</CardDescription>
              </div>
            </CardHeader>
            <div className="overflow-x-auto p-3 sm:p-4">
              <SeriesTable rows={rows} money={money} label={(p) => periodLabel(p, 'long')} />
            </div>
          </Card>
      </QueryState>

      {printing && q.data && (
        <PrintPortal onDone={() => setPrinting(false)}>
          <PrintHeader title={exportTitle} subtitle={`${range} · ${currency}`} />
          <SeriesTable rows={rows} money={money} label={(p) => periodLabel(p, 'long')} print />
        </PrintPortal>
      )}
    </div>
  );
}

function SeriesTable({ rows, money, label, print }: { rows: ChartRow[]; money: (v: number) => string; label: (p: string) => string; print?: boolean }) {
  const t = useMessages(m);
  const f = useFormat();
  const sum = (k: keyof Omit<ChartRow, 'period'>) => rows.reduce((a, r) => a + r[k], 0);
  const cols = [
    { k: 'bookings' as const, h: t.bookings, money: false },
    { k: 'passengers' as const, h: t.passengers, money: false },
    { k: 'revenue' as const, h: t.revenue, money: true },
    { k: 'collected' as const, h: t.collected, money: true },
    { k: 'expectedProfit' as const, h: t.expected, money: true },
    { k: 'realizedProfit' as const, h: t.realized, money: true },
  ];
  const val = (k: (typeof cols)[number], v: number) => (k.money ? money(v) : f.number(v));
  if (print)
    return (
      <table className="print-table">
        <thead>
          <tr>
            <th>{t.period}</th>
            {cols.map((c) => (
              <th key={c.k}>{c.h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.period}>
              <td>{label(r.period)}</td>
              {cols.map((c) => (
                <td key={c.k}>{val(c, r[c.k])}</td>
              ))}
            </tr>
          ))}
          <tr>
            <td>
              <strong>{t.total}</strong>
            </td>
            {cols.map((c) => (
              <td key={c.k}>
                <strong>{val(c, sum(c.k))}</strong>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    );
  return (
    <Table className="min-w-[900px]">
      <TableHeader>
        <TableRow>
          <TableHead>{t.period}</TableHead>
          {cols.map((c) => (
            <TableHead key={c.k} className="text-end">
              {c.h}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const empty = !r.bookings && !r.collected && !r.realizedProfit;
          return (
            <TableRow key={r.period} className={empty ? 'text-subtle' : undefined}>
              <TableCell className="font-medium whitespace-nowrap">{label(r.period)}</TableCell>
              {cols.map((c) => (
                <TableCell key={c.k} className="num text-end">
                  {val(c, r[c.k])}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell className="font-medium">{t.total}</TableCell>
          {cols.map((c) => (
            <TableCell key={c.k} className="num text-end font-medium">
              {val(c, sum(c.k))}
            </TableCell>
          ))}
        </TableRow>
      </TableFooter>
    </Table>
  );
}

function RevenueBars({ rows, money, labels }: { rows: ChartRow[]; money: (v: number) => string; labels: { revenue: string; collected: string } }) {
  const axes = useChartAxes();
  const period = usePeriodLabel();
  const compact = useCompact();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barGap={3} barCategoryGap="22%">
        <CartesianGrid {...axes.grid} />
        <XAxis dataKey="period" {...axes.x} tickFormatter={(v: string) => period(v)} />
        <YAxis {...axes.y} tickFormatter={(v: number) => compact(v)} />
        <Tooltip
          cursor={{ fill: 'var(--surface-sunken)', opacity: 0.6 }}
          content={(p) => <ChartTooltip active={p.active} payload={p.payload} label={p.label} formatLabel={(l) => period(l, 'long')} formatValue={money} />}
        />
        <Bar dataKey="revenue" name={labels.revenue} fill={CHART.c1} radius={[6, 6, 0, 0]} maxBarSize={22} />
        <Bar dataKey="collected" name={labels.collected} fill={CHART.c4} radius={[6, 6, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ProfitLines({ rows, money, labels }: { rows: ChartRow[]; money: (v: number) => string; labels: { expected: string; realized: string } }) {
  const axes = useChartAxes();
  const period = usePeriodLabel();
  const compact = useCompact();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid {...axes.grid} />
        <XAxis dataKey="period" {...axes.x} tickFormatter={(v: string) => period(v)} padding={{ left: 12, right: 12 }} />
        <YAxis {...axes.y} tickFormatter={(v: number) => compact(v)} />
        <Tooltip
          cursor={{ stroke: 'var(--border-strong)' }}
          content={(p) => <ChartTooltip active={p.active} payload={p.payload} label={p.label} formatLabel={(l) => period(l, 'long')} formatValue={money} />}
        />
        <Line type="monotone" dataKey="expectedProfit" name={labels.expected} stroke={CHART.c3} strokeWidth={2.25} dot={{ r: 3, fill: CHART.c3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="realizedProfit" name={labels.realized} stroke={CHART.c6} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3, fill: CHART.c6, strokeWidth: 0 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
