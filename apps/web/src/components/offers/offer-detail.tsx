'use client';

/* Offer detail: summary, bundle lines or discount targets, bookings count and actions (OFR-*). */
import { ArrowLeft, CalendarRange, Map as MapIcon, Pencil, Power, Route, Ticket, UserPlus, Users } from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/data/confirm-dialog';
import { Field, QueryState } from '@/components/data/states';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useInvalidate, useResource } from '@/lib/hooks';
import { fmt, LABELS, useLocale, useMessages } from '@/lib/i18n';
import type { Offer } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';
import { Callout, discountCents, fromCents, ModeIcon, SERVICE_ICON, toCents } from '../programs/product-bits';
import { offerMessages } from './messages';
import { dayOf, LiveBadge, offerCurrency, useDiscountLabel } from './offer-utils';

export function OfferDetail({ id }: { id: string }) {
  const q = useResource<Offer>(`/offers/${id}`);
  return (
    <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()}>
      {q.data && <OfferBody offer={q.data} />}
    </QueryState>
  );
}

function OfferBody({ offer: o }: { offer: Offer }) {
  const t = useMessages(offerMessages);
  const { locale } = useLocale();
  const { can } = useAuth();
  const f = useFormat();
  const discount = useDiscountLabel();
  const invalidate = useInvalidate();
  const [toggling, setToggling] = useState(false);

  const isBundle = o.kind === 'BUNDLE';
  const breakdown = isBundle && o.lines.every((l) => l.sellingPrice !== undefined);
  const grossCents = breakdown ? o.lines.reduce((s, l) => s + toCents(l.sellingPrice), 0) : null;
  const days = Math.round((new Date(dayOf(o.validTo)).getTime() - new Date(dayOf(o.validFrom)).getTime()) / 86_400_000) + 1;

  const actions: ReactNode[] = [];
  if (can('offers.manage'))
    actions.push(
      <Button key="edit" variant="secondary" asChild>
        <Link href={`/dashboard/offers/${o.id}/edit`}>
          <Pencil /> {t.edit}
        </Link>
      </Button>,
      <Button key="toggle" variant="secondary" onClick={() => setToggling(true)}>
        <Power className={o.isActive ? 'text-danger' : 'text-success'} /> {o.isActive ? t.deactivate : t.activate}
      </Button>,
    );
  if (isBundle && o.live && can('bookings.create'))
    actions.push(
      <Button key="book" asChild>
        <Link href={`/dashboard/bookings/new?offerId=${o.id}`}>
          <UserPlus /> {t.addCustomer}
        </Link>
      </Button>,
    );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={
          <Link href="/dashboard/offers" className="inline-flex items-center gap-1.5 hover:text-foreground">
            <ArrowLeft className="rtl-flip size-3.5" aria-hidden /> {t.back}
          </Link>
        }
        title={o.title}
        description={
          <span className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge kind="offerKind" status={o.kind} />
            <LiveBadge live={o.live} isActive={o.isActive} />
            <Badge tone={o.isActive ? 'success' : 'neutral'}>{o.isActive ? t.active : t.inactive}</Badge>
            <Badge tone={o.isPublic ? 'primary' : 'neutral'}>{o.isPublic ? t.publicOn : t.publicOff}</Badge>
          </span>
        }
        actions={actions.length ? actions : undefined}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        {/* summary */}
        <div className="flex flex-col gap-4">
          <Card tone="altitude" className="overflow-hidden p-0 text-white">
            {o.coverImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={o.coverImageUrl} alt="" className="aspect-[16/9] w-full object-cover opacity-95" />
            )}
            <div className="p-5">
              <div className="text-xs font-medium tracking-[0.16em] uppercase opacity-85">{isBundle ? t.price : t.discount}</div>
              <div className="num mt-3 text-[34px] leading-none font-medium tracking-tight">
                {isBundle && o.currencyCode ? f.money(o.pricePerPerson, o.currencyCode) : discount(o.discountMode, o.discountValue, offerCurrency(o))}
              </div>
              {isBundle && (
                <div className="num mt-2 text-xs opacity-85">
                  {t.discount}: {discount(o.discountMode, o.discountValue, offerCurrency(o))}
                  {o.costPerPerson !== undefined && o.currencyCode && ` · ${t.lineCost}: ${f.money(o.costPerPerson, o.currencyCode)}`}
                </div>
              )}
            </div>
          </Card>
          <Card className="p-5">
            <dl className="grid grid-cols-2 gap-4">
              <Field label={t.validity} className="col-span-2">
                <span className="num inline-flex items-center gap-2">
                  <CalendarRange className="size-4 text-subtle" aria-hidden />
                  {f.date(dayOf(o.validFrom), 'short')} — {f.date(dayOf(o.validTo), 'medium')}
                  <span className="text-xs font-normal whitespace-nowrap text-muted">· {fmt(t.days, { n: days })}</span>
                </span>
              </Field>
              <Field label={t.bookings}>
                <span className="num inline-flex items-center gap-1.5">
                  <Ticket className="size-4 text-subtle" aria-hidden />
                  {o._count.bookings}
                </span>
              </Field>
              {isBundle ? (
                <Field label={t.seats}>
                  <span className="num inline-flex items-center gap-1.5">
                    <Users className="size-4 text-subtle" aria-hidden />
                    {o.confirmedSeats} / {o.maxSeats ?? t.unlimited}
                  </span>
                </Field>
              ) : (
                <Field label={t.targets}>
                  <span className="num">{o.targets.length}</span>
                </Field>
              )}
            </dl>
            {o.description && <p className="mt-4 border-t border-border pt-4 text-[14px] leading-relaxed whitespace-pre-line text-muted">{o.description}</p>}
          </Card>
          <Callout tone="info" title={t.ofr03Title}>
            {t.ofr03Body}
          </Callout>
        </div>

        {/* lines or targets */}
        <div className="flex min-w-0 flex-col gap-6">
          {isBundle ? (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>{t.lines}</CardTitle>
                  <CardDescription>{t.linesHint}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2.5">
                  {o.lines.map((l, i) => {
                    const Icon = SERVICE_ICON[l.service.kind];
                    return (
                      <li key={l.id} className="flex flex-wrap items-center gap-4 rounded-[16px] border border-border bg-surface-raised p-3.5 shadow-card">
                        <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                          <Icon className="size-5" aria-hidden />
                          <span className="num absolute -end-1 -top-1 grid size-5 place-items-center rounded-full bg-ink text-[11px] font-semibold text-ink-foreground">{i + 1}</span>
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                            <span>{LABELS.serviceKind[l.service.kind][locale]}</span>
                            {l.item.company.transportMode && <ModeIcon mode={l.item.company.transportMode} className="size-3.5" />}
                            <span>· {l.item.company.name}</span>
                            {l.item.toCity && <span>· {l.item.toCity.nameAr}</span>}
                          </div>
                          <div className="mt-0.5 text-[14px] font-medium">{l.item.name}</div>
                        </div>
                        <div className="num text-[14px] text-muted">× {l.quantity}</div>
                        {l.sellingPrice !== undefined && o.currencyCode && (
                          <div className="min-w-[120px] text-end">
                            <div className="num text-[14px] font-semibold">{f.money(l.sellingPrice, o.currencyCode)}</div>
                            {l.costSnapshot !== undefined && (
                              <div className="num text-[12px] text-muted">
                                {t.lineCost} {f.money(l.costSnapshot, o.currencyCode)}
                                {l.profitMode && ` · ${l.profitMode === 'PERCENT' ? `${Number(l.profitValue)}%` : f.money(l.profitValue, o.currencyCode)}`}
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {grossCents !== null && o.currencyCode && (
                  <dl className="mt-4 ms-auto flex max-w-xs flex-col gap-2 border-t border-border pt-4 text-[14px]">
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">{t.gross}</dt>
                      <dd className="num">{f.money(fromCents(grossCents), o.currencyCode)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">{t.discountAmount}</dt>
                      <dd className="num">− {f.money(fromCents(discountCents(grossCents, o.discountMode, o.discountValue)), o.currencyCode)}</dd>
                    </div>
                    <div className="flex justify-between gap-3 font-semibold">
                      <dt>{t.net}</dt>
                      <dd className="num">{f.money(o.pricePerPerson, o.currencyCode)}</dd>
                    </div>
                  </dl>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>{t.targetsTitle}</CardTitle>
                  <CardDescription>{fmt(t.targetsCount, { n: o.targets.length })}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2.5">
                  {o.targets.map((tg) => {
                    const r = tg.trip ?? tg.program;
                    if (!r) return null;
                    const price = toCents(r.pricePerPerson);
                    const after = price - discountCents(price, o.discountMode, o.discountValue);
                    const href = tg.trip ? `/dashboard/trips/${r.id}` : `/dashboard/programs/${r.id}`;
                    const Icon = tg.trip ? Route : MapIcon;
                    return (
                      <li key={tg.id}>
                        <Link href={href} className="flex flex-wrap items-center gap-4 rounded-[16px] border border-border bg-surface-raised p-3.5 shadow-card transition-colors hover:border-primary/40">
                          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                            <Icon className="size-4" aria-hidden />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="num ltr-nums text-[12px] font-medium text-muted">{r.code}</span>
                              <StatusBadge kind="product" status={r.status} size="sm" />
                            </div>
                            <div className="mt-0.5 truncate text-[14px] font-medium">{r.title}</div>
                          </div>
                          <div className="text-end">
                            <div className="num text-[12px] text-muted line-through decoration-danger/60">{f.money(r.pricePerPerson, r.currencyCode)}</div>
                            <div className={cn('num text-sm font-semibold text-[color-mix(in_srgb,var(--success)_75%,var(--text))]')}>{f.money(fromCents(after), r.currencyCode)}</div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}
          {o.terms && (
            <Card className="p-5">
              <div className="mb-1.5 text-xs text-muted">{t.terms}</div>
              <p className="text-[14px] leading-relaxed whitespace-pre-line">{o.terms}</p>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={toggling}
        onOpenChange={setToggling}
        title={o.isActive ? t.deactivateTitle : t.activateTitle}
        description={o.isActive ? t.deactivateBody : undefined}
        destructive={o.isActive}
        confirmLabel={o.isActive ? t.deactivate : t.activate}
        onConfirm={async () => {
          try {
            await api.patch(`/offers/${o.id}/active`, { isActive: !o.isActive });
            await invalidate('/offers');
          } catch (e) {
            toast.error(errorMessage(e));
            throw e;
          }
        }}
      />
    </div>
  );
}
