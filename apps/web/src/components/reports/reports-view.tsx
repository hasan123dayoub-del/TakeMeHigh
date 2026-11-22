'use client';

import { BarChart3, FileSpreadsheet, Printer } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Forbidden, ListSkeleton, QueryError } from '@/components/bookings/kit';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { fieldBase } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { defineMessages, useLocale, useMessages } from '@/lib/i18n';
import { useCustomerOptions, useReport, useTripOptions } from '@/lib/queries/reports';
import { FINANCIAL_REPORTS, REPORT_TYPES, type ReportColumn, type ReportFilters, type ReportType } from '@/lib/types/reports';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';

const m = defineMessages({
  ar: {
    eyebrow: 'التقارير',
    title: 'التقارير',
    description: 'تقارير من بيانات المكتب الحية. المبالغ لكل عملة على حدة، مع تصدير Excel وطباعة PDF.',
    report: 'التقرير',
    from: 'من تاريخ',
    to: 'إلى تاريخ',
    trip: 'الرحلة',
    customer: 'الزبون',
    pickTrip: 'اختر رحلة…',
    pickCustomer: 'اختر زبوناً…',
    needTrip: 'اختر رحلة لعرض قائمة ركابها.',
    needCustomer: 'اختر زبوناً لعرض كشف حسابه.',
    empty: 'لا توجد بيانات لهذه الفلاتر',
    emptyBody: 'غيّر الفترة أو الفلاتر.',
    excel: 'تصدير Excel',
    print: 'طباعة / حفظ PDF',
    exporting: 'جارٍ التصدير…',
    total: 'الإجمالي',
    rows: '{n} سطر',
    generated: 'تاريخ الإصدار',
    'type.bookings': 'الحجوزات',
    'type.upcoming-trips': 'الرحلات القادمة',
    'type.passengers': 'قائمة ركاب رحلة',
    'type.customer-statement': 'كشف حساب زبون',
    'type.payments': 'الدفعات',
    'type.refunds': 'المرتجعات',
    'type.trip-profit': 'تسعير الرحلات والأرباح',
  },
  en: {
    eyebrow: 'Reports',
    title: 'Reports',
    description: 'Reports from live office data. Money is shown per currency, with Excel export and PDF printing.',
    report: 'Report',
    from: 'From',
    to: 'To',
    trip: 'Trip',
    customer: 'Customer',
    pickTrip: 'Choose a trip…',
    pickCustomer: 'Choose a customer…',
    needTrip: 'Choose a trip to see its passenger list.',
    needCustomer: 'Choose a customer to see their statement.',
    empty: 'No data for these filters',
    emptyBody: 'Change the period or the filters.',
    excel: 'Export Excel',
    print: 'Print / Save PDF',
    exporting: 'Exporting…',
    total: 'Total',
    rows: '{n} rows',
    generated: 'Generated',
    'type.bookings': 'Bookings',
    'type.upcoming-trips': 'Upcoming trips',
    'type.passengers': 'Trip passenger list',
    'type.customer-statement': 'Customer statement',
    'type.payments': 'Payments',
    'type.refunds': 'Refunds',
    'type.trip-profit': 'Trip pricing & profit',
  },
});

const DATED: ReportType[] = ['bookings', 'payments', 'refunds', 'trip-profit'];

export function ReportsView() {
  const t = useMessages(m);
  const { locale } = useLocale();
  const f = useFormat();
  const { can, office } = useAuth();
  const params = useSearchParams();

  const available = REPORT_TYPES.filter((r) => !FINANCIAL_REPORTS.includes(r) || can('reports.financial'));
  const initial = (params.get('type') as ReportType) ?? 'bookings';
  const [type, setType] = useState<ReportType>(available.includes(initial) ? initial : 'bookings');
  const [filters, setFilters] = useState<ReportFilters>({ tripId: params.get('tripId') ?? undefined, customerId: params.get('customerId') ?? undefined });
  const [customerSearch, setCustomerSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  const needsTrip = type === 'passengers' && !filters.tripId;
  const needsCustomer = type === 'customer-statement' && !filters.customerId;
  const relevant: ReportFilters = useMemo(
    () => ({
      ...(DATED.includes(type) ? { from: filters.from, to: filters.to } : {}),
      ...(type === 'passengers' || type === 'trip-profit' || type === 'bookings' ? { tripId: filters.tripId } : {}),
      ...(type === 'customer-statement' ? { customerId: filters.customerId } : {}),
    }),
    [type, filters],
  );
  const q = useReport(type, relevant, can('reports.view') && !needsTrip && !needsCustomer);
  const trips = useTripOptions('', type === 'passengers' || type === 'trip-profit' || type === 'bookings');
  const customers = useCustomerOptions(customerSearch, type === 'customer-statement');

  if (!can('reports.view')) return <Forbidden />;

  const label = (k: ReportType) => t[`type.${k}` as keyof typeof t];
  const cell = (col: ReportColumn, row: Record<string, string | number | null>) => {
    const v = row[col.key];
    if (v === null || v === undefined || v === '') return '—';
    if (col.kind === 'money') return f.money(v, String(row.currency ?? row.currencyCode ?? 'SYP'));
    if (col.kind === 'date') return f.date(String(v));
    if (col.kind === 'int') return f.number(v);
    return String(v);
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      await api.download(`/reports/${type}`, { ...relevant, format: 'xlsx', lang: locale }, `safarni-${type}.xlsx`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="report-print grid gap-6">
      <style>{`@media print {
        body * { visibility: hidden !important; }
        .report-print, .report-print * { visibility: visible !important; }
        .report-print { position: absolute; inset: 0; }
        .report-noprint { display: none !important; }
        .report-table { font-size: 10px; }
        @page { size: A4 landscape; margin: 10mm; }
      }`}</style>

      <div className="report-noprint">
        <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />
      </div>

      <GlassPanel className="report-noprint grid gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
        <Labeled label={t.report}>
          <select className={fieldBase} value={type} onChange={(e) => setType(e.target.value as ReportType)}>
            {available.map((r) => (
              <option key={r} value={r}>{label(r)}</option>
            ))}
          </select>
        </Labeled>
        {DATED.includes(type) && (
          <>
            <Labeled label={t.from}>
              <input type="date" className={fieldBase} value={filters.from ?? ''} onChange={(e) => setFilters((s) => ({ ...s, from: e.target.value || undefined }))} />
            </Labeled>
            <Labeled label={t.to}>
              <input type="date" className={fieldBase} value={filters.to ?? ''} onChange={(e) => setFilters((s) => ({ ...s, to: e.target.value || undefined }))} />
            </Labeled>
          </>
        )}
        {(type === 'passengers' || type === 'trip-profit' || type === 'bookings') && (
          <Labeled label={t.trip}>
            <select className={fieldBase} value={filters.tripId ?? ''} onChange={(e) => setFilters((s) => ({ ...s, tripId: e.target.value || undefined }))}>
              <option value="">{type === 'passengers' ? t.pickTrip : '—'}</option>
              {trips.data?.data.map((tr) => (
                <option key={tr.id} value={tr.id}>{`${tr.code} · ${tr.tour.name} · ${f.date(tr.departureDate)}`}</option>
              ))}
            </select>
          </Labeled>
        )}
        {type === 'customer-statement' && (
          <>
            <Labeled label={t.customer}>
              <input type="search" className={fieldBase} placeholder={t.pickCustomer} value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />
            </Labeled>
            <Labeled label=" ">
              <select className={fieldBase} value={filters.customerId ?? ''} onChange={(e) => setFilters((s) => ({ ...s, customerId: e.target.value || undefined }))}>
                <option value="">{t.pickCustomer}</option>
                {customers.data?.data.map((c) => (
                  <option key={c.id} value={c.id}>{`${c.fullName} · ${c.phone ?? ''}`}</option>
                ))}
              </select>
            </Labeled>
          </>
        )}
      </GlassPanel>

      <GlassPanel className="grid gap-4 p-4 sm:p-6">
        {needsTrip || needsCustomer ? (
          <EmptyState icon={BarChart3} title={needsTrip ? t.needTrip : t.needCustomer} />
        ) : q.isPending ? (
          <ListSkeleton rows={8} />
        ) : q.isError ? (
          <QueryError error={q.error} onRetry={() => void q.refetch()} />
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs text-muted">{office?.name}</p>
                <h2 className="text-lg font-semibold">{q.data.title[locale]}</h2>
                <p className="text-xs text-muted">
                  {t.generated}: {f.date(new Date(), 'dateTime')} · {t.rows.replace('{n}', String(q.data.rows.length))}
                </p>
              </div>
              <div className="report-noprint flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => void exportExcel()} loading={exporting} disabled={!q.data.rows.length}>
                  <FileSpreadsheet /> {exporting ? t.exporting : t.excel}
                </Button>
                <Button variant="secondary" onClick={() => window.print()} disabled={!q.data.rows.length}>
                  <Printer /> {t.print}
                </Button>
              </div>
            </div>

            {q.data.rows.length === 0 ? (
              <EmptyState icon={BarChart3} title={t.empty} description={t.emptyBody} />
            ) : (
              <div className="overflow-x-auto">
                <table className="report-table w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted">
                      {q.data.columns.map((col) => (
                        <th key={col.key} className={cn('whitespace-nowrap px-3 py-2.5 font-medium', col.kind === 'money' || col.kind === 'int' ? 'text-end' : 'text-start')}>
                          {col[locale]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {q.data.rows.map((row, i) => (
                      <tr key={i} className="border-b border-border/60 last:border-0 hover:bg-surface/60">
                        {q.data.columns.map((col) => (
                          <td key={col.key} className={cn('whitespace-nowrap px-3 py-2.5', col.kind === 'money' || col.kind === 'int' ? 'num text-end' : 'text-start')}>
                            {cell(col, row)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  {q.data.totals && q.data.totals.length > 0 && (
                    <tfoot>
                      {q.data.totals.map((tot) => (
                        <tr key={tot.currency} className="border-t-2 border-border font-semibold">
                          {q.data.columns.map((col, idx) => (
                            <td key={col.key} className={cn('whitespace-nowrap px-3 py-2.5', col.kind === 'money' ? 'num text-end' : 'text-start')}>
                              {idx === 0
                                ? `${t.total} (${tot.currency})`
                                : col.kind === 'money' && tot[col.key] !== undefined
                                  ? f.money(tot[col.key], tot.currency)
                                  : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </>
        )}
      </GlassPanel>
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
