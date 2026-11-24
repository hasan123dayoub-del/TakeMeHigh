'use client';

/*
 * Create / edit an offer (OFR-01..03). BUNDLE: service lines from the catalogue with a live
 * Σ selling − discount preview (only for pricing.view_breakdown). DISCOUNT: target trips and
 * programs with the price before / after for each.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import type { OfferKind, ProfitMode } from '@travelos/shared';
import { ArrowLeft, Check, Package, Percent, Save, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type ReactNode } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { QueryState } from '@/components/data/states';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useApiMutation, useInvalidate, useResource } from '@/lib/hooks';
import { fmt, useMessages } from '@/lib/i18n';
import type { Offer, ProfitRule } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';
import { ApiErrors, Callout, CoverUpload, discountCents, fromCents } from '../programs/product-bits';
import { BundleLines, linePreview, newLine, type LineDraft } from './bundle-lines';
import { DiscountTargets, type TargetRef } from './discount-targets';
import { offerMessages } from './messages';
import { dayOf, distinctCoreServicesCount } from './offer-utils';

export function OfferNew() {
  return <OfferForm offer={null} />;
}

export function OfferEdit({ id }: { id: string }) {
  const q = useResource<Offer>(`/offers/${id}`);
  return (
    <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()}>
      {q.data && <OfferForm offer={q.data} />}
    </QueryState>
  );
}

const linesFromOffer = (o: Offer): LineDraft[] =>
  o.lines.map((l) => ({
    key: l.id,
    serviceId: l.service.id,
    transportMode: l.item.company.transportMode ?? '',
    companyItemId: l.companyItemId,
    quantity: String(l.quantity),
    profitMode: l.profitMode ?? '',
    profitValue: l.profitValue !== undefined ? String(Number(l.profitValue)) : '',
    item: { name: l.item.name, companyId: l.item.company.id, costPerPerson: l.unitCost ?? null, currencyCode: l.item.currencyCode, kind: l.service.kind },
    savedSelling: l.sellingPrice,
    savedCost: l.costSnapshot,
  }));

const lineKey = (lines: LineDraft[]) => JSON.stringify(lines.map((l) => [l.companyItemId, String(l.item?.kind === 'TRANSPORT' ? 1 : Number(l.quantity) || 1), l.profitMode, l.profitMode ? l.profitValue : '']));

function OfferForm({ offer }: { offer: Offer | null }) {
  const t = useMessages(offerMessages);
  const { can } = useAuth();
  const f = useFormat();
  const router = useRouter();
  const invalidate = useInvalidate();
  const canBreakdown = can('pricing.view_breakdown');
  const canSetProfit = can('pricing.set_profit');
  const rules = useResource<ProfitRule[]>(canSetProfit ? '/profit-rules' : null);

  const [kind, setKind] = useState<OfferKind>(offer?.kind ?? 'BUNDLE');
  const initialLines = useMemo(() => (offer ? linesFromOffer(offer) : [newLine(), newLine()]), [offer]);
  const [lines, setLines] = useState<LineDraft[]>(initialLines);
  const [targets, setTargets] = useState(() => ({
    tripIds: offer?.targets.filter((x) => x.tripId).map((x) => x.tripId!) ?? [],
    programIds: offer?.targets.filter((x) => x.programId).map((x) => x.programId!) ?? [],
  }));
  const known = useMemo(
    () => ({
      trips: (offer?.targets.map((x) => x.trip).filter(Boolean) ?? []) as TargetRef[],
      programs: (offer?.targets.map((x) => x.program).filter(Boolean) ?? []) as TargetRef[],
    }),
    [offer],
  );
  const [saveError, setSaveError] = useState<unknown>(null);
  const bundleLocked = !!offer && offer.kind === 'BUNDLE' && offer._count.bookings > 0;

  const schema = useMemo(
    () =>
      z
        .object({
          title: z.string().trim().min(3, { error: t.minLength }),
          description: z.string().optional(),
          discountMode: z.enum(['PERCENT', 'FIXED']),
          discountValue: z.string().regex(/^\d{1,12}(\.\d{1,2})?$/, { error: t.amountInvalid }),
          validFrom: z.string().min(1, { error: t.required }),
          validTo: z.string().min(1, { error: t.required }),
          maxSeats: z.string().regex(/^\d{0,4}$/),
          isPublic: z.boolean(),
          coverImageUrl: z.string(),
          terms: z.string().optional(),
        })
        .refine((v) => v.discountMode !== 'PERCENT' || Number(v.discountValue) <= 100, { path: ['discountValue'], error: t.percentMax })
        .refine((v) => !v.validFrom || !v.validTo || v.validTo >= v.validFrom, { path: ['validTo'], error: t.validToBefore }),
    [t],
  );
  type Values = z.infer<typeof schema>;
  const today = new Date().toISOString().slice(0, 10);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: offer?.title ?? '',
      description: offer?.description ?? '',
      discountMode: offer?.discountMode ?? 'PERCENT',
      discountValue: offer ? String(Number(offer.discountValue)) : '10',
      validFrom: offer ? dayOf(offer.validFrom) : today,
      validTo: offer ? dayOf(offer.validTo) : '',
      maxSeats: offer?.maxSeats ? String(offer.maxSeats) : '',
      isPublic: offer?.isPublic ?? true,
      coverImageUrl: offer?.coverImageUrl ?? '',
      terms: offer?.terms ?? '',
    },
  });
  const errors = form.formState.errors;
  const mode = useWatch({ control: form.control, name: 'discountMode' }) as ProfitMode;
  const value = useWatch({ control: form.control, name: 'discountValue' });

  // ---------------- bundle preview
  const chosen = lines.filter((l) => l.item);
  const currencies = [...new Set(chosen.map((l) => l.item!.currencyCode))];
  const currency = currencies[0] ?? null;
  const distinct = distinctCoreServicesCount(chosen.map((l) => l.item!.kind));
  const previews = chosen.map((l) => linePreview(l, rules.data));
  const allPriced = chosen.length > 0 && previews.every((p) => p && p.selling !== null);
  const grossCents = allPriced ? previews.reduce((s, p) => s + (p?.selling ?? 0), 0) : null;
  const discCents = grossCents !== null ? discountCents(grossCents, mode, value) : null;
  const bundleOk = chosen.length >= 2 && distinct >= 2 && currencies.length <= 1 && chosen.length === lines.length;
  const discountOk = targets.tripIds.length + targets.programIds.length > 0;

  const save = useApiMutation(
    async (v: Values) => {
      setSaveError(null);
      const body: Record<string, unknown> = {
        title: v.title.trim(),
        description: v.description?.trim() || undefined,
        discountMode: v.discountMode,
        discountValue: v.discountValue,
        validFrom: v.validFrom,
        validTo: v.validTo,
        isPublic: v.isPublic,
        coverImageUrl: v.coverImageUrl || undefined,
        terms: v.terms?.trim() || undefined,
      };
      if (kind === 'BUNDLE') {
        if (v.maxSeats) body.maxSeats = Number(v.maxSeats);
        if (!offer || lineKey(lines) !== lineKey(initialLines))
          body.lines = lines.map((l) => ({
            companyItemId: l.companyItemId,
            quantity: l.item?.kind === 'TRANSPORT' ? undefined : Number(l.quantity) || 1,
            ...(canSetProfit && l.profitMode && l.profitValue !== '' ? { profitMode: l.profitMode, profitValue: l.profitValue } : {}),
          }));
      } else {
        const initialT = offer?.targets.filter((x) => x.tripId).map((x) => x.tripId!).sort().join() ?? '';
        const initialP = offer?.targets.filter((x) => x.programId).map((x) => x.programId!).sort().join() ?? '';
        if (!offer || [...targets.tripIds].sort().join() !== initialT || [...targets.programIds].sort().join() !== initialP) {
          body.tripIds = targets.tripIds;
          body.programIds = targets.programIds;
        }
      }
      if (!offer) body.kind = kind;
      return offer ? api.patch<{ id: string }>(`/offers/${offer.id}`, body) : api.post<{ id: string }>('/offers', body);
    },
    {
      silent: true,
      success: offer ? t.saved : t.created,
      onSuccess: async (r) => {
        await invalidate('/offers', '/trips', '/programs');
        router.push(`/dashboard/offers/${r.id}`);
      },
    },
  );

  const submit = form.handleSubmit((v) =>
    save.mutate(v, {
      onError: (e) => {
        setSaveError(e);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    }),
  );

  const canSubmit = kind === 'BUNDLE' ? bundleOk : discountOk;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <PageHeader
        eyebrow={
          <Link href={offer ? `/dashboard/offers/${offer.id}` : '/dashboard/offers'} className="inline-flex items-center gap-1.5 hover:text-foreground">
            <ArrowLeft className="rtl-flip size-3.5" aria-hidden /> {offer ? offer.title : t.back}
          </Link>
        }
        title={offer ? t.editTitle : t.newTitle}
        description={t.formDescription}
      />

      {saveError ? <ApiErrors error={saveError} /> : null}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* kind */}
          <div role="radiogroup" aria-label={t.kind} className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ['BUNDLE', Package, t.kindBundle, t.kindBundleBody],
                ['DISCOUNT', Percent, t.kindDiscount, t.kindDiscountBody],
              ] as const
            ).map(([k, Icon, title, body]) => {
              const on = kind === k;
              const disabled = !!offer && !on;
              return (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={disabled}
                  onClick={() => !offer && setKind(k)}
                  className={cn(
                    'relative flex items-start gap-4 rounded-card border p-5 text-start transition-[border-color,box-shadow,opacity]',
                    on ? 'border-ink bg-surface-raised shadow-card ring-1 ring-ink' : 'border-border bg-surface hover:border-border-strong',
                    disabled && 'cursor-not-allowed opacity-45',
                  )}
                >
                  <span className={cn('grid size-11 shrink-0 place-items-center rounded-full', on ? 'bg-ink text-ink-foreground' : 'bg-surface-raised text-primary ring-1 ring-border')}>
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium">{title}</span>
                    <span className="mt-1 block text-[14px] leading-relaxed text-muted">{body}</span>
                  </span>
                  {on && (
                    <span className="absolute end-4 top-4 grid size-5 place-items-center rounded-full bg-ink text-ink-foreground">
                      <Check className="size-3" aria-hidden />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {offer && <p className="-mt-3 text-xs text-muted">{t.kindFixed}</p>}

          {/* lines / targets */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{kind === 'BUNDLE' ? t.lines : t.targetsTitle}</CardTitle>
                <CardDescription>{kind === 'BUNDLE' ? t.linesHint : t.targetsHint}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {kind === 'BUNDLE' ? (
                <>
                  {bundleLocked && (
                    <div className="mb-4">
                      <Callout tone="warning" title={t.bundleLocked} />
                    </div>
                  )}
                  <BundleLines lines={lines} onChange={setLines} currency={currency} canSetProfit={canSetProfit} canBreakdown={canBreakdown} rules={rules.data} locked={bundleLocked} />
                  {canSetProfit && !bundleLocked && <p className="mt-3 text-xs text-muted">{t.profitHint}</p>}
                </>
              ) : (
                <DiscountTargets tripIds={targets.tripIds} programIds={targets.programIds} onChange={setTargets} mode={mode} value={value} known={known} />
              )}
            </CardContent>
          </Card>

          {/* basics */}
          <Card>
            <CardHeader>
              <CardTitle>{t.basics}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField label={t.name} error={errors.title?.message} required className="sm:col-span-2">
                <Input {...form.register('title')} />
              </FormField>
              <FormField label={t.discountMode}>
                <Controller
                  control={form.control}
                  name="discountMode"
                  render={({ field }) => (
                    <SegmentedControl<'PERCENT' | 'FIXED'>
                      aria-label={t.discountMode}
                      size="md"
                      value={field.value}
                      onValueChange={field.onChange}
                      options={[
                        { value: 'PERCENT', label: t.percent },
                        { value: 'FIXED', label: t.fixed },
                      ]}
                    />
                  )}
                />
              </FormField>
              <FormField label={t.discountValue} error={errors.discountValue?.message} required>
                <div className="relative">
                  <Input dir="ltr" inputMode="decimal" {...form.register('discountValue')} className="pe-14" />
                  <span className="num pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-sm text-muted" dir="ltr">
                    {mode === 'PERCENT' ? '%' : (currency ?? '')}
                  </span>
                </div>
              </FormField>
              <FormField label={t.validFrom} error={errors.validFrom?.message} required>
                <Input type="date" dir="ltr" {...form.register('validFrom')} />
              </FormField>
              <FormField label={t.validTo} error={errors.validTo?.message} required>
                <Input type="date" dir="ltr" {...form.register('validTo')} />
              </FormField>
              {kind === 'BUNDLE' && (
                <FormField label={t.maxSeats} hint={t.maxSeatsHint} error={errors.maxSeats?.message}>
                  <Input dir="ltr" inputMode="numeric" {...form.register('maxSeats')} />
                </FormField>
              )}
              <FormField label={t.descriptionField} className="sm:col-span-2">
                <Textarea rows={3} {...form.register('description')} />
              </FormField>
              <FormField label={t.cover} className="sm:col-span-2">
                <Controller control={form.control} name="coverImageUrl" render={({ field }) => <CoverUpload value={field.value} onChange={field.onChange} />} />
              </FormField>
              <FormField label={t.terms} className="sm:col-span-2">
                <Textarea rows={3} {...form.register('terms')} />
              </FormField>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" className="size-4 accent-[var(--primary)]" {...form.register('isPublic')} />
                {t.isPublic}
              </label>
            </CardContent>
          </Card>
        </div>

        {/* summary */}
        <aside className="flex flex-col gap-4 xl:sticky xl:top-6">
          {kind === 'BUNDLE' ? (
            <Card tone="altitude" className="p-5 text-white">
              <div className="text-xs font-medium tracking-[0.16em] uppercase opacity-85">{t.net}</div>
              {canBreakdown && grossCents !== null && currency && discCents !== null ? (
                <>
                  <div className="num mt-3 text-[34px] leading-none font-medium tracking-tight">{f.money(fromCents(grossCents - discCents), currency)}</div>
                  <dl className="mt-4 flex flex-col gap-2 border-t border-white/20 pt-3 text-xs">
                    <div className="flex justify-between gap-3">
                      <dt className="opacity-85">{t.gross}</dt>
                      <dd className="num font-medium">{f.money(fromCents(grossCents), currency)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="opacity-85">{t.discountAmount}</dt>
                      <dd className="num font-medium">− {f.money(fromCents(discCents), currency)}</dd>
                    </div>
                  </dl>
                  <p className="mt-3 text-[12px] opacity-80">{t.previewHint}</p>
                </>
              ) : (
                <>
                  <div className="num mt-3 text-[34px] leading-none font-medium tracking-tight">—</div>
                  <p className="mt-3 text-xs opacity-85">{!canBreakdown ? t.previewHidden : chosen.length ? t.previewDefaultProfit : t.previewHint}</p>
                </>
              )}
            </Card>
          ) : (
            <Card tone="altitude" className="p-5 text-white">
              <div className="text-xs font-medium tracking-[0.16em] uppercase opacity-85">{t.discount}</div>
              <div className="num mt-3 text-[34px] leading-none font-medium tracking-tight" dir="ltr">
                {mode === 'PERCENT' ? `${Number(value || 0)}%` : f.number(value || 0, { maximumFractionDigits: 2 })}
              </div>
              <p className="mt-3 text-xs opacity-85">{fmt(t.targetsCount, { n: targets.tripIds.length + targets.programIds.length })}</p>
            </Card>
          )}

          <Card className="p-5">
            <h3 className="eyebrow text-[12px]">{t.summary}</h3>
            <div className="mt-4 flex flex-col gap-2.5">
              {kind === 'BUNDLE' ? (
                <>
                  <Check2 ok={distinct >= 2} label={distinct >= 2 ? fmt(t.distinctOk, { n: distinct }) : t.distinctBad} />
                  {currencies.length > 1 && <Check2 ok={false} label={t.currencyBad} />}
                  {currency && currencies.length === 1 && <Check2 ok label={<span className="num ltr-nums">{currency}</span>} />}
                </>
              ) : (
                <Check2 ok={discountOk} label={discountOk ? fmt(t.selected, { n: targets.tripIds.length + targets.programIds.length }) : t.targetsRequired} />
              )}
            </div>
            <div className="mt-4">
              <Callout tone="info" title={t.ofr03Title}>
                {t.ofr03Body}
              </Callout>
            </div>
            <Button type="submit" className="mt-4 w-full" disabled={!canSubmit} loading={save.isPending}>
              {!save.isPending && <Save />} {offer ? t.save : t.create}
            </Button>
          </Card>
        </aside>
      </div>
    </form>
  );
}

function Check2({ ok, label }: { ok: boolean; label: ReactNode }) {
  return (
    <div className={cn('flex items-center gap-2 text-[14px] font-medium', ok ? 'text-[color-mix(in_srgb,var(--success)_75%,var(--text))]' : 'text-danger')}>
      <span className={cn('grid size-5 place-items-center rounded-full', ok ? 'bg-success/14' : 'bg-danger/12')}>{ok ? <Check className="size-3" aria-hidden /> : <X className="size-3" aria-hidden />}</span>
      {label}
    </div>
  );
}
