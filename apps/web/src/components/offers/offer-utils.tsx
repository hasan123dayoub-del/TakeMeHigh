'use client';

import type { ProfitMode } from '@travelos/shared';
import { Badge } from '@/components/ui/badge';
import { useMessages } from '@/lib/i18n';
import { useFormat } from '@/lib/use-format';
import { offerMessages } from './messages';

/** "15%" or the fixed amount (with the bundle currency when known). */
export function useDiscountLabel() {
  const f = useFormat();
  return (mode: ProfitMode, value: string, currency: string | null) =>
    mode === 'PERCENT' ? `${f.number(value, { maximumFractionDigits: 2 })}%` : currency ? f.money(value, currency) : f.number(value, { maximumFractionDigits: 2 });
}

export function LiveBadge({ live, isActive }: { live: boolean; isActive: boolean }) {
  const t = useMessages(offerMessages);
  if (live) return <Badge tone="success" dot>{t.live}</Badge>;
  return <Badge tone="neutral" dot>{isActive ? t.notLive : t.inactive}</Badge>;
}

/** Offer dates are calendar days stored at UTC midnight. */
export const dayOf = (iso: string) => iso.slice(0, 10);

/** BR-04 / OFR-02: distinct core services (hotel, transport, restaurant). */
export const distinctCoreServicesCount = (kinds: string[]) => new Set(kinds.filter((k) => k === 'HOTEL' || k === 'TRANSPORT' || k === 'RESTAURANT')).size;

/** The bundle currency, or the single currency shared by every discount target (else null). */
export function offerCurrency(o: { currencyCode: string | null; targets: { trip: { currencyCode: string } | null; program: { currencyCode: string } | null }[] }) {
  if (o.currencyCode) return o.currencyCode;
  const set = new Set(o.targets.map((x) => (x.trip ?? x.program)?.currencyCode).filter(Boolean));
  return set.size === 1 ? ([...set][0] as string) : null;
}
