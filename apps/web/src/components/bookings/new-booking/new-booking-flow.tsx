'use client';

import { AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, Eye, Plus, Printer, Tag, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Avatar } from '@/components/ui/avatar';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Textarea } from '@/components/ui/textarea';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fmt, LABELS, useLocale, useMessages } from '@/lib/i18n';
import { useCreateBooking, useTrip } from '@/lib/queries/bookings';
import { useCustomer } from '@/lib/queries/customers';
import type { BookableTrip, BookingDetail } from '@/lib/types/bookings';
import type { Customer } from '@/lib/types/customers';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';
import { estimateTotal, offerLabel } from '../estimate';
import { Forbidden, Ltr, Money, MoneyRow } from '../kit';
import { bm } from '../messages';
import { emptyPassenger, PassengersEditor, passengerValid, toPassengerInput, type PassengerDraft } from '../passengers-editor';
import { SwitchRow } from '../switch';
import { CustomerStep } from './customer-step';
import { SeatsMeter, TripPicker, TripSummaryLine } from './trip-step';

const AMOUNT = /^\d+(\.\d{1,2})?$/;

export function NewBookingFlow() {
  const { can } = useAuth();
  const t = useMessages(bm);
  const sp = useSearchParams();
  const [step, setStep] = useState(0);
  const [trip, setTrip] = useState<BookableTrip | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [passengers, setPassengers] = useState<PassengerDraft[]>(() => [emptyPassenger()]);
  const [showPaxErrors, setShowPaxErrors] = useState(false);
  const [confirmNow, setConfirmNow] = useState(true);
  const [waitlistIfFull, setWaitlistIfFull] = useState(false);
  const [payment, setPayment] = useState('');
  const [notes, setNotes] = useState('');
  const [created, setCreated] = useState<BookingDetail | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const create = useCreateBooking();

  // ?tripId= / ?customerId= prefill
  const preTrip = useTrip(sp.get('tripId'));
  const preCustomer = useCustomer(sp.get('customerId'));
  useEffect(() => {
    if (preTrip.data && preTrip.data.status === 'OPEN' && !trip) {
      setTrip(preTrip.data);
      setStep((s) => Math.max(s, 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preTrip.data]);
  useEffect(() => {
    if (preCustomer.data && !customer) setCustomer(preCustomer.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preCustomer.data]);

  const est = useMemo(() => (trip ? estimateTotal(trip.sellingPricePerPerson, passengers.length, trip.activeOffer) : null), [trip, passengers.length]);

  if (!can('bookings.create')) return <Forbidden />;

  const reset = () => {
    setStep(0);
    setTrip(null);
    setCustomer(null);
    setPassengers([emptyPassenger()]);
    setShowPaxErrors(false);
    setConfirmNow(true);
    setWaitlistIfFull(false);
    setPayment('');
    setNotes('');
    setCreated(null);
    setServerError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (created) return <CreatedView booking={created} onAnother={reset} />;

  const steps = [t.stepTrip, t.stepCustomer, t.stepPassengers, t.stepReview];
  const canReach = (i: number) => i === 0 || (i >= 1 && !!trip && (i < 2 || (!!customer && (i < 3 || passengers.every(passengerValid)))));

  const paymentError =
    payment && !AMOUNT.test(payment.trim())
      ? t.vAmount
      : payment && Number(payment) <= 0
        ? t.vAmountPos
        : payment && est && Number(payment) > est.total
          ? fmt(t.vAmountMax, { max: est.total })
          : undefined;

  const submit = async () => {
    if (!trip || !customer) return;
    setServerError(null);
    try {
      const b = await create.mutateAsync({
        tripId: trip.id,
        customerId: customer.id,
        passengers: passengers.map(toPassengerInput),
        notes: notes.trim() || undefined,
        confirm: confirmNow || undefined,
        waitlistIfFull: confirmNow && waitlistIfFull ? true : undefined,
        payment: payment.trim() ? { amount: payment.trim() } : undefined,
      });
      toast.success(t.createdTitle, { description: b.reference });
      setCreated(b);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const msg = errorMessage(err);
      setServerError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={t.newEyebrow}
        title={
          <>
            {t.newTitleA} <strong>{t.newTitleB}</strong>
          </>
        }
        description={t.newDescription}
        actions={
          <Button asChild variant="ghost">
            <Link href="/dashboard/bookings">
              <ArrowLeft className="rtl-flip" /> {t.title}
            </Link>
          </Button>
        }
      />

      <Stepper steps={steps} current={step} canReach={canReach} onGo={setStep} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section key={step} className="grid min-w-0 animate-rise gap-5" aria-labelledby="step-title">
          <div>
            <p className="eyebrow text-muted">{fmt(t.stepN, { n: step + 1 })}</p>
            <h2 id="step-title" className="mt-1 font-display text-2xl font-light">
              {steps[step]}
            </h2>
          </div>

          {step === 0 && (
            <TripPicker
              selectedId={trip?.id}
              onSelect={(x) => {
                setTrip(x);
                setStep(1);
              }}
            />
          )}

          {step === 1 && (
            <>
              {customer && <SelectedCustomer c={customer} onChange={() => setCustomer(null)} onContinue={() => setStep(2)} />}
              {!customer && (
                <CustomerStep
                  selected={customer}
                  onSelect={(c) => {
                    setCustomer(c);
                    setStep(2);
                  }}
                />
              )}
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-muted">{t.passengersHint}</p>
              <PassengersEditor value={passengers} onChange={setPassengers} showErrors={showPaxErrors} customer={customer} />
              <StepNav
                onBack={() => setStep(1)}
                onNext={() => {
                  if (!passengers.every(passengerValid)) {
                    setShowPaxErrors(true);
                    toast.error(t.vPassengers);
                    return;
                  }
                  setStep(3);
                }}
              />
            </>
          )}

          {step === 3 && trip && customer && est && (
            <div className="grid gap-5">
              <Card tone="raised" className="grid gap-5 p-5">
                <SwitchRow checked={confirmNow} onChange={setConfirmNow} label={t.confirmNow} hint={t.confirmNowHint} />
                {confirmNow && passengers.length > trip.seatsAvailable && (
                  <div className="flex items-start gap-2 rounded-tile border border-warning/30 bg-warning/10 p-3 text-sm">
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
                    <span>{fmt(t.notEnoughSeats, { left: Math.max(0, trip.seatsAvailable), n: passengers.length })}</span>
                  </div>
                )}
                {confirmNow && <SwitchRow checked={waitlistIfFull} onChange={setWaitlistIfFull} label={t.waitlistIfFull} />}
              </Card>

              {can('payments.record') && (
                <FormField label={t.firstPayment} hint={fmt(t.firstPaymentHint, { cur: trip.currencyCode })} error={paymentError}>
                  <div className="relative">
                    <Input
                      dir="ltr"
                      inputMode="decimal"
                      placeholder="0"
                      value={payment}
                      onChange={(e) => setPayment(e.target.value.replace(/[^\d.]/g, ''))}
                      className="num pe-16 text-start"
                    />
                    <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-muted">
                      {trip.currencyCode}
                    </span>
                  </div>
                </FormField>
              )}

              <FormField label={t.bookingNotes}>
                <Textarea rows={2} className="min-h-16" maxLength={3000} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </FormField>

              {serverError && (
                <div role="alert" className="flex items-start gap-2 rounded-tile border border-danger/30 bg-danger/8 p-3 text-sm text-danger">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span dir="auto">{serverError}</span>
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  <ArrowLeft className="rtl-flip" /> {t.back}
                </Button>
                <Button size="lg" loading={create.isPending} disabled={!!paymentError} onClick={submit}>
                  <Check /> {confirmNow ? t.submitConfirm : t.submit}
                </Button>
              </div>
            </div>
          )}
        </section>

        <SummaryAside trip={trip} customer={customer} passengers={passengers} confirmNow={confirmNow} onEditTrip={() => setStep(0)} onEditCustomer={() => setStep(1)} />
      </div>
    </div>
  );
}

function Stepper({ steps, current, canReach, onGo }: { steps: string[]; current: number; canReach: (i: number) => boolean; onGo: (i: number) => void }) {
  return (
    <ol className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none sm:gap-2">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        const reachable = canReach(i);
        return (
          <li key={label} className="flex shrink-0 items-center gap-1 sm:gap-2">
            <button
              type="button"
              disabled={!reachable || active}
              onClick={() => onGo(i)}
              aria-current={active ? 'step' : undefined}
              className={cn(
                'flex h-9 items-center gap-2 rounded-full border px-3 text-[13px] font-medium transition-colors',
                active && 'border-ink bg-ink text-ink-foreground',
                !active && done && 'border-border bg-surface-raised text-foreground hover:border-border-strong',
                !active && !done && 'border-transparent text-muted',
                'disabled:cursor-default',
              )}
            >
              <span
                className={cn(
                  'num grid size-5 place-items-center rounded-full text-[11px]',
                  active ? 'bg-ink-foreground text-ink' : done ? 'bg-primary text-primary-foreground' : 'bg-surface-sunken text-muted',
                )}
              >
                {done ? <Check className="size-3" /> : i + 1}
              </span>
              <span className={cn(!active && 'hidden sm:inline')}>{label}</span>
            </button>
            {i < steps.length - 1 && <span aria-hidden className="h-px w-4 bg-border-strong sm:w-8" />}
          </li>
        );
      })}
    </ol>
  );
}

function StepNav({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const t = useMessages(bm);
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="rtl-flip" /> {t.back}
      </Button>
      <Button size="lg" onClick={onNext}>
        {t.continue} <ArrowRight className="rtl-flip" />
      </Button>
    </div>
  );
}

function SelectedCustomer({ c, onChange, onContinue }: { c: Customer; onChange: () => void; onContinue: () => void }) {
  const t = useMessages(bm);
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-card border border-primary bg-surface-raised p-4 shadow-card ring-4 ring-primary/15">
        <Avatar name={c.fullName} />
        <div className="min-w-0 flex-1">
          <div className="font-medium">{c.fullName}</div>
          <Ltr className="num text-sm text-muted">{c.phone}</Ltr>
        </div>
        <Button variant="secondary" size="sm" onClick={onChange}>
          {t.change}
        </Button>
      </div>
      <p className="text-xs text-muted">{t.customerNote}</p>
      <div className="flex justify-end">
        <Button size="lg" onClick={onContinue} autoFocus>
          {t.continue} <ArrowRight className="rtl-flip" />
        </Button>
      </div>
    </div>
  );
}

function SummaryAside({
  trip,
  customer,
  passengers,
  confirmNow,
  onEditTrip,
  onEditCustomer,
}: {
  trip: BookableTrip | null;
  customer: Customer | null;
  passengers: PassengerDraft[];
  confirmNow: boolean;
  onEditTrip: () => void;
  onEditCustomer: () => void;
}) {
  const t = useMessages(bm);
  const f = useFormat();
  const n = passengers.length;
  const est = trip ? estimateTotal(trip.sellingPricePerPerson, n, trip.activeOffer) : null;
  const seatsAfter = trip ? trip.seatsAvailable - n : 0;

  return (
    <aside className="lg:sticky lg:top-6">
      <Card tone="raised" className="grid gap-4 p-5">
        <h2 className="font-display text-[15px] tracking-[0.14em] uppercase">{t.summary}</h2>

        <SummaryBlock label={t.trip} onEdit={trip ? onEditTrip : undefined}>
          {trip ? (
            <div className="grid gap-1.5">
              <div className="flex items-center gap-2">
                <Ltr className="num text-xs text-muted">{trip.code}</Ltr>
                <StatusBadge kind="tripType" status={trip.tripType} size="sm" />
              </div>
              <div className="font-medium">{trip.tour.name}</div>
              <TripSummaryLine trip={trip} />
              <SeatsMeter trip={trip} className="mt-1" />
            </div>
          ) : (
            <span className="text-sm text-subtle">—</span>
          )}
        </SummaryBlock>

        <SummaryBlock label={t.customer} onEdit={customer ? onEditCustomer : undefined}>
          {customer ? (
            <div>
              <div className="font-medium">{customer.fullName}</div>
              <Ltr className="num text-xs text-muted">{customer.phone}</Ltr>
            </div>
          ) : (
            <span className="text-sm text-subtle">—</span>
          )}
        </SummaryBlock>

        <SummaryBlock label={t.passengers}>
          <span className="flex items-center gap-2 text-sm">
            <Users className="size-4 text-muted" aria-hidden />
            <span className="num font-medium">{f.number(n)}</span>
          </span>
        </SummaryBlock>

        {trip && est && (
          <div className="grid gap-0.5 border-t border-border pt-3">
            <MoneyRow label={fmt(t.unitPriceXn, { price: f.money(est.unit, trip.currencyCode), n: f.number(n) })} value={est.subtotal} currency={trip.currencyCode} />
            {trip.activeOffer && (
              <div className="flex items-baseline justify-between gap-4 py-1.5">
                <span className="flex items-center gap-1.5 text-sm text-muted">
                  <Tag className="size-3.5" aria-hidden /> {trip.activeOffer.title}{' '}
                  <span className="num text-xs">{offerLabel(trip.activeOffer, f.money, trip.currencyCode, t.perPerson)}</span>
                </span>
                <Money value={-est.discount} currency={trip.currencyCode} className="text-sm" />
              </div>
            )}
            <MoneyRow label={t.estTotal} value={est.total} currency={trip.currencyCode} strong />
            <p className="text-xs text-muted">{t.estimate}</p>
            {confirmNow && (
              <div className="mt-2 flex items-center justify-between rounded-tile bg-surface px-3 py-2 text-sm">
                <span className="text-muted">{t.seatsAfter}</span>
                <span className={cn('num font-medium', seatsAfter < 0 && 'text-danger')}>{f.number(seatsAfter)}</span>
              </div>
            )}
          </div>
        )}
      </Card>
    </aside>
  );
}

function SummaryBlock({ label, onEdit, children }: { label: string; onEdit?: () => void; children: React.ReactNode }) {
  const t = useMessages(bm);
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between">
        <span className="eyebrow text-[11px] text-muted">{label}</span>
        {onEdit && (
          <button type="button" onClick={onEdit} className="text-xs font-medium text-primary hover:underline">
            {t.change}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function CreatedView({ booking: b, onAnother }: { booking: BookingDetail; onAnother: () => void }) {
  const t = useMessages(bm);
  const f = useFormat();
  const { locale } = useLocale();
  const router = useRouter();
  return (
    <div className="mx-auto grid w-full max-w-2xl animate-rise gap-6 py-4">
      <div className="grid justify-items-center gap-3 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-success/14 text-success ring-8 ring-success/8">
          <CheckCircle2 className="size-8" />
        </span>
        <h1 className="font-display text-3xl font-light">{t.createdTitle}</h1>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Ltr className="num rounded-full bg-surface-raised px-3 py-1 text-lg font-medium shadow-card">{b.reference}</Ltr>
          <StatusBadge kind="booking" status={b.status} />
        </div>
        <p className="text-sm text-muted">{t.createdBody}</p>
      </div>

      <Card tone="raised" className="grid gap-4 p-5">
        <div className="grid gap-1 text-sm">
          <div className="font-medium">
            <Ltr className="num">{b.trip.code}</Ltr> · {b.trip.tour.name}
          </div>
          <div className="text-muted">
            {f.date(b.trip.departureDate)} – {f.date(b.trip.returnDate)} · {LABELS.tripType[b.trip.tripType][locale]}
          </div>
          <div className="text-muted">
            {b.customer.fullName} · {fmt(t.paxN, { n: f.number(b.passengerCount) })}
          </div>
        </div>
        <div className="grid gap-0.5 border-t border-border pt-3">
          <MoneyRow label={fmt(t.unitPriceXn, { price: f.money(b.unitPrice, b.currencyCode), n: f.number(b.passengerCount) })} value={b.subtotal} currency={b.currencyCode} />
          {Number(b.discountAmount) > 0 && <MoneyRow label={`${t.discount}${b.offerTitle ? ` · ${b.offerTitle}` : ''}`} value={`-${b.discountAmount}`} currency={b.currencyCode} />}
          <MoneyRow label={t.total} value={b.totalAmount} currency={b.currencyCode} strong />
          <MoneyRow label={t.paid} value={b.paidAmount} currency={b.currencyCode} tone="muted" />
          <MoneyRow label={t.balance} value={b.balance} currency={b.currencyCode} tone={Number(b.balance) > 0 ? 'danger' : undefined} strong />
        </div>
        {b.payments[0] && (
          <Badge tone="success" className="justify-self-start">
            {t.receipt} <Ltr className="num">{b.payments[0].receiptNumber}</Ltr>
          </Badge>
        )}
      </Card>

      <div className="flex flex-wrap justify-center gap-2">
        <Button size="lg" onClick={() => router.push(`/dashboard/bookings/${b.id}`)}>
          <Eye /> {t.viewBooking}
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href={`/dashboard/bookings/${b.id}/print`} target="_blank">
            <Printer /> {t.printConfirmation}
          </Link>
        </Button>
        <Button size="lg" variant="ghost" onClick={onAnother}>
          <Plus /> {t.another}
        </Button>
      </div>
    </div>
  );
}
