'use client';

import { LABELS, type ServiceKind } from '@travelos/shared';
import { CalendarClock, Check, Flag, MapPin, Pencil, Plus, Route, Trash2, TriangleAlert, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/data/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { api, errorMessage } from '@/lib/api';
import { useInvalidate, useName } from '@/lib/hooks';
import { defineMessages, useLocale, useMessages } from '@/lib/i18n';
import type { TripLine } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';
import { LineDialog } from './line-dialog';
import { ServiceIcon } from './service-icon';
import { RouteText } from './trip-bits';
import { tripWords } from './trip-messages';
import { CORE_KINDS, type TripFull } from './trip-utils';

const m = defineMessages({
  ar: {
    title: 'الخدمات والمسار',
    description: 'خدمات الرحلة مرتبة زمنياً. يجب أن يتصل النقل بلا قفزات بين الأماكن، وألا تتداخل الإقامات، وأن تكون كل الخدمات داخل تواريخ الرحلة.',
    readOnlyDescription: 'برنامج الرحلة خطوة بخطوة.',
    add: 'إضافة خدمة',
    departure: 'الانطلاق',
    arrivalBack: 'نهاية الرحلة',
    emptyTitle: 'لا توجد خدمات بعد',
    emptyBody: 'ابدأ بخدمة النقل من مدينة الانطلاق، ثم أضف الفندق والمطعم. يُحسب سعر الرحلة من مجموع أسعار الخدمات.',
    unitCost: 'كلفة الوحدة',
    lineCost: 'الكلفة',
    profit: 'الربح',
    selling: 'سعر البيع',
    totals: 'الإجمالي للشخص',
    totalSelling: 'مجموع أسعار البيع = سعر الرحلة',
    totalCost: 'مجموع الكلف',
    totalProfit: 'الربح المتوقع',
    checklist: 'الخدمات المطلوبة',
    rule: 'خدمتان مختلفتان على الأقل من: نقل، فندق، مطعم (BR-04).',
    ruleOk: 'الشرط محقق',
    ruleMissing: 'الشرط غير محقق بعد',
    deleteTitle: 'حذف هذه الخدمة؟',
    deleteBody: 'سيُعاد حساب سعر الرحلة فوراً.',
    deleted: 'تم حذف الخدمة',
    inactive: 'مورد معطّل',
    stale: 'كلفة قديمة',
    unavailable: 'غير متاحة',
    frozen: 'الخدمات مجمّدة لأن التسجيل لم يعد مفتوحاً.',
    lines: 'خدمات',
    notes: 'ملاحظة',
    edit: 'تعديل',
  },
  en: {
    title: 'Services and route',
    description: 'The trip services in time order. Transport must connect without jumps, stays must not overlap, and every service must lie within the trip dates.',
    readOnlyDescription: 'The trip itinerary step by step.',
    add: 'Add service',
    departure: 'Departure',
    arrivalBack: 'Trip ends',
    emptyTitle: 'No services yet',
    emptyBody: 'Start with transport from the origin city, then add the hotel and restaurant. The trip price is the sum of the service prices.',
    unitCost: 'Unit cost',
    lineCost: 'Cost',
    profit: 'Profit',
    selling: 'Selling price',
    totals: 'Totals per person',
    totalSelling: 'Sum of selling prices = trip price',
    totalCost: 'Sum of costs',
    totalProfit: 'Expected profit',
    checklist: 'Required services',
    rule: 'At least two different services out of transport, hotel and restaurant (BR-04).',
    ruleOk: 'Rule satisfied',
    ruleMissing: 'Rule not satisfied yet',
    deleteTitle: 'Delete this service?',
    deleteBody: 'The trip price is recomputed immediately.',
    deleted: 'Service deleted',
    inactive: 'Inactive supplier',
    stale: 'Stale cost',
    unavailable: 'Unavailable',
    frozen: 'Services are frozen because registration is no longer open.',
    lines: 'services',
    notes: 'Note',
    edit: 'Edit',
  },
});

export function RouteBuilder({ trip, editable, canProfit }: { trip: TripFull; editable: boolean; canProfit: boolean }) {
  const t = useMessages(m);
  const w = useMessages(tripWords);
  const f = useFormat();
  const name = useName();
  const invalidate = useInvalidate();
  const { locale } = useLocale();
  const [dialog, setDialog] = useState<TripLine | 'new' | null>(null);
  const [deleting, setDeleting] = useState<TripLine | null>(null);

  const lines = [...trip.lines].sort((a, b) => a.sequenceNo - b.sequenceNo);
  const showMoney = lines.some((l) => l.sellingPrice !== undefined) || trip.costPerPerson !== undefined;
  const kinds = new Set<ServiceKind>(lines.map((l) => l.service.kind));
  const coreCount = CORE_KINDS.filter((k) => kinds.has(k)).length;
  const structureOpen = trip.status === 'DRAFT' || trip.status === 'OPEN';
  const canEdit = editable && structureOpen;
  const totalCost = lines.reduce((s, l) => s + Number(l.costSnapshot ?? 0), 0);
  const totalSelling = lines.reduce((s, l) => s + Number(l.sellingPrice ?? 0), 0);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Route className="size-4 text-primary" aria-hidden />
              {t.title}
              <span className="num text-xs text-muted normal-case">
                ({lines.length} {t.lines})
              </span>
            </CardTitle>
            <CardDescription className="max-w-2xl">{editable ? t.description : t.readOnlyDescription}</CardDescription>
          </div>
          {canEdit && (
            <Button size="sm" onClick={() => setDialog('new')}>
              <Plus /> {t.add}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editable && !structureOpen && <p className="mb-4 rounded-tile bg-surface-raised px-4 py-2.5 text-sm text-muted">{t.frozen}</p>}
          {lines.length === 0 ? (
            <EmptyState
              icon={Route}
              size="sm"
              title={t.emptyTitle}
              description={t.emptyBody}
              action={
                canEdit ? (
                  <Button onClick={() => setDialog('new')}>
                    <Plus /> {t.add}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ol className="relative">
              {/* departure */}
              <Milestone icon={MapPin} title={`${t.departure} · ${name(trip.originCity)}`} when={f.date(trip.startsAt, 'dateTime')} tone="primary" />
              {lines.map((l) => (
                <LineItem
                  key={l.id}
                  line={l}
                  currency={trip.currencyCode}
                  showMoney={showMoney}
                  canEdit={canEdit}
                  onEdit={() => setDialog(l)}
                  onDelete={() => setDeleting(l)}
                />
              ))}
              <Milestone icon={Flag} title={t.arrivalBack} when={f.date(trip.endsAt, 'dateTime')} tone="ink" last />
            </ol>
          )}

          {showMoney && lines.length > 0 && (
            <div className="mt-6 grid gap-3 rounded-tile border border-border bg-surface-raised p-4 sm:grid-cols-3">
              <Total label={t.totalSelling} value={f.money(totalSelling, trip.currencyCode)} strong />
              <Total label={t.totalCost} value={f.money(totalCost, trip.currencyCode)} />
              <Total label={t.totalProfit} value={f.money(totalSelling - totalCost, trip.currencyCode)} tone="success" />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader>
            <CardTitle>{t.checklist}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            {CORE_KINDS.map((k) => {
              const has = kinds.has(k);
              return (
                <div key={k} className={cn('flex items-center gap-3 rounded-tile border px-3 py-2.5', has ? 'border-success/30 bg-success/8' : 'border-border bg-surface-raised')}>
                  <ServiceIcon kind={k} size="sm" />
                  <span className="flex-1 text-sm font-medium">{LABELS.serviceKind[k][locale]}</span>
                  {has ? <Check className="size-4 text-success" aria-label="✓" /> : <X className="size-4 text-subtle" aria-label="✗" />}
                </div>
              );
            })}
            <div className={cn('mt-1 rounded-tile px-3 py-2.5 text-xs leading-relaxed', coreCount >= 2 ? 'bg-success/10' : 'bg-warning/12')}>
              <div className={cn('mb-0.5 font-medium', coreCount >= 2 ? 'text-success' : 'text-[color-mix(in_srgb,var(--warning)_75%,var(--text))]')}>
                {coreCount >= 2 ? t.ruleOk : t.ruleMissing} · <span className="num">{coreCount}/3</span>
              </div>
              {t.rule}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{w.price}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="num font-display text-3xl">{f.money(trip.pricePerPerson, trip.currencyCode)}</div>
            {trip.costPerPerson !== undefined && (
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-muted">{w.cost}</dt>
                  <dd className="num">{f.money(trip.costPerPerson, trip.currencyCode)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">{w.profit}</dt>
                  <dd className="num text-success">{f.money(Number(trip.pricePerPerson) - Number(trip.costPerPerson), trip.currencyCode)}</dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>
      </div>

      {dialog && <LineDialog trip={trip} line={dialog === 'new' ? null : dialog} canProfit={canProfit} onClose={() => setDialog(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t.deleteTitle}
        description={deleting ? `${deleting.item.name} — ${t.deleteBody}` : undefined}
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await api.delete(`/trips/${trip.id}/lines/${deleting.id}`);
            toast.success(t.deleted);
            await invalidate('/trips');
          } catch (e) {
            toast.error(errorMessage(e));
            throw e;
          }
        }}
      />
    </div>
  );
}

function Milestone({ icon: Icon, title, when, tone, last }: { icon: typeof MapPin; title: string; when: string; tone: 'primary' | 'ink'; last?: boolean }) {
  return (
    <li className={cn('relative flex items-center gap-4 ps-0', !last && 'pb-5')}>
      {!last && <span aria-hidden className="absolute start-5 top-10 bottom-0 w-px -translate-x-1/2 bg-border rtl:translate-x-1/2" />}
      <span
        aria-hidden
        className={cn('relative z-10 grid size-10 shrink-0 place-items-center rounded-full', tone === 'primary' ? 'bg-primary text-primary-foreground shadow-primary' : 'bg-ink text-ink-foreground')}
      >
        <Icon className="size-[18px]" strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="num text-xs text-muted">{when}</div>
      </div>
    </li>
  );
}

function LineItem({
  line: l,
  currency,
  showMoney,
  canEdit,
  onEdit,
  onDelete,
}: {
  line: TripLine;
  currency: string;
  showMoney: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useMessages(m);
  const w = useMessages(tripWords);
  const { locale } = useLocale();
  const f = useFormat();
  const name = useName();
  const transport = l.service.kind === 'TRANSPORT';
  const kindLabel = transport && l.transportMode ? `${LABELS.serviceKind.TRANSPORT[locale]} ${LABELS.transportMode[l.transportMode][locale]}` : LABELS.serviceKind[l.service.kind][locale];
  const qtyUnit = l.service.kind === 'HOTEL' ? w.nights : w.days;
  const sameDay = new Date(l.startsAt).toDateString() === new Date(l.endsAt).toDateString();
  const flags = [
    (!l.item.isActive || !l.item.company.isActive) && t.inactive,
    l.item.isStale && t.stale,
    l.item.available === false && t.unavailable,
  ].filter((x): x is string => !!x);

  return (
    <li className="group relative flex gap-4 pb-5">
      <span aria-hidden className="absolute start-5 top-0 bottom-0 w-px -translate-x-1/2 bg-border rtl:translate-x-1/2" />
      <div className="relative z-10 flex flex-col items-center pt-3">
        <ServiceIcon kind={l.service.kind} mode={l.transportMode} className="bg-surface-raised shadow-card" />
        <span className="num mt-1 text-[11px] font-medium text-subtle">{l.sequenceNo}</span>
      </div>
      <div className="min-w-0 flex-1 rounded-tile border border-border bg-surface-raised p-4 shadow-card transition-shadow group-hover:shadow-pop">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="eyebrow">{kindLabel}</div>
            <div className="mt-1 font-medium leading-snug">{l.item.name}</div>
            <div className="text-[14px] text-muted">{l.item.company.name}</div>
          </div>
          <div className="flex items-center gap-1.5">
            {flags.map((x) => (
              <Badge key={x} tone="warning" size="sm">
                <TriangleAlert className="size-3" aria-hidden /> {x}
              </Badge>
            ))}
            {!transport && (
              <Badge tone="neutral" size="sm" className="num">
                {l.quantity} {qtyUnit}
              </Badge>
            )}
            {canEdit && (
              <>
                <Button size="icon-sm" variant="ghost" onClick={onEdit} aria-label={`${t.edit}: ${l.item.name}`}>
                  <Pencil />
                </Button>
                <Button size="icon-sm" variant="ghost" onClick={onDelete} aria-label={`${t.deleteTitle} ${l.item.name}`}>
                  <Trash2 className="text-danger" />
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[14px]">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5 text-subtle" aria-hidden />
            {transport ? <RouteText from={name(l.fromCity)} to={name(l.toCity)} /> : name(l.toCity)}
          </span>
          <span className="inline-flex items-center gap-1.5 text-muted">
            <CalendarClock className="size-3.5 text-subtle" aria-hidden />
            <RouteText className="num" from={f.date(l.startsAt, 'dateTime')} to={sameDay ? f.date(l.endsAt, 'time') : f.date(l.endsAt, 'dateTime')} />
          </span>
        </div>
        {l.notes && (
          <p className="mt-2 text-xs text-muted">
            {t.notes}: {l.notes}
          </p>
        )}

        {showMoney && l.sellingPrice !== undefined && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-dashed border-border pt-3 text-[14px]">
            <span className="text-muted">
              {t.unitCost} <span className="num text-foreground">{f.money(l.unitCost, currency)}</span>
              {' × '}
              <span className="num text-foreground">{l.quantity}</span>
              {' = '}
              <span className="num text-foreground">{f.money(l.costSnapshot, currency)}</span>
            </span>
            {l.profitMode && (
              <span className="text-muted">
                {t.profit}{' '}
                <span className="num text-success">
                  {l.profitMode === 'PERCENT' ? `${Number(l.profitValue)}%` : f.money(l.profitValue, currency)}
                </span>
              </span>
            )}
            <span className="ms-auto font-medium">
              {t.selling} <span className="num">{f.money(l.sellingPrice, currency)}</span>
            </span>
          </div>
        )}
      </div>
    </li>
  );
}

function Total({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: 'success' }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className={cn('num mt-0.5', strong ? 'text-lg font-semibold' : 'text-base font-medium', tone === 'success' && 'text-success')}>{value}</div>
    </div>
  );
}
