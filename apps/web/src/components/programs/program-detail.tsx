'use client';

/*
 * Program detail (PGM-*): header with lifecycle actions by status and permission, KPI strip,
 * itinerary chain, services, BR-15 boarding explanation, passengers (PGM-09) and decisions.
 */
import type { DecisionType, ProfitMode } from '@travelos/shared';
import {
  ArrowLeft,
  CalendarClock,
  CalendarRange,
  Eye,
  EyeOff,
  Gavel,
  Lock,
  MapPin,
  Pencil,
  Percent,
  Rocket,
  Ticket,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/data/confirm-dialog';
import { Field, QueryState } from '@/components/data/states';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useInvalidate, useName, useResource } from '@/lib/hooks';
import { fmt, LABELS, useLocale, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import type { Decision, Program } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';
import { programMessages } from './messages';
import { ApiErrors, Callout, fromLocalInput, ServiceChips } from './product-bits';
import { ProgramItinerary } from './program-itinerary';
import { ProgramPassengers } from './program-passengers';
import { daysBetween } from './program-utils';

interface ProgramDetailData extends Program {
  decisions: Decision[];
  offerTargets: { offer: { id: string; title: string; discountMode: ProfitMode; discountValue: string; validFrom: string; validTo: string; isActive: boolean } }[];
}

export function ProgramDetail({ id }: { id: string }) {
  const q = useResource<ProgramDetailData>(`/programs/${id}`);
  return (
    <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()}>
      {q.data && <ProgramDetailBody program={q.data} />}
    </QueryState>
  );
}

function ProgramDetailBody({ program: p }: { program: ProgramDetailData }) {
  const t = useMessages(programMessages);
  const { locale, dir } = useLocale();
  const { can, canAny } = useAuth();
  const name = useName();
  const f = useFormat();
  const invalidate = useInvalidate();

  const [confirm, setConfirm] = useState<'publish' | 'close' | 'cancel' | null>(null);
  const [deciding, setDeciding] = useState(false);
  const [publishError, setPublishError] = useState<unknown>(null);
  const [publicBusy, setPublicBusy] = useState(false);

  const refresh = () => invalidate('/programs', '/trips');
  const manage = can('programs.manage');
  const live = p.status !== 'CANCELLED' && p.status !== 'COMPLETED';
  const first = p.legs[0]?.trip;
  const days = daysBetween(p.startsAt, p.endsAt);
  const belowMin = p.confirmedSeats < p.minPassengers;

  const togglePublic = async () => {
    setPublicBusy(true);
    try {
      await api.patch(`/programs/${p.id}/public`, { isPublic: !p.isPublic });
      toast.success(p.isPublic ? t.publicOff : t.publicOn);
      await refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setPublicBusy(false);
    }
  };

  const actions: ReactNode[] = [];
  if (manage && live)
    actions.push(
      <Button key="edit" variant="secondary" asChild>
        <Link href={`/dashboard/programs/${p.id}/edit`}>
          <Pencil /> {t.edit}
        </Link>
      </Button>,
    );
  if (manage && live)
    actions.push(
      <Button key="public" variant="secondary" onClick={togglePublic} loading={publicBusy}>
        {!publicBusy && (p.isPublic ? <EyeOff /> : <Eye />)} {p.isPublic ? t.makePrivate : t.makePublic}
      </Button>,
    );
  if (manage && p.status === 'DRAFT')
    actions.push(
      <Button key="publish" onClick={() => setConfirm('publish')}>
        <Rocket /> {t.publish}
      </Button>,
    );
  if (can('trips.close') && p.status === 'OPEN')
    actions.push(
      <Button key="close" variant="secondary" onClick={() => setConfirm('close')}>
        <Lock /> {t.closeNow}
      </Button>,
    );
  if (can('trips.close') && p.status === 'CLOSED')
    actions.push(
      <Button key="decide" variant="ink" onClick={() => setDeciding(true)}>
        <Gavel /> {t.decide}
      </Button>,
    );
  if (can('trips.cancel') && live)
    actions.push(
      <Button key="cancel" variant="ghost" className="text-danger hover:text-danger" onClick={() => setConfirm('cancel')}>
        <XCircle /> {t.cancel}
      </Button>,
    );
  if (can('bookings.create') && p.status === 'OPEN')
    actions.push(
      <Button key="book" asChild>
        <Link href={`/dashboard/bookings/new?programId=${p.id}`}>
          <UserPlus /> {t.addCustomer}
        </Link>
      </Button>,
    );

  const showPassengers = canAny('trips.passengers', 'bookings.view');

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={
          <Link href="/dashboard/programs" className="inline-flex items-center gap-1.5 hover:text-foreground">
            <ArrowLeft className="rtl-flip size-3.5" aria-hidden /> {t.back} · <span className="num ltr-nums">{p.code}</span>
          </Link>
        }
        title={p.title}
        description={
          <span className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge kind="product" status={p.status} />
            <StatusBadge kind="scope" status={p.scope} />
            <Badge tone="neutral">{name(p.category)}</Badge>
            <Badge tone="neutral">{p.branch?.name ?? t.shared}</Badge>
            <Badge tone={p.isPublic ? 'primary' : 'neutral'}>{p.isPublic ? t.publicOn : t.publicOff}</Badge>
          </span>
        }
        actions={actions.length ? actions : undefined}
      />

      {publishError ? (
        <div>
          <ApiErrors error={publishError} />
        </div>
      ) : null}

      {p.closedAt && p.finalPassengerCount !== null && (
        <Callout tone="warning" title={fmt(t.closedAt, { n: p.finalPassengerCount, date: f.date(p.closedAt, 'dateTime') })}>
          {p.closureReason && fmt(t.closedBy, { reason: LABELS.closureReason[p.closureReason][locale] })}
        </Callout>
      )}
      {p.status === 'CANCELLED' && p.cancelReason && <Callout tone="danger" title={fmt(t.cancelledReason, { reason: p.cancelReason })} />}

      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card tone="altitude" className="flex flex-col justify-between gap-5 p-5 text-white">
          <span className="text-xs font-medium tracking-[0.16em] uppercase opacity-85">{t.price}</span>
          <div>
            <div className="num text-[30px] leading-none font-medium tracking-tight">{f.money(p.pricePerPerson, p.currencyCode)}</div>
            {p.costPerPerson !== undefined && (
              <div className="num mt-2 text-xs opacity-85">
                {t.cost}: {f.money(p.costPerPerson, p.currencyCode)}
              </div>
            )}
          </div>
        </Card>
        <Kpi icon={Users} label={t.seats}>
          <div className="flex items-baseline gap-2">
            <span className="num text-[30px] leading-none font-medium">{p.confirmedSeats}</span>
            <span className="text-xs text-muted">{t.confirmed}</span>
            <span className="text-subtle">/</span>
            <span className={cn('num text-xl font-medium', p.availableSeats === 0 && 'text-danger')}>{p.availableSeats}</span>
            <span className="text-xs text-muted">{t.available}</span>
          </div>
          <SeatBar confirmed={p.confirmedSeats} max={p.maxPassengers} min={p.minPassengers} />
          {belowMin && live && <div className="mt-1.5 text-[12px] text-warning">{fmt(t.belowMin, { min: p.minPassengers })}</div>}
        </Kpi>
        <Kpi icon={CalendarClock} label={t.deadline}>
          <div className="num text-base font-medium">{f.date(p.registrationDeadline, 'dateTime')}</div>
          <div className="mt-1 text-xs text-muted">{f.relative(p.registrationDeadline)}</div>
        </Kpi>
        <Kpi icon={CalendarRange} label={t.dates}>
          <div className="num text-base font-medium">
            {f.date(p.startsAt, 'short')} — {f.date(p.endsAt, 'short')}
          </div>
          <div className="mt-1 text-xs text-muted">
            {fmt(t.legsCount, { n: p.legs.length })}
            {days ? ` · ${fmt(t.daysN, { n: days })}` : ''}
          </div>
        </Kpi>
      </div>

      <Tabs defaultValue="overview" dir={dir}>
        <TabsList>
          <TabsTrigger value="overview">{t.overview}</TabsTrigger>
          {showPassengers && <TabsTrigger value="passengers">{t.passengers}</TabsTrigger>}
          <TabsTrigger value="decisions">
            {t.decisions}
            {p.decisions.length > 0 && <span className="num text-[12px] opacity-70">({p.decisions.length})</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{t.itinerary}</CardTitle>
                <CardDescription>{t.itineraryHint}</CardDescription>
              </div>
              {p.services.length > 0 && <ServiceChips kinds={p.services} />}
            </CardHeader>
            <CardContent>
              <ProgramItinerary program={p} />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader>
                <CardTitle>{t.basics}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                {p.description && <p className="text-sm leading-relaxed whitespace-pre-line text-muted">{p.description}</p>}
                <dl className="grid gap-4 sm:grid-cols-3">
                  <Field label={t.category}>{name(p.category)}</Field>
                  <Field label={t.branch}>{p.branch?.name ?? t.shared}</Field>
                  <Field label={t.minMax}>
                    <span className="num">
                      {p.minPassengers} / {p.maxPassengers}
                    </span>
                  </Field>
                  <Field label={t.bookings}>
                    <span className="num">{p._count.bookings}</span>
                  </Field>
                  <Field label={t.currency}>
                    <span className="num ltr-nums">{p.currencyCode}</span>
                  </Field>
                  <Field label={t.services}>{p.services.map((s) => LABELS.serviceKind[s][locale]).join('، ')}</Field>
                </dl>
                {p.offerTargets.length > 0 && (
                  <div>
                    <div className="mb-2 text-xs text-muted">{t.offers}</div>
                    <div className="flex flex-wrap gap-2">
                      {p.offerTargets.map(({ offer }) => (
                        <Link key={offer.id} href={`/dashboard/offers/${offer.id}`}>
                          <Badge tone={offer.isActive ? 'primary' : 'neutral'} className="hover:ring-primary/50">
                            <Percent className="size-3" aria-hidden />
                            {offer.title} ·{' '}
                            <span className="num">{offer.discountMode === 'PERCENT' ? `${Number(offer.discountValue)}%` : f.money(offer.discountValue, p.currencyCode)}</span>
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {p.terms && (
                  <div>
                    <div className="mb-1.5 text-xs text-muted">{t.terms_}</div>
                    <p className="text-[14px] leading-relaxed whitespace-pre-line">{p.terms}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>{t.br15Title}</CardTitle>
                  <CardDescription>{t.br15Body}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-2 text-xs text-muted">{t.pickups}</div>
                {first && first.pickupPoints.length ? (
                  <ul className="flex flex-col divide-y divide-border">
                    {first.pickupPoints.map((pp) => (
                      <li key={pp.id} className="flex items-center justify-between gap-3 py-2.5 text-[14px]">
                        <span className="inline-flex items-center gap-2">
                          <MapPin className="size-3.5 text-subtle" aria-hidden />
                          <span className="font-medium">{name(pp.city)}</span>
                          {pp.pickupTime && <span className="num ltr-nums text-muted">{pp.pickupTime}</span>}
                        </span>
                        <span className="num font-medium">
                          {Number(pp.surcharge) > 0 ? `+ ${f.money(pp.surcharge, first.currencyCode)}` : <span className="text-muted">{t.noSurcharge}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[14px] text-muted">{fmt(t.noPickups, { city: first ? name(first.originCity) : '—' })}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {showPassengers && (
          <TabsContent value="passengers">
            <ProgramPassengers programId={p.id} />
          </TabsContent>
        )}

        <TabsContent value="decisions">
          <Card className="p-4 sm:p-5">
            {p.decisions.length ? (
              <ol className="flex flex-col">
                {p.decisions.map((d, i) => (
                  <li key={d.id} className="relative flex gap-4 pb-5 last:pb-0">
                    {i < p.decisions.length - 1 && <span className="absolute start-[15px] top-9 bottom-0 w-px bg-border" aria-hidden />}
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-ink-foreground">
                      <Gavel className="size-3.5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1 pt-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{LABELS.decisionType[d.decision][locale]}</span>
                        <span className="num text-xs text-muted">{f.date(d.createdAt, 'dateTime')}</span>
                        <span className="text-xs text-muted">{fmt(t.decisionBy, { name: d.decidedBy.fullName })}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-muted">
                        <span className="num">{fmt(t.passengersAt, { n: d.passengersAtTime })}</span>
                        {d.newDeadline && <span className="num">{fmt(t.deadlineChange, { from: f.date(d.previousDeadline, 'short'), to: f.date(d.newDeadline, 'short') })}</span>}
                      </div>
                      {d.note && <p className="mt-1.5 text-[14px]">{d.note}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState size="sm" icon={Ticket} title={t.noDecisions} description={t.noDecisionsBody} />
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirm === 'publish'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={t.publishTitle}
        description={t.publishBody}
        confirmLabel={t.publish}
        onConfirm={async () => {
          setPublishError(null);
          try {
            await api.post(`/programs/${p.id}/publish`);
            toast.success(t.published);
            await refresh();
          } catch (e) {
            setPublishError(e);
            toast.error(t.publishErrors);
          }
        }}
      />
      <ConfirmDialog
        open={confirm === 'close'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={t.closeTitle}
        description={t.closeBody}
        confirmLabel={t.closeNow}
        onConfirm={async () => {
          try {
            await api.post(`/programs/${p.id}/close`);
            toast.success(t.closed_);
            await refresh();
          } catch (e) {
            toast.error(errorMessage(e));
            throw e;
          }
        }}
      />
      <ConfirmDialog
        open={confirm === 'cancel'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={t.cancelTitle}
        description={t.cancelBody}
        confirmLabel={t.cancel}
        destructive
        reason
        reasonLabel={t.cancelReason}
        onConfirm={async (reason) => {
          try {
            await api.post(`/programs/${p.id}/cancel`, { reason });
            toast.success(t.cancelled);
            await refresh();
          } catch (e) {
            toast.error(errorMessage(e));
            throw e;
          }
        }}
      />
      {deciding && <DecisionDialog program={p} onClose={() => setDeciding(false)} onDone={refresh} />}
    </div>
  );
}

function Kpi({ icon: Icon, label, children }: { icon: typeof Users; label: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col justify-between gap-4 p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium tracking-[0.16em] text-muted uppercase">{label}</span>
        <span className="grid size-8 place-items-center rounded-full bg-surface-raised">
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <div>{children}</div>
    </Card>
  );
}

function SeatBar({ confirmed, max, min }: { confirmed: number; max: number; min: number }) {
  const pct = max ? Math.min(100, (confirmed / max) * 100) : 0;
  const minPct = max ? Math.min(100, (min / max) * 100) : 0;
  return (
    <div className="relative mt-3 h-1.5 rounded-full bg-surface-sunken" aria-hidden>
      <div className={cn('absolute inset-y-0 start-0 rounded-full', confirmed >= min ? 'bg-success' : 'bg-primary')} style={{ width: `${pct}%` }} />
      <span className="absolute -top-1 h-3.5 w-0.5 rounded-full bg-ink/60" style={{ insetInlineStart: `${minPct}%` }} />
    </div>
  );
}

function DecisionDialog({ program: p, onClose, onDone }: { program: ProgramDetailData; onClose: () => void; onDone: () => Promise<unknown> }) {
  const t = useMessages(programMessages);
  const c = useMessages(common);
  const { locale } = useLocale();
  const { can } = useAuth();
  const [decision, setDecision] = useState<DecisionType>('CONFIRM');
  const [deadline, setDeadline] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const options: DecisionType[] = ['CONFIRM', 'EXTEND', ...(can('trips.cancel') ? (['REOPEN', 'CANCEL'] as const) : [])];
  const needsDeadline = decision === 'EXTEND' || decision === 'REOPEN';
  const blocked = (needsDeadline && !deadline) || (decision === 'CANCEL' && note.trim().length < 3);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/programs/${p.id}/decision`, {
        decision,
        newDeadline: needsDeadline ? fromLocalInput(deadline) : undefined,
        note: note.trim() || undefined,
      });
      toast.success(t.decided);
      await onDone();
      onClose();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.decideTitle}</DialogTitle>
          <DialogDescription>{fmt(t.decideBody, { n: p.confirmedSeats, min: p.minPassengers })}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div role="radiogroup" aria-label={t.decision} className="grid grid-cols-2 gap-2">
            {options.map((o) => (
              <button
                key={o}
                type="button"
                role="radio"
                aria-checked={decision === o}
                onClick={() => setDecision(o)}
                className={cn(
                  'rounded-[14px] border px-3 py-2.5 text-start text-sm font-medium transition-colors',
                  decision === o
                    ? o === 'CANCEL'
                      ? 'border-danger bg-danger/8 text-danger'
                      : 'border-ink bg-ink text-ink-foreground'
                    : 'border-border bg-surface-raised hover:border-border-strong',
                )}
              >
                {LABELS.decisionType[o][locale]}
              </button>
            ))}
          </div>
          {needsDeadline && (
            <FormField label={t.newDeadline} hint={t.newDeadlineHint} required>
              <Input type="datetime-local" dir="ltr" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </FormField>
          )}
          <FormField label={decision === 'CANCEL' ? t.cancelReason : t.note} required={decision === 'CANCEL'}>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          </FormField>
          {error ? <ApiErrors error={error} /> : null}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {c.cancel}
          </Button>
          <Button variant={decision === 'CANCEL' ? 'destructive' : 'primary'} onClick={submit} disabled={blocked} loading={busy}>
            {c.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
