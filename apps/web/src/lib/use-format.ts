'use client';

import { useMemo } from 'react';
import { formatDate, formatMoney, formatNumber, formatPercent, formatRelative, type DateStyle } from './format';
import { useLocale } from './i18n';

type Numeric = number | string | null | undefined;
type DateInput = Date | string | number | null | undefined;

/** Formatters bound to the current UI language. `const f = useFormat(); f.money(b.totalAmount, b.currencyCode)` */
export function useFormat() {
  const { intl } = useLocale();
  return useMemo(
    () => ({
      money: (v: Numeric, currency: string, opts: { compact?: boolean } = {}) => formatMoney(v, currency, { ...opts, locale: intl }),
      number: (v: Numeric, opts: { maximumFractionDigits?: number; compact?: boolean } = {}) => formatNumber(v, { ...opts, locale: intl }),
      percent: (ratio: Numeric, opts: { digits?: number; signed?: boolean } = {}) => formatPercent(ratio, { ...opts, locale: intl }),
      date: (v: DateInput, style: DateStyle = 'medium') => formatDate(v, style, intl),
      relative: (v: DateInput) => formatRelative(v, new Date(), intl),
    }),
    [intl],
  );
}
