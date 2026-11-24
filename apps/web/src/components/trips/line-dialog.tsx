'use client';

import { LABELS, type ProfitMode, type TransportMode } from '@travelos/shared';
import { Check, CircleAlert, Loader2, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, api, errorMessage } from '@/lib/api';
import { useInvalidate, useLookups, useName, useResource } from '@/lib/hooks';
import { defineMessages, useLocale, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import type { ServiceRef, TripLine } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';
import { CityCombobox } from './city-combobox';
import { ServiceIcon } from './service-icon';
import { RouteText } from './trip-bits';
import { amountPattern, fromLocalInput, toLocalInput, TRANSPORT_MODES, type CatalogItem, type TripFull } from './trip-utils';

const DEFAULT = '__default__';

const m = defineMessages({
  ar: {
    addTitle: 'إضافة خدمة إلى الرحلة',
    editTitle: 'تعديل الخدمة',
    addHint: 'اختر نوع الخدمة ثم البند من كتالوج الموردين بعملة الرحلة ({c}).',
    editHint: 'يمكن تعديل التوقيت والكمية والمدينة. لتغيير البند احذف الخدمة وأضف غيرها.',
    service: 'نوع الخدمة',
    mode: 'وسيلة النقل',
    item: 'البند',
    searchItems: 'ابحث باسم الشركة أو البند…',
    noItems: 'لا توجد بنود فعّالة بهذه العملة لهذه الخدمة.',
    chooseService: 'اختر نوع الخدمة أولاً.',
    chooseMode: 'اختر وسيلة النقل.',
    startsAt: 'البداية',
    endsAt: 'النهاية',
    quantity: 'الكمية (عدد الليالي/الأيام)',
    quantityHint: 'اتركها فارغة ليحسبها النظام من التاريخين: الفندق بالليالي والمطعم بالأيام.',
    city: 'مدينة الخدمة',
    cityHint: 'افتراضياً مدينة البند. يجب أن تكون على مسار الرحلة.',
    profitMode: 'طريقة الربح',
    profitValue: 'قيمة الربح',
    defaultProfit: 'الربح الافتراضي للمورد',
    profitHint: 'اترك «الربح الافتراضي» ليُطبَّق قاعدة الربح المعرّفة للخدمة أو الشركة.',
    profitNote: 'يُطبَّق الربح الافتراضي (يحدده مدير المكتب).',
    notes: 'ملاحظات',
    errorsTitle: 'لا يمكن حفظ الخدمة:',
    required: 'أكمل الحقول المطلوبة',
    badAmount: 'قيمة الربح غير صحيحة',
    added: 'تمت إضافة الخدمة وإعادة حساب السعر',
    saved: 'تم حفظ الخدمة وإعادة حساب السعر',
    perPerson: 'للشخص',
    stale: 'كلفة قديمة',
  },
  en: {
    addTitle: 'Add a service to the trip',
    editTitle: 'Edit service',
    addHint: 'Choose the service type, then an item from the supplier catalog in the trip currency ({c}).',
    editHint: 'Timing, quantity and city can change. To change the item, delete this service and add another.',
    service: 'Service type',
    mode: 'Transport mode',
    item: 'Item',
    searchItems: 'Search by company or item…',
    noItems: 'No active items in this currency for this service.',
    chooseService: 'Choose the service type first.',
    chooseMode: 'Choose the transport mode.',
    startsAt: 'Start',
    endsAt: 'End',
    quantity: 'Quantity (nights / days)',
    quantityHint: 'Leave empty to compute from the dates: nights for hotels, days for restaurants.',
    city: 'Service city',
    cityHint: 'Defaults to the item’s city. It must be on the trip route.',
    profitMode: 'Profit mode',
    profitValue: 'Profit value',
    defaultProfit: 'Default supplier profit',
    profitHint: 'Keep “Default” to apply the profit rule defined for the service or company.',
    profitNote: 'The default profit applies (set by the Admin).',
    notes: 'Notes',
    errorsTitle: 'The service cannot be saved:',
    required: 'Complete the required fields',
    badAmount: 'Invalid profit value',
    added: 'Service added and price recomputed',
    saved: 'Service saved and price recomputed',
    perPerson: 'per person',
    stale: 'Stale cost',
  },
});

function addHours(local: string, h: number) {
  if (!local) return '';
  return toLocalInput(new Date(new Date(local).getTime() + h * 3_600_000).toISOString());
}

export function LineDialog({ trip, line, canProfit, onClose }: { trip: TripFull; line: TripLine | null; canProfit: boolean; onClose: () => void }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const { locale } = useLocale();
  const f = useFormat();
  const name = useName();
  const invalidate = useInvalidate();
  const lookups = useLookups().data;

  const ordered = [...trip.lines].sort((a, b) => a.sequenceNo - b.sequenceNo);
  const prevEnd = ordered.length ? ordered[ordered.length - 1].endsAt : trip.startsAt;

  const [service, setService] = useState<ServiceRef | null>(null);
  const [mode, setMode] = useState<TransportMode | null>(null);
  const [item, setItem] = useState<CatalogItem | null>(null);
  const [q, setQ] = useState('');
  const [startsAt, setStartsAt] = useState(toLocalInput(line?.startsAt ?? prevEnd));
  const [endsAt, setEndsAt] = useState(toLocalInput(line?.endsAt ?? ''));
  const [quantity, setQuantity] = useState(line ? String(line.quantity) : '');
  const [toCityId, setToCityId] = useState(line?.toCityId ?? '');
  const [profitMode, setProfitMode] = useState<ProfitMode | typeof DEFAULT>(line?.profitMode ?? DEFAULT);
  const [profitValue, setProfitValue] = useState(line?.profitValue ? String(Number(line.profitValue)) : '');
  const [notes, setNotes] = useState(line?.notes ?? '');
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const kind = line ? line.service.kind : service?.kind;
  const transport = kind === 'TRANSPORT';
  const services = lookups?.services ?? [];

  const catalog = useResource<CatalogItem[]>(
    !line && service && (!transport || mode) ? '/catalog' : null,
    { serviceId: service?.id, transportMode: transport ? (mode ?? undefined) : undefined, currencyCode: trip.currencyCode },
  );
  const items = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (catalog.data ?? []).filter((x) => !needle || x.name.toLowerCase().includes(needle) || x.company.name.toLowerCase().includes(needle));
  }, [catalog.data, q]);

  const pickItem = (x: CatalogItem) => {
    setItem(x);
    if (!transport) setToCityId(x.toCityId ?? '');
    if (!endsAt) setEndsAt(transport ? addHours(startsAt, 3) : toLocalInput(trip.endsAt));
  };

  const save = async () => {
    setErrors([]);
    if (!startsAt || !endsAt || (!line && !item)) {
      setErrors([t.required]);
      return;
    }
    const wantsProfit = canProfit && profitMode !== DEFAULT;
    if (wantsProfit && !amountPattern.test(profitValue)) {
      setErrors([t.badAmount]);
      return;
    }
    const body: Record<string, unknown> = {
      startsAt: fromLocalInput(startsAt),
      endsAt: fromLocalInput(endsAt),
      notes: notes.trim() || undefined,
    };
    if (!transport) {
      if (quantity) body.quantity = Number(quantity);
      if (toCityId) body.toCityId = toCityId;
    }
    if (wantsProfit) {
      body.profitMode = profitMode;
      body.profitValue = profitValue;
    }
    setBusy(true);
    try {
      if (line) await api.patch(`/trips/${trip.id}/lines/${line.id}`, body);
      else await api.post(`/trips/${trip.id}/lines`, { ...body, companyItemId: item!.id });
      await invalidate('/trips');
      toast.success(line ? t.saved : t.added);
      onClose();
    } catch (e) {
      setErrors(e instanceof ApiError ? e.messages : [errorMessage(e)]);
    } finally {
      setBusy(false);
    }
  };

  const ready = !!line || !!item;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{line ? t.editTitle : t.addTitle}</DialogTitle>
          <DialogDescription>{line ? t.editHint : t.addHint.replace('{c}', trip.currencyCode)}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          {line ? (
            <div className="flex items-center gap-3 rounded-tile border border-border bg-surface p-3">
              <ServiceIcon kind={line.service.kind} mode={line.transportMode} />
              <div className="min-w-0">
                <div className="font-medium">{line.item.name}</div>
                <div className="text-xs text-muted">{line.item.company.name}</div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-2">
                <span className="text-sm font-medium">{t.service}</span>
                <div className="flex flex-wrap gap-2">
                  {services.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setService(s);
                        setMode(null);
                        setItem(null);
                        setQ('');
                      }}
                      aria-pressed={service?.id === s.id}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-full border py-1.5 ps-1.5 pe-4 text-sm font-medium transition-colors',
                        service?.id === s.id ? 'border-ink bg-ink text-ink-foreground' : 'border-border bg-surface-raised hover:border-border-strong',
                      )}
                    >
                      <ServiceIcon kind={s.kind} size="sm" />
                      {name(s)}
                    </button>
                  ))}
                </div>
              </div>

              {transport && (
                <div className="grid gap-2">
                  <span className="text-sm font-medium">{t.mode}</span>
                  <div className="flex flex-wrap gap-2">
                    {TRANSPORT_MODES.map((md) => (
                      <button
                        key={md}
                        type="button"
                        onClick={() => {
                          setMode(md);
                          setItem(null);
                        }}
                        aria-pressed={mode === md}
                        className={cn(
                          'inline-flex items-center gap-2 rounded-full border py-1.5 ps-1.5 pe-4 text-sm font-medium transition-colors',
                          mode === md ? 'border-ink bg-ink text-ink-foreground' : 'border-border bg-surface-raised hover:border-border-strong',
                        )}
                      >
                        <ServiceIcon kind="TRANSPORT" mode={md} size="sm" />
                        {LABELS.transportMode[md][locale]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <span className="text-sm font-medium">{t.item}</span>
                {!service ? (
                  <p className="rounded-tile bg-surface px-4 py-3 text-sm text-muted">{t.chooseService}</p>
                ) : transport && !mode ? (
                  <p className="rounded-tile bg-surface px-4 py-3 text-sm text-muted">{t.chooseMode}</p>
                ) : (
                  <div className="rounded-tile border border-border">
                    <div className="relative border-b border-border p-2">
                      <Search className="pointer-events-none absolute start-5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
                      <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder={t.searchItems}
                        aria-label={t.searchItems}
                        className="h-9 w-full rounded-[10px] bg-surface ps-9 pe-3 text-sm outline-none placeholder:text-subtle"
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto p-1.5" role="listbox" aria-label={t.item}>
                      {catalog.isLoading && (
                        <div className="grid gap-1.5 p-1">
                          <Skeleton className="h-12" />
                          <Skeleton className="h-12" />
                        </div>
                      )}
                      {!catalog.isLoading && items.length === 0 && <p className="px-3 py-5 text-center text-sm text-muted">{t.noItems}</p>}
                      {items.map((x) => (
                        <button
                          key={x.id}
                          type="button"
                          role="option"
                          aria-selected={item?.id === x.id}
                          onClick={() => pickItem(x)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-start transition-colors',
                            item?.id === x.id ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-surface',
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{x.name}</div>
                            <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                              <span>{x.company.name}</span>
                              {(x.fromCity || x.toCity) && (
                                <>
                                  <span aria-hidden>·</span>
                                  {x.fromCity ? <RouteText from={name(x.fromCity)} to={name(x.toCity)} /> : <span>{name(x.toCity)}</span>}
                                </>
                              )}
                              {x.isStale && <span className="text-[color-mix(in_srgb,var(--warning)_75%,var(--text))]">· {t.stale}</span>}
                            </div>
                          </div>
                          {x.costPerPerson != null && (
                            <div className="text-end">
                              <div className="num text-sm font-medium">{f.money(x.costPerPerson, x.currencyCode)}</div>
                              <div className="text-[12px] text-muted">{t.perPerson}</div>
                            </div>
                          )}
                          {item?.id === x.id && <Check className="size-4 shrink-0 text-primary" aria-hidden />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {ready && (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t.startsAt} required>
                <Input type="datetime-local" dir="ltr" className="num" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </FormField>
              <FormField label={t.endsAt} required>
                <Input type="datetime-local" dir="ltr" className="num" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </FormField>
              {!transport && (
                <>
                  <FormField label={t.quantity} hint={t.quantityHint}>
                    <Input type="number" min={1} max={365} dir="ltr" className="num" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                  </FormField>
                  <FormField label={t.city} hint={t.cityHint}>
                    <CityCombobox value={toCityId} onChange={setToCityId} />
                  </FormField>
                </>
              )}
              {canProfit ? (
                <>
                  <FormField label={t.profitMode} hint={t.profitHint}>
                    <Select value={profitMode} onValueChange={(v) => setProfitMode(v as ProfitMode | typeof DEFAULT)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={DEFAULT}>{t.defaultProfit}</SelectItem>
                        <SelectItem value="PERCENT">{LABELS.profitMode.PERCENT[locale]}</SelectItem>
                        <SelectItem value="FIXED">{LABELS.profitMode.FIXED[locale]}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label={`${t.profitValue}${profitMode === 'PERCENT' ? ' (%)' : profitMode === 'FIXED' ? ` (${trip.currencyCode})` : ''}`}>
                    <Input dir="ltr" inputMode="decimal" className="num" disabled={profitMode === DEFAULT} value={profitValue} onChange={(e) => setProfitValue(e.target.value)} />
                  </FormField>
                </>
              ) : (
                <p className="self-end rounded-tile bg-surface px-4 py-3 text-sm text-muted sm:col-span-2">{t.profitNote}</p>
              )}
              <FormField label={t.notes} className="sm:col-span-2">
                <Input value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} />
              </FormField>
            </div>
          )}

          {errors.length > 0 && (
            <div role="alert" className="rounded-tile border border-danger/30 bg-danger/8 px-4 py-3 text-sm">
              <p className="flex items-center gap-1.5 font-medium text-danger">
                <CircleAlert className="size-4" aria-hidden /> {t.errorsTitle}
              </p>
              <ul className="mt-1.5 list-disc space-y-0.5 ps-5">
                {errors.map((e) => (
                  <li key={e} dir="auto">{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {c.cancel}
          </Button>
          <Button onClick={save} disabled={busy || !ready}>
            {busy && <Loader2 className="animate-spin" />} {line ? c.save : c.add}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
