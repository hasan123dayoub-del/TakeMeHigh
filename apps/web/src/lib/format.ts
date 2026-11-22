/**
 * Locale-aware formatters built on Intl. Money always uses the agency currency
 * (ISO 4217 code from `useAuth().agency.currency`), never a hard-coded symbol.
 */

const DEFAULT_LOCALE = 'ar-SY-u-nu-latn';

/** Display precision per currency (storage is always 2 decimals). */
const CURRENCY_DIGITS: Record<string, number> = { SYP: 0 };
const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat | Intl.RelativeTimeFormat>();

function memo<T extends Intl.NumberFormat | Intl.DateTimeFormat | Intl.RelativeTimeFormat>(
  key: string,
  make: () => T,
): T {
  let f = cache.get(key) as T | undefined;
  if (!f) {
    f = make();
    cache.set(key, f);
  }
  return f;
}

type Numeric = number | string | null | undefined;

function toNumber(value: Numeric): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** 1234.5, "USD" -> "US$1,234.50". Accepts decimal strings as returned by the API. */
export function formatMoney(
  value: Numeric,
  currency = 'USD',
  opts: { compact?: boolean; locale?: string; fallback?: string } = {},
) {
  const n = toNumber(value);
  if (n === null) return opts.fallback ?? '—';
  const locale = opts.locale ?? DEFAULT_LOCALE;
  const key = `money|${locale}|${currency}|${opts.compact ? 'c' : 's'}`;
  try {
    const f = memo(key, () =>
      opts.compact
        ? new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
            notation: 'compact',
            maximumFractionDigits: 2,
          })
        : new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
            minimumFractionDigits: CURRENCY_DIGITS[currency] ?? 2,
            maximumFractionDigits: CURRENCY_DIGITS[currency] ?? 2,
          }),
    );
    return f.format(n);
  } catch {
    // Unknown currency code: fall back to a plain number with the code.
    return `${formatNumber(n, { locale, maximumFractionDigits: 2 })} ${currency}`;
  }
}

export function formatNumber(
  value: Numeric,
  opts: { locale?: string; maximumFractionDigits?: number; compact?: boolean } = {},
) {
  const n = toNumber(value);
  if (n === null) return '—';
  const locale = opts.locale ?? DEFAULT_LOCALE;
  const key = `num|${locale}|${opts.maximumFractionDigits ?? 0}|${opts.compact ? 'c' : 's'}`;
  return memo(
    key,
    () =>
      new Intl.NumberFormat(locale, {
        maximumFractionDigits: opts.maximumFractionDigits ?? 0,
        notation: opts.compact ? 'compact' : 'standard',
      }),
  ).format(n);
}

/** 0.146 -> "14.6%". Pass `signed` for "+14.6%". */
export function formatPercent(
  ratio: Numeric,
  opts: { locale?: string; digits?: number; signed?: boolean } = {},
) {
  const n = toNumber(ratio);
  if (n === null) return '—';
  const locale = opts.locale ?? DEFAULT_LOCALE;
  const key = `pct|${locale}|${opts.digits ?? 1}|${opts.signed ? 's' : 'u'}`;
  return memo(
    key,
    () =>
      new Intl.NumberFormat(locale, {
        style: 'percent',
        maximumFractionDigits: opts.digits ?? 1,
        signDisplay: opts.signed ? 'exceptZero' : 'auto',
      }),
  ).format(n);
}

type DateInput = Date | string | number | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const DATE_STYLES = {
  /** 22 Nov 2026 */
  medium: { day: 'numeric', month: 'short', year: 'numeric' },
  /** 22 Nov */
  short: { day: 'numeric', month: 'short' },
  /** Sunday, 22 November 2026 */
  long: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  /** 22 Nov 2026, 09:30 */
  dateTime: { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
  /** 09:30 */
  time: { hour: '2-digit', minute: '2-digit' },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

export type DateStyle = keyof typeof DATE_STYLES;

export function formatDate(value: DateInput, style: DateStyle = 'medium', locale = DEFAULT_LOCALE) {
  const d = toDate(value);
  if (!d) return '—';
  return memo(
    `date|${locale}|${style}`,
    () => new Intl.DateTimeFormat(locale, DATE_STYLES[style]),
  ).format(d);
}

/** "in 3 days", "2 hours ago". */
export function formatRelative(value: DateInput, now: Date = new Date(), locale = DEFAULT_LOCALE) {
  const d = toDate(value);
  if (!d) return '—';
  const rtf = memo(`rel|${locale}`, () => new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }));
  const diff = (d.getTime() - now.getTime()) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];
  for (const [unit, secs] of units) {
    if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
  }
  return rtf.format(Math.round(diff), 'second');
}

/** Time-of-day greeting for the dashboard header. */
export function greeting(now: Date = new Date(), lang: 'ar' | 'en' = 'ar') {
  const h = now.getHours();
  if (lang === 'ar') return h < 12 ? 'صباح الخير' : 'مساء الخير';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
