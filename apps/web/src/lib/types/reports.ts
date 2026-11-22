/** GET /reports/:type (apps/api/src/reports/reports.service.ts) */
export const REPORT_TYPES = [
  'bookings',
  'upcoming-trips',
  'passengers',
  'customer-statement',
  'payments',
  'refunds',
  'trip-profit',
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

/** Need `reports.financial` on top of `reports.view`. */
export const FINANCIAL_REPORTS: readonly ReportType[] = ['payments', 'refunds', 'trip-profit'];

export type ReportColumnKind = 'text' | 'money' | 'date' | 'int';

export interface ReportColumn {
  key: string;
  ar: string;
  en: string;
  kind?: ReportColumnKind;
  width?: number;
}

export type ReportRow = Record<string, string | number | null>;

export interface Report {
  type: ReportType;
  title: { ar: string; en: string };
  columns: ReportColumn[];
  rows: ReportRow[];
  /** One entry per currency: `{ currency, <moneyKey>: amount }` */
  totals?: Array<Record<string, string>>;
}

export interface ReportFilters {
  from?: string;
  to?: string;
  tripId?: string;
  customerId?: string;
  status?: string;
}

/** Minimal shapes used by the report pickers (GET /trips, GET /customers). */
export interface TripOption {
  id: string;
  code: string;
  departureDate: string;
  status: string;
  tour: { name: string };
}

export interface CustomerOption {
  id: string;
  fullName: string;
  phone: string | null;
}
