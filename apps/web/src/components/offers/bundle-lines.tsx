'use client';

/*
 * OFR-01/02: the service lines of a bundle offer. Each line: service → (transport: mode) → item
 * from the catalogue (same currency for all lines), quantity, and an optional profit override
 * (Admin only, pricing.set_profit).
 */
import { TRANSPORT_MODES, type ProfitMode, type ServiceKind, type TransportMode } from '@travelos/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLookups, useName, useResource } from '@/lib/hooks';
import { fmt, LABELS, useLocale, useMessages } from '@/lib/i18n';
import type { CompanyItem, ProfitRule } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';
import { fromCents, ModeIcon, SERVICE_ICON, toCents } from '../programs/product-bits';
import { offerMessages } from './messages';

const DEFAULT = '__default__';

export interface LineDraft {
  key: string;
  serviceId: string;
  transportMode: TransportMode | '';
  companyItemId: string;
  quantity: string;
  profitMode: ProfitMode | '';
  profitValue: string;
  /** Snapshot of the chosen item (for the preview) */
  item?: { name: string; companyId: string; costPerPerson?: string | null; currencyCode: string; kind: ServiceKind };
  /** Selling price returned by the API for a saved, unchanged line */
  savedSelling?: string;
  savedCost?: string;
}

export const newLine = (): LineDraft => ({
  key: Math.random().toString(36).slice(2),
  serviceId: '',
  transportMode: '',
  companyItemId: '',
  quantity: '1',
  profitMode: '',
  profitValue: '',
});

/** Units actually charged: transport is always 1 (API rule). */
export const effectiveQty = (l: LineDraft) => (l.item?.kind === 'TRANSPORT' ? 1 : Math.max(1, Number(l.quantity) || 1));

/** Per-line cost and selling price in cents for the preview, or null when unknown to this role. */
export function linePreview(l: LineDraft, rules: ProfitRule[] | undefined) {
  if (l.savedSelling !== undefined) return { cost: l.savedCost !== undefined ? toCents(l.savedCost) : null, selling: toCents(l.savedSelling) };
  if (!l.item || l.item.costPerPerson == null) return null;
  const cost = toCents(l.item.costPerPerson) * effectiveQty(l);
  let mode: ProfitMode | null = null;
  let value = '0';
  if (l.profitMode && l.profitValue !== '') {
    mode = l.profitMode;
    value = l.profitValue;
  } else if (rules) {
    const r = rules.find((x) => x.serviceId === l.serviceId && x.companyId === l.item?.companyId) ?? rules.find((x) => x.serviceId === l.serviceId && !x.companyId);
    mode = r?.mode ?? 'PERCENT';
    value = r?.value ?? '0';
  }
  if (!mode) return { cost, selling: null };
  const profit = mode === 'PERCENT' ? Math.round((cost * Number(value || 0)) / 100) : toCents(value);
  return { cost, selling: cost + profit };
}

export function BundleLines({
  lines,
  onChange,
  currency,
  canSetProfit,
  canBreakdown,
  rules,
  locked,
}: {
  lines: LineDraft[];
  onChange: (lines: LineDraft[]) => void;
  currency: string | null;
  canSetProfit: boolean;
  canBreakdown: boolean;
  rules: ProfitRule[] | undefined;
  locked?: boolean;
}) {
  const t = useMessages(offerMessages);
  const update = (key: string, patch: Partial<LineDraft>) => onChange(lines.map((l) => (l.key === key ? { ...l, ...patch, savedSelling: undefined, savedCost: undefined } : l)));

  return (
    <div className="flex flex-col gap-3">
      {lines.map((l, i) => (
        <LineRow
          key={l.key}
          index={i}
          line={l}
          currency={lines.filter((x) => x.key !== l.key && x.item).length ? currency : null}
          canSetProfit={canSetProfit}
          canBreakdown={canBreakdown}
          rules={rules}
          locked={locked}
          onChange={(patch) => update(l.key, patch)}
          onRemove={() => onChange(lines.filter((x) => x.key !== l.key))}
        />
      ))}
      {!locked && (
        <Button type="button" variant="outline" className="self-start" onClick={() => onChange([...lines, newLine()])}>
          <Plus /> {t.addLine}
        </Button>
      )}
    </div>
  );
}

function LineRow({
  index,
  line: l,
  currency,
  canSetProfit,
  canBreakdown,
  rules,
  locked,
  onChange,
  onRemove,
}: {
  index: number;
  line: LineDraft;
  currency: string | null;
  canSetProfit: boolean;
  canBreakdown: boolean;
  rules: ProfitRule[] | undefined;
  locked?: boolean;
  onChange: (patch: Partial<LineDraft>) => void;
  onRemove: () => void;
}) {
  const t = useMessages(offerMessages);
  const { locale } = useLocale();
  const lookups = useLookups();
  const name = useName();
  const f = useFormat();

  const services = lookups.data?.services ?? [];
  const service = services.find((s) => s.id === l.serviceId);
  const kind = service?.kind ?? l.item?.kind;
  const needsMode = kind === 'TRANSPORT';
  const ready = !!l.serviceId && (!needsMode || !!l.transportMode);
  const catalog = useResource<CompanyItem[]>(ready ? '/catalog' : null, { serviceId: l.serviceId, transportMode: needsMode ? l.transportMode : undefined });
  const items = useMemo(() => (catalog.data ?? []).filter((it) => !currency || it.currencyCode === currency), [catalog.data, currency]);
  const hiddenOther = (catalog.data?.length ?? 0) > items.length;
  const preview = linePreview(l, rules);
  const Icon = kind ? SERVICE_ICON[kind] : null;
  const qtyLabel = kind === 'HOTEL' ? t.quantityHotel : kind === 'RESTAURANT' ? t.quantityDays : null;

  return (
    <div className="rounded-[18px] border border-border bg-surface-raised p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="num grid size-7 place-items-center rounded-full bg-ink text-xs font-semibold text-ink-foreground">{index + 1}</span>
          {Icon && <Icon className="size-4 text-primary" aria-hidden />}
          <span className="text-sm font-medium">{l.item?.name ?? (service ? name(service) : t.service)}</span>
        </div>
        <div className="flex items-center gap-3">
          {preview && canBreakdown && (
            <span className="text-end text-xs">
              {preview.cost !== null && currency && (
                <span className="num me-3 text-muted">
                  {t.lineCost}: {f.money(fromCents(preview.cost), currency)}
                </span>
              )}
              {preview.selling !== null && currency && (
                <span className="num font-semibold">
                  {t.lineSelling}: {f.money(fromCents(preview.selling), currency)}
                </span>
              )}
            </span>
          )}
          {!locked && (
            <Button type="button" size="icon-sm" variant="ghost" aria-label={t.removeLine} onClick={onRemove}>
              <Trash2 className="text-danger" />
            </Button>
          )}
        </div>
      </div>
      <div className={cn('grid gap-3', canSetProfit ? 'md:grid-cols-12' : 'md:grid-cols-10')}>
        <FormField label={t.service} className="md:col-span-3">
          <Select
            value={l.serviceId}
            disabled={locked}
            onValueChange={(v) => onChange({ serviceId: v, transportMode: '', companyItemId: '', item: undefined })}
          >
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {services.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {name(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        {needsMode && (
          <FormField label={t.mode} className="md:col-span-3">
            <SegmentedControl<TransportMode | ''>
              aria-label={t.mode}
              size="md"
              value={l.transportMode}
              onValueChange={(v) => !locked && onChange({ transportMode: v, companyItemId: '', item: undefined })}
              options={TRANSPORT_MODES.map((mode) => ({
                value: mode,
                ariaLabel: LABELS.transportMode[mode][locale],
                label: <ModeIcon mode={mode} className="size-4" />,
              }))}
            />
          </FormField>
        )}
        <FormField
          label={t.item}
          className={canSetProfit ? (needsMode ? 'md:col-span-3' : 'md:col-span-4') : needsMode ? 'md:col-span-4' : 'md:col-span-5'}
          hint={hiddenOther && currency ? fmt(t.sameCurrencyOnly, { cur: currency }) : undefined}
        >
          <Select
            value={l.companyItemId}
            disabled={!ready || locked}
            onValueChange={(v) => {
              const it = items.find((x) => x.id === v);
              if (it)
                onChange({
                  companyItemId: v,
                  item: { name: it.name, companyId: it.companyId, costPerPerson: it.costPerPerson, currencyCode: it.currencyCode, kind: it.company.service.kind },
                });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={t.itemPlaceholder}>{l.item?.name}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {!items.length && <div className="px-3 py-2 text-xs text-muted">{t.noItems}</div>}
              {items.map((it) => (
                <SelectItem key={it.id} value={it.id}>
                  <span className="flex flex-col">
                    <span>{it.name}</span>
                    <span className="text-[12px] text-muted">
                      {it.company.name}
                      {it.costPerPerson != null && <span className="num"> · {f.money(it.costPerPerson, it.currencyCode)}</span>}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        {!needsMode && (
          <FormField label={`${t.quantity}${qtyLabel ? ` (${qtyLabel})` : ''}`} className="md:col-span-2">
            <Input dir="ltr" inputMode="numeric" value={l.quantity} disabled={locked} onChange={(e) => onChange({ quantity: e.target.value.replace(/\D/g, '').slice(0, 3) })} />
          </FormField>
        )}
        {canSetProfit && (
          <FormField label={t.profit} className="md:col-span-3">
            <div className="flex gap-1.5">
              <Select value={l.profitMode || DEFAULT} disabled={locked} onValueChange={(v) => onChange({ profitMode: v === DEFAULT ? '' : (v as ProfitMode), profitValue: v === DEFAULT ? '' : l.profitValue })}>
                <SelectTrigger className={cn('shrink-0 px-3', l.profitMode ? 'w-[104px]' : 'w-full')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT}>{t.profitDefault}</SelectItem>
                  <SelectItem value="PERCENT">%</SelectItem>
                  <SelectItem value="FIXED">{t.fixed}</SelectItem>
                </SelectContent>
              </Select>
              {l.profitMode && (
                <Input dir="ltr" inputMode="decimal" className="min-w-0 px-3" value={l.profitValue} disabled={locked} onChange={(e) => onChange({ profitValue: e.target.value })} aria-label={t.profit} />
              )}
            </div>
          </FormField>
        )}
      </div>
    </div>
  );
}
