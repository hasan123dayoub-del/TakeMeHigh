'use client';

import { LABELS, type DocumentType } from '@travelos/shared';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useLookups } from '@/lib/hooks';
import { defineMessages, useLocale, useMessages } from '@/lib/i18n';
import { useFormat } from '@/lib/use-format';

/*
 * Small building blocks shared by the front-desk screens (customers, bookings, visas):
 * document chips, expiry badges, debounced values and the Syria country id.
 */

const m = defineMessages({
  ar: { expired: 'منتهية', soon: 'تنتهي قريباً', noExpiry: 'بلا تاريخ انتهاء', noDocs: 'لا وثائق' },
  en: { expired: 'Expired', soon: 'Expires soon', noExpiry: 'No expiry date', noDocs: 'No documents' },
});

export type ExpiryState = 'none' | 'expired' | 'soon' | 'ok';

/** CUS-05: red when expired, amber when it ends within 6 months. */
export function expiryState(expiresOn: string | null | undefined, months = 6): ExpiryState {
  if (!expiresOn) return 'none';
  const exp = new Date(expiresOn).getTime();
  const now = Date.now();
  if (exp < now) return 'expired';
  const limit = new Date();
  limit.setMonth(limit.getMonth() + months);
  return exp < limit.getTime() ? 'soon' : 'ok';
}

/** Expiry date with a red/amber badge. */
export function ExpiryBadge({ expiresOn }: { expiresOn: string | null | undefined }) {
  const t = useMessages(m);
  const f = useFormat();
  const state = expiryState(expiresOn);
  if (state === 'none') return <span className="text-xs text-subtle">{t.noExpiry}</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="num">{f.date(expiresOn, 'medium')}</span>
      {state === 'expired' && (
        <Badge tone="danger" size="sm" dot>
          {t.expired}
        </Badge>
      )}
      {state === 'soon' && (
        <Badge tone="warning" size="sm" dot>
          {t.soon}
        </Badge>
      )}
    </span>
  );
}

/** "Passport N123456" chip coloured by expiry. */
export function DocChip({ doc }: { doc: { docType: DocumentType; docNumber: string; expiresOn?: string | null } }) {
  const { locale } = useLocale();
  const state = expiryState(doc.expiresOn);
  return (
    <Badge tone={state === 'expired' ? 'danger' : state === 'soon' ? 'warning' : 'neutral'} size="sm" shape="rounded">
      {LABELS.documentType[doc.docType][locale]} <span className="num ltr-nums" dir="ltr">{doc.docNumber}</span>
    </Badge>
  );
}

export function DocChips({ docs, max = 3 }: { docs: { id: string; docType: DocumentType; docNumber: string; expiresOn?: string | null }[]; max?: number }) {
  const t = useMessages(m);
  if (!docs.length) return <span className="text-xs text-subtle">{t.noDocs}</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {docs.slice(0, max).map((d) => (
        <DocChip key={d.id} doc={d} />
      ))}
      {docs.length > max && (
        <Badge size="sm" shape="rounded">
          +{docs.length - max}
        </Badge>
      )}
    </span>
  );
}

/** Value that settles `delay` ms after the last change (live duplicate checks, searches). */
export function useDebounced<T>(value: T, delay = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

/** The id of Syria in the active countries (default nationality; issuer of every Syrian ID). */
export function useSyriaId() {
  const lookups = useLookups();
  return useMemo(() => lookups.data?.countries.find((c) => c.isoCode === 'SY')?.id ?? '', [lookups.data]);
}

/** "2026-11-23T…" → "2026-11-23" for <input type="date">. */
export const dateInput = (v: string | null | undefined) => (v ? v.slice(0, 10) : '');

/** WhatsApp link for a local Syrian number (09…) or an international one. */
export function waLink(phone: string) {
  let d = phone.replace(/[^\d]/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = `963${d.slice(1)}`;
  return `https://wa.me/${d}`;
}

/** Arabic/English label from LABELS for the current language. */
export function useLabel() {
  const { locale } = useLocale();
  return <K extends keyof typeof LABELS>(group: K, key: string | null | undefined) => {
    if (!key) return '—';
    const g = LABELS[group] as Record<string, { ar: string; en: string }>;
    return g[key]?.[locale] ?? key;
  };
}
