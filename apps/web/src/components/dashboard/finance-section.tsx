'use client';

import { HelpCircle, Wallet } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Tooltip } from '@/components/ui/tooltip';
import { useAuth } from '@/lib/auth';
import { useLocale, useMessages } from '@/lib/i18n';
import type { DashboardFinance } from '@/lib/types/dashboard';
import { cn } from '@/lib/utils';
import { dashboardMessages } from './messages';
import { Money } from './money';

/** Localised currency name ("ليرة سورية", "US Dollar"). */
export function useCurrencyName() {
  const { intl } = useLocale();
  return useMemo(() => {
    let names: Intl.DisplayNames | null = null;
    try {
      names = new Intl.DisplayNames([intl], { type: 'currency' });
    } catch {
      names = null;
    }
    return (code: string) => names?.of(code) ?? code;
  }, [intl]);
}

function Help({ text }: { text: string }) {
  return (
    <Tooltip content={<span className="block max-w-64 leading-relaxed">{text}</span>}>
      <button
        type="button"
        aria-label={text}
        className="inline-grid size-5 place-items-center rounded-full text-subtle transition-colors hover:text-foreground"
      >
        <HelpCircle className="size-3.5" aria-hidden />
      </button>
    </Tooltip>
  );
}

function Metric({
  label,
  help,
  value,
  sub,
  tone = 'default',
  size = 'md',
}: {
  label: string;
  help: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'default' | 'positive' | 'negative';
  size?: 'md' | 'lg';
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-xs font-medium text-muted">
        {label}
        <Help text={help} />
      </div>
      <div
        className={cn(
          'num mt-1 truncate font-medium tracking-tight',
          size === 'lg' ? 'text-[28px] leading-tight' : 'text-xl leading-tight',
          tone === 'positive' && 'text-[color-mix(in_srgb,var(--success)_80%,var(--text))]',
          tone === 'negative' && 'text-[color-mix(in_srgb,var(--danger)_80%,var(--text))]',
        )}
       
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}

/** Per-currency finance (SYP and USD side by side, never summed). Only rendered for `reports.financial`. */
export function FinanceSection({ finance }: { finance: DashboardFinance }) {
  const t = useMessages(dashboardMessages);

  const currencyName = useCurrencyName();
  const { office } = useAuth();

  const currencies = useMemo(() => {
    const set = new Set<string>();
    for (const list of [
      finance.collectedTotal,
      finance.collectedThisMonth,
      finance.outstanding,
      finance.expectedProfit,
      finance.realisedProfit,
    ])
      for (const r of list) set.add(r.currencyCode);
    const def = office?.defaultCurrencyCode;
    return [...set].sort((a, b) => (a === def ? -1 : b === def ? 1 : a.localeCompare(b)));
  }, [finance, office?.defaultCurrencyCode]);

  const pick = <T extends { currencyCode: string }>(list: T[], code: string) => list.find((r) => r.currencyCode === code);
  const signTone = (v: string | undefined) => (v === undefined ? 'default' : Number(v) < 0 ? 'negative' : Number(v) > 0 ? 'positive' : 'default');

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="size-4 text-primary" aria-hidden />
            {t.financeTitle}
          </CardTitle>
          <CardDescription>{t.financeHint}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {currencies.length === 0 ? (
          <EmptyState size="sm" icon={Wallet} title={t.noFinance} />
        ) : (
          <div className={cn('grid gap-3', currencies.length > 1 && 'lg:grid-cols-2')}>
            {currencies.map((code) => {
              const collected = pick(finance.collectedTotal, code)?.amount ?? '0';
              const month = pick(finance.collectedThisMonth, code)?.amount ?? '0';
              const outstanding = pick(finance.outstanding, code)?.amount ?? '0';
              const expected = pick(finance.expectedProfit, code);
              const realised = pick(finance.realisedProfit, code);
              return (
                <section
                  key={code}
                  aria-label={currencyName(code)}
                  className="rounded-tile border border-border bg-surface-raised p-5 shadow-card"
                >
                  <header className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge tone="ink" shape="rounded" className="ltr-nums">
                        {code}
                      </Badge>
                      <span className="text-sm font-medium">{currencyName(code)}</span>
                    </div>
                  </header>

                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    <Metric
                      size="lg"
                      label={t.collectedTotal}
                      help={t.collectedTotalHelp}
                      value={<Money value={collected} currency={code} />}
                      sub={
                        <span className="inline-flex items-center gap-1">
                          {t.collectedMonth}:
                          <span className="num font-medium text-foreground">
                            <Money value={month} currency={code} />
                          </span>
                          <Help text={t.collectedMonthHelp} />
                        </span>
                      }
                    />
                    <Metric size="lg" label={t.outstanding} help={t.outstandingHelp} value={<Money value={outstanding} currency={code} />} />
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[14px] bg-surface p-4">
                      <Metric
                        label={t.expectedProfit}
                        help={t.expectedProfitHelp}
                        value={<Money value={expected?.profit ?? '0'} currency={code} />}
                        tone={signTone(expected?.profit)}
                      />
                      <dl className="mt-3 space-y-1 text-xs">
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted">{t.revenue}</dt>
                          <dd className="num"><Money value={expected?.revenue ?? '0'} currency={code} /></dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted">− {t.supplierCost}</dt>
                          <dd className="num"><Money value={expected?.supplierCost ?? '0'} currency={code} /></dd>
                        </div>
                      </dl>
                    </div>
                    <div className="rounded-[14px] bg-surface p-4">
                      <Metric
                        label={t.realisedProfit}
                        help={t.realisedProfitHelp}
                        value={<Money value={realised?.profit ?? '0'} currency={code} />}
                        tone={signTone(realised?.profit)}
                      />
                      <dl className="mt-3 space-y-1 text-xs">
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted">{t.collected}</dt>
                          <dd className="num"><Money value={realised?.collected ?? '0'} currency={code} /></dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted">− {t.paidToSuppliers}</dt>
                          <dd className="num"><Money value={realised?.paidToSuppliers ?? '0'} currency={code} /></dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <details className="group/gl mt-4 rounded-tile border border-dashed border-border-strong px-4 py-3 text-sm">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-muted marker:hidden hover:text-foreground">
            <HelpCircle className="size-4" aria-hidden />
            {t.glossary}
          </summary>
          <dl className="mt-3 grid gap-x-8 gap-y-3 md:grid-cols-2">
            {(
              [
                [t.collectedTotal, t.collectedTotalHelp],
                [t.collectedMonth, t.collectedMonthHelp],
                [t.outstanding, t.outstandingHelp],
                [t.expectedProfit, t.expectedProfitHelp],
                [t.realisedProfit, t.realisedProfitHelp],
              ] as const
            ).map(([term, def]) => (
              <div key={term}>
                <dt className="font-medium">{term}</dt>
                <dd className="mt-0.5 text-[13px] leading-relaxed text-muted">{def}</dd>
              </div>
            ))}
          </dl>
        </details>
      </CardContent>
    </Card>
  );
}
