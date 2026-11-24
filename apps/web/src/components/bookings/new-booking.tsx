'use client';

import { AlertTriangle, ArrowRight, CalendarClock, Globe2, Layers, Loader2, Map, Package, Users, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { PageHeader } from '@/components/ui/page-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useList, useLookups, useName, useResource } from '@/lib/hooks';
import { defineMessages, fmt, useLocale, useMessages } from '@/lib/i18n';
import type { BookingDetail, Customer, Offer, Program, TripDetail, TripListItem } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';
import { CustomerSearch, PassengerList, type PickedCustomer, type PickedPassenger } from './passenger-picker';
import { MoneyRow } from './parts';

const m = defineMessages({
  ar: {
    eyebrow: 'الحجوزات',
    title: 'إضافة عميل',
    description: 'اختر ما سيُحجز، ثم الركاب والدافع ونقطة الانطلاق. يُنشأ الحجز «قيد الانتظار» ويأخذ المقاعد عند التأكيد.',
    back: 'الحجوزات',
    step1: 'ما الذي سيُحجز؟',
    step2: 'الركاب والدافع',
    step3: 'نقطة الانطلاق',
    step4: 'ملاحظات وإنهاء',
    trip: 'رحلة',
    program: 'برنامج',
    offer: 'عرض حزمة',
    noOpen: 'لا يوجد ما يمكن حجزه الآن.',
    change: 'تغيير',
    price: 'السعر للشخص',
    seatsLeft: 'مقاعد متبقية',
    seats: '{n} مقعد',
    unlimited: 'غير محدود',
    deadline: 'آخر موعد للتسجيل',
    validTo: 'العرض ساري حتى',
    departs: 'الانطلاق',
    international: 'رحلة خارجية: يلزم جواز سفر ساري 6 أشهر بعد العودة، ويُفتح ملف تأشيرة لكل راكب تلقائياً.',
    domestic: 'رحلة داخلية: هوية سورية سارية (أو جواز سفر)، والأجنبي يحتاج جوازاً مع تأشيرة أو إقامة سورية.',
    payerOther: 'الدافع شخص آخر لا يسافر',
    payer: 'الدافع',
    payerHint: 'الدافع هو من يُكتب اسمه على الوصولات. قد لا يكون مسافراً.',
    choosePayer: 'اختر الدافع',
    noPickup: 'هذه الرحلة لا تملك نقاط انطلاق بديلة.',
    mainPickup: 'نقطة الانطلاق الأساسية (بدون إضافة)',
    surcharge: 'إضافة {v} للشخص',
    notes: 'ملاحظات',
    branch: 'الفرع المسجِّل',
    branchHint: 'هذا المنتج مشترك بين الفروع؛ اختر الفرع الذي يُسجَّل الحجز باسمه.',
    override: 'قبول بعد انتهاء المهلة',
    overrideHint: 'استثناء لمدير المكتب فقط ويُسجَّل في سجل التدقيق (BKG-06).',
    summary: 'الملخص',
    passengers: 'عدد الركاب',
    perPerson: 'سعر الشخص',
    pickupExtra: 'إضافة نقطة الانطلاق',
    estimate: 'الإجمالي التقديري',
    discountNote: 'يُطبّق أفضل خصم ساري تلقائياً عند الحفظ.',
    submit: 'إنشاء الحجز',
    missingTarget: 'اختر رحلة أو برنامجاً أو عرضاً',
    missingPassengers: 'أضف راكباً واحداً على الأقل',
    missingPayer: 'اختر الدافع',
    missingBranch: 'اختر الفرع',
    created: 'تم إنشاء الحجز {no}',
    warnings: 'تنبيهات الوثائق: أكمِلها قبل التأكيد',
    deadlinePassed: 'انتهت مهلة التسجيل',
  },
  en: {
    eyebrow: 'Bookings',
    title: 'Add customer',
    description: 'Pick what is booked, then the passengers, payer and boarding point. The booking starts pending and takes seats when confirmed.',
    back: 'Bookings',
    step1: 'What is booked?',
    step2: 'Passengers and payer',
    step3: 'Boarding point',
    step4: 'Notes and finish',
    trip: 'Trip',
    program: 'Program',
    offer: 'Bundle offer',
    noOpen: 'Nothing can be booked right now.',
    change: 'Change',
    price: 'Price per person',
    seatsLeft: 'Seats left',
    seats: '{n} seats',
    unlimited: 'Unlimited',
    deadline: 'Registration deadline',
    validTo: 'Valid until',
    departs: 'Departure',
    international: 'International: a passport valid 6 months after return is required, and a visa file is opened for every passenger.',
    domestic: 'Domestic: a valid Syrian ID (or passport); foreigners need a passport plus a Syrian visa or residence permit.',
    payerOther: 'The payer is someone else who does not travel',
    payer: 'Payer',
    payerHint: 'The payer’s name is printed on receipts. They may not travel.',
    choosePayer: 'Choose the payer',
    noPickup: 'This trip has no alternative boarding points.',
    mainPickup: 'Main departure point (no surcharge)',
    surcharge: '+{v} per person',
    notes: 'Notes',
    branch: 'Registering branch',
    branchHint: 'This product is shared by all branches; choose the branch that registers the booking.',
    override: 'Accept after the deadline',
    overrideHint: 'Admin-only exception, recorded in the audit log (BKG-06).',
    summary: 'Summary',
    passengers: 'Passengers',
    perPerson: 'Price per person',
    pickupExtra: 'Boarding surcharge',
    estimate: 'Estimated total',
    discountNote: 'The best live discount is applied automatically on save.',
    submit: 'Create booking',
    missingTarget: 'Choose a trip, program or offer',
    missingPassengers: 'Add at least one passenger',
    missingPayer: 'Choose the payer',
    missingBranch: 'Choose the branch',
    created: 'Booking {no} created',
    warnings: 'Document warnings: complete them before confirming',
    deadlinePassed: 'The deadline has passed',
  },
});

type Kind = 'trip' | 'program' | 'offer';
interface TargetRef {
  kind: Kind;
  id: string;
}

interface TargetInfo {
  kind: Kind;
  id: string;
  code: string | null;
  title: string;
  price: string;
  currency: string;
  seatsLeft: number | null;
  deadline: string | null;
  startsAt: string | null;
  validTo: string | null;
  scope: 'DOMESTIC' | 'INTERNATIONAL' | null;
  branchId: string | null;
  branchName: string | null;
  pickupPoints: TripDetail['pickupPoints'];
}

function useTarget(ref: TargetRef | null): { info: TargetInfo | null; loading: boolean; error: unknown } {
  const trip = useResource<TripDetail>(ref?.kind === 'trip' ? `/trips/${ref.id}` : null);
  const program = useResource<Program>(ref?.kind === 'program' ? `/programs/${ref.id}` : null);
  const offer = useResource<Offer>(ref?.kind === 'offer' ? `/offers/${ref.id}` : null);
  const info = useMemo<TargetInfo | null>(() => {
    if (ref?.kind === 'trip' && trip.data) {
      const x = trip.data;
      return {
        kind: 'trip',
        id: x.id,
        code: x.code,
        title: x.title,
        price: x.pricePerPerson,
        currency: x.currencyCode,
        seatsLeft: x.availableSeats,
        deadline: x.registrationDeadline,
        startsAt: x.startsAt,
        validTo: null,
        scope: x.scope,
        branchId: x.branchId,
        branchName: x.branch?.name ?? null,
        pickupPoints: x.pickupPoints ?? [],
      };
    }
    if (ref?.kind === 'program' && program.data) {
      const x = program.data;
      return {
        kind: 'program',
        id: x.id,
        code: x.code,
        title: x.title,
        price: x.pricePerPerson,
        currency: x.currencyCode,
        seatsLeft: x.availableSeats,
        deadline: x.registrationDeadline,
        startsAt: x.startsAt,
        validTo: null,
        scope: x.scope,
        branchId: x.branchId,
        branchName: x.branch?.name ?? null,
        pickupPoints: x.legs[0]?.trip.pickupPoints ?? [],
      };
    }
    if (ref?.kind === 'offer' && offer.data) {
      const x = offer.data;
      return {
        kind: 'offer',
        id: x.id,
        code: null,
        title: x.title,
        price: x.pricePerPerson,
        currency: x.currencyCode ?? 'SYP',
        seatsLeft: x.availableSeats,
        deadline: null,
        startsAt: x.validFrom,
        validTo: x.validTo,
        scope: null,
        branchId: null,
        branchName: null,
        pickupPoints: [],
      };
    }
    return null;
  }, [ref, trip.data, program.data, offer.data]);
  const q = ref?.kind === 'trip' ? trip : ref?.kind === 'program' ? program : offer;
  return { info, loading: !!ref && q.isLoading, error: q.error };
}

export function NewBooking() {
  const t = useMessages(m);
  const f = useFormat();
  const router = useRouter();
  const search = useSearchParams();
  const { isAdmin } = useAuth();
  const lookups = useLookups();

  const initial = useMemo<TargetRef | null>(() => {
    const tripId = search.get('tripId');
    const programId = search.get('programId');
    const offerId = search.get('offerId');
    if (tripId) return { kind: 'trip', id: tripId };
    if (programId) return { kind: 'program', id: programId };
    if (offerId) return { kind: 'offer', id: offerId };
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [ref, setRef] = useState<TargetRef | null>(initial);
  const target = useTarget(ref);
  const info = target.info;

  const [passengers, setPassengers] = useState<PickedPassenger[]>([]);
  const [payer, setPayer] = useState<PickedCustomer | null>(null);
  const [payerOther, setPayerOther] = useState(false);
  const [pickupId, setPickupId] = useState<string>('none');
  const [notes, setNotes] = useState('');
  const [branchId, setBranchId] = useState('');
  const [override, setOverride] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);

  // ?customerId= (from a customer profile): start with that customer as passenger and payer
  const preCustomer = search.get('customerId');
  const pre = useResource<Customer>(preCustomer ? `/customers/${preCustomer}` : null);
  const preDone = useRef(false);
  useEffect(() => {
    if (pre.data && !preDone.current) {
      preDone.current = true;
      setPassengers([{ customer: pre.data }]);
      setPayer(pre.data);
    }
  }, [pre.data]);

  const addPassenger = (c: PickedCustomer) => {
    setPassengers((list) => (list.some((p) => p.customer.id === c.id) ? list : [...list, { customer: c }]));
    if (!payer && !payerOther) setPayer(c);
  };
  const onPassengers = (list: PickedPassenger[]) => {
    setPassengers(list);
    if (!payerOther && payer && !list.some((p) => p.customer.id === payer.id)) setPayer(list[0]?.customer ?? null);
  };

  const pickup = info?.pickupPoints.find((p) => p.id === pickupId);
  const surcharge = Number(pickup?.surcharge ?? 0);
  const n = passengers.length;
  const estimate = info ? (Number(info.price) + surcharge) * n : 0;
  const deadlinePassed = !!info?.deadline && new Date(info.deadline) <= new Date();
  const needsBranch = isAdmin && !!info && !info.branchId;

  const problems: string[] = [];
  if (!info) problems.push(t.missingTarget);
  if (!n) problems.push(t.missingPassengers);
  if (!payer) problems.push(t.missingPayer);
  if (needsBranch && !branchId) problems.push(t.missingBranch);

  const submit = async () => {
    setTried(true);
    if (problems.length || !info || !payer) return;
    setBusy(true);
    try {
      const body = {
        tripId: info.kind === 'trip' ? info.id : undefined,
        programId: info.kind === 'program' ? info.id : undefined,
        offerId: info.kind === 'offer' ? info.id : undefined,
        payerCustomerId: payer.id,
        passengers: passengers.map((p) => ({ customerId: p.customer.id, documentId: p.documentId })),
        pickupPointId: pickup?.id,
        branchId: needsBranch ? branchId : undefined,
        notes: notes.trim() || undefined,
        overrideDeadline: isAdmin && override ? true : undefined,
      };
      const b = await api.post<BookingDetail>('/bookings', body);
      toast.success(fmt(t.created, { no: b.bookingNo }));
      if (b.warnings?.length) toast.warning(t.warnings, { description: b.warnings.join(' • '), duration: 12000 });
      router.push(`/dashboard/bookings/${b.id}`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard/bookings" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
          <ArrowRight className="size-4 rtl-flip" aria-hidden /> {t.back}
        </Link>
      </div>
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-4">
          <Step n={1} title={t.step1} done={!!info}>
            {ref ? (
              target.loading ? (
                <Skeleton className="h-28" />
              ) : target.error ? (
                <p className="text-sm text-danger">{errorMessage(target.error)}</p>
              ) : info ? (
                <TargetCard
                  info={info}
                  onChange={() => {
                    setRef(null);
                    setPickupId('none');
                    router.replace('/dashboard/bookings/new', { scroll: false });
                  }}
                />
              ) : null
            ) : (
              <TargetPicker onPick={setRef} />
            )}
            {info?.scope && (
              <div className={cn('mt-3 flex items-start gap-2 rounded-field p-3 text-sm', info.scope === 'INTERNATIONAL' ? 'bg-info/10' : 'bg-surface-raised')}>
                <Globe2 className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
                {info.scope === 'INTERNATIONAL' ? t.international : t.domestic}
              </div>
            )}
          </Step>

          <Step n={2} title={t.step2} done={n > 0 && !!payer}>
            <div className="flex flex-col gap-4">
              <CustomerSearch onPick={addPassenger} pickedIds={passengers.map((p) => p.customer.id)} />
              <PassengerList passengers={passengers} onChange={onPassengers} payerId={payerOther ? undefined : payer?.id} onPayerChange={payerOther ? undefined : (c) => setPayer(c)} />
              <div className="flex flex-col gap-3 rounded-field border border-border p-4">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--primary)]"
                    checked={payerOther}
                    onChange={(e) => {
                      setPayerOther(e.target.checked);
                      setPayer(e.target.checked ? null : (passengers[0]?.customer ?? null));
                    }}
                  />
                  {t.payerOther}
                </label>
                <p className="text-xs text-muted">{t.payerHint}</p>
                {payerOther &&
                  (payer ? (
                    <div className="flex items-center gap-3 rounded-field border border-primary/40 bg-primary/5 p-3">
                      <div className="flex-1">
                        <div className="text-xs text-muted">{t.payer}</div>
                        <div className="font-medium">{payer.fullName}</div>
                        <div className="ltr-nums text-xs text-muted" dir="ltr">
                          {payer.phone}
                        </div>
                      </div>
                      <Button size="icon-sm" variant="ghost" aria-label={t.change} onClick={() => setPayer(null)}>
                        <X />
                      </Button>
                    </div>
                  ) : (
                    <CustomerSearch onPick={(c) => setPayer(c)} />
                  ))}
              </div>
            </div>
          </Step>

          <Step n={3} title={t.step3} done={!!info} muted={!info?.pickupPoints.length}>
            {info?.pickupPoints.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <PickupOption checked={pickupId === 'none'} onSelect={() => setPickupId('none')} title={t.mainPickup} />
                {info.pickupPoints.map((p) => (
                  <PickupOption
                    key={p.id}
                    checked={pickupId === p.id}
                    onSelect={() => setPickupId(p.id)}
                    title={p.city.nameAr}
                    meta={[p.pickupTime, p.notes].filter(Boolean).join(' · ')}
                    extra={Number(p.surcharge) > 0 ? fmt(t.surcharge, { v: f.money(p.surcharge, info.currency) }) : undefined}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">{t.noPickup}</p>
            )}
          </Step>

          <Step n={4} title={t.step4}>
            <div className="grid gap-4">
              <FormField label={t.notes}>
                <Textarea rows={3} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </FormField>
              {needsBranch && (
                <FormField label={t.branch} hint={t.branchHint} required error={tried && !branchId ? t.missingBranch : undefined}>
                  <Select value={branchId || undefined} onValueChange={setBranchId}>
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {(lookups.data?.branches ?? []).map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
              {isAdmin && info && info.kind !== 'offer' && (
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-0.5 size-4 accent-[var(--primary)]" checked={override} onChange={(e) => setOverride(e.target.checked)} />
                  <span>
                    <span className="font-medium">{t.override}</span>
                    <span className="block text-xs text-muted">{t.overrideHint}</span>
                  </span>
                </label>
              )}
            </div>
          </Step>
        </div>

        <Card tone="raised" className="sticky top-4 flex flex-col gap-3 p-5">
          <h2 className="heading-display text-[16px]">{t.summary}</h2>
          {info ? (
            <>
              <div className="text-sm font-medium">{info.title}</div>
              <div>
                <MoneyRow label={t.perPerson}>{f.money(info.price, info.currency)}</MoneyRow>
                {surcharge > 0 && <MoneyRow label={t.pickupExtra}>+ {f.money(surcharge, info.currency)}</MoneyRow>}
                <MoneyRow label={t.passengers}>{n}</MoneyRow>
                <MoneyRow label={t.estimate} strong>
                  {f.money(estimate, info.currency)}
                </MoneyRow>
              </div>
              {info.kind !== 'offer' && <p className="text-xs text-muted">{t.discountNote}</p>}
              {deadlinePassed && (
                <Badge tone="danger" dot>
                  {t.deadlinePassed}
                </Badge>
              )}
            </>
          ) : (
            <p className="text-sm text-muted">{t.missingTarget}</p>
          )}
          {tried && problems.length > 0 && (
            <ul className="flex flex-col gap-1 rounded-field bg-danger/10 p-3 text-xs text-danger">
              {problems.map((p) => (
                <li key={p} className="flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5" aria-hidden /> {p}
                </li>
              ))}
            </ul>
          )}
          <Button size="lg" onClick={submit} disabled={busy} className="mt-1">
            {busy && <Loader2 className="animate-spin" />} {t.submit}
          </Button>
        </Card>
      </div>
    </div>
  );
}

function Step({ n, title, done, muted, children }: { n: number; title: string; done?: boolean; muted?: boolean; children: ReactNode }) {
  return (
    <Card className={cn('p-5 sm:p-6', muted && 'opacity-90')}>
      <div className="mb-4 flex items-center gap-3">
        <span className={cn('num grid size-8 shrink-0 place-items-center rounded-full text-sm font-medium', done ? 'bg-primary text-primary-foreground' : 'bg-surface-raised text-muted ring-1 ring-border')}>{n}</span>
        <h2 className="heading-display text-[16px]">{title}</h2>
      </div>
      {children}
    </Card>
  );
}

function PickupOption({ checked, onSelect, title, meta, extra }: { checked: boolean; onSelect: () => void; title: string; meta?: string; extra?: string }) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-3 rounded-field border p-3 text-sm transition-colors', checked ? 'border-primary/50 bg-primary/5' : 'border-border bg-surface-raised hover:border-border-strong')}>
      <input type="radio" name="pickup" className="mt-0.5 size-4 accent-[var(--primary)]" checked={checked} onChange={onSelect} />
      <span className="flex-1">
        <span className="font-medium">{title}</span>
        {meta && <span className="num block text-xs text-muted">{meta}</span>}
      </span>
      {extra && <span className="num text-xs font-medium text-warning">{extra}</span>}
    </label>
  );
}

function TargetCard({ info, onChange }: { info: TargetInfo; onChange: () => void }) {
  const t = useMessages(m);
  const f = useFormat();
  const Icon = info.kind === 'trip' ? Map : info.kind === 'program' ? Layers : Package;
  const href = `/dashboard/${info.kind === 'trip' ? 'trips' : info.kind === 'program' ? 'programs' : 'offers'}/${info.id}`;
  return (
    <div className="flex flex-wrap items-start gap-4 rounded-field border border-border bg-surface-raised p-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-primary">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {info.code && <span className="num text-xs text-muted">{info.code}</span>}
          {info.scope && <StatusBadge kind="scope" status={info.scope} size="sm" />}
          {info.branchName && <Badge size="sm">{info.branchName}</Badge>}
        </div>
        <Link href={href} className="mt-1 block font-medium hover:text-primary hover:underline">
          {info.title}
        </Link>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted">{t.price}</dt>
            <dd className="num font-medium">{f.money(info.price, info.currency)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{t.seatsLeft}</dt>
            <dd className="num font-medium">{info.seatsLeft === null ? t.unlimited : fmt(t.seats, { n: info.seatsLeft })}</dd>
          </div>
          {info.startsAt && (
            <div>
              <dt className="text-xs text-muted">{t.departs}</dt>
              <dd className="num">{f.date(info.startsAt, 'medium')}</dd>
            </div>
          )}
          {(info.deadline || info.validTo) && (
            <div>
              <dt className="text-xs text-muted">{info.deadline ? t.deadline : t.validTo}</dt>
              <dd className="num inline-flex items-center gap-1">
                <CalendarClock className="size-3.5 text-muted" aria-hidden />
                {f.date(info.deadline ?? info.validTo, info.deadline ? 'dateTime' : 'medium')}
              </dd>
            </div>
          )}
        </dl>
      </div>
      <Button variant="secondary" size="sm" onClick={onChange}>
        {t.change}
      </Button>
    </div>
  );
}

function TargetPicker({ onPick }: { onPick: (r: TargetRef) => void }) {
  const t = useMessages(m);
  const f = useFormat();
  const name = useName();
  const { locale } = useLocale();
  const arrow = locale === 'ar' ? '←' : '→';
  const [kind, setKind] = useState<Kind>('trip');
  const trips = useList<TripListItem>('/trips', { bookable: 'true', pageSize: 50, sort: 'startsAt', order: 'asc' }, { enabled: kind === 'trip' });
  const programs = useList<Program>('/programs', { bookable: 'true', pageSize: 50 }, { enabled: kind === 'program' });
  const offers = useList<Offer>('/offers', { kind: 'BUNDLE', live: 'true', pageSize: 50 }, { enabled: kind === 'offer' });

  const rows: { id: string; code: string | null; title: string; sub: string; price: string; currency: string; seats: number | null; scope: 'DOMESTIC' | 'INTERNATIONAL' | null }[] =
    kind === 'trip'
      ? (trips.data?.data ?? []).map((x) => ({
          id: x.id,
          code: x.code,
          title: x.title,
          sub: `${name(x.originCity)} ${arrow} ${name(x.destinationCity)} · ${f.date(x.startsAt, 'medium')}`,
          price: x.pricePerPerson,
          currency: x.currencyCode,
          seats: x.availableSeats,
          scope: x.scope,
        }))
      : kind === 'program'
        ? (programs.data?.data ?? []).map((x) => ({
            id: x.id,
            code: x.code,
            title: x.title,
            sub: x.startsAt ? f.date(x.startsAt, 'medium') : '',
            price: x.pricePerPerson,
            currency: x.currencyCode,
            seats: x.availableSeats,
            scope: x.scope,
          }))
        : (offers.data?.data ?? []).map((x) => ({
            id: x.id,
            code: null,
            title: x.title,
            sub: `${f.date(x.validFrom, 'medium')} – ${f.date(x.validTo, 'medium')}`,
            price: x.pricePerPerson,
            currency: x.currencyCode ?? 'SYP',
            seats: x.availableSeats,
            scope: null,
          }));
  const loading = (kind === 'trip' ? trips : kind === 'program' ? programs : offers).isLoading;

  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        aria-label={t.step1}
        value={kind}
        onValueChange={setKind}
        options={[
          { value: 'trip', label: t.trip },
          { value: 'program', label: t.program },
          { value: 'offer', label: t.offer },
        ]}
      />
      {loading ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">{t.noOpen}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {rows.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onPick({ kind, id: r.id })}
              className="flex flex-col gap-2 rounded-field border border-border bg-surface-raised p-4 text-start transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-ring"
            >
              <div className="flex flex-wrap items-center gap-2">
                {r.code && <span className="num text-xs text-muted">{r.code}</span>}
                {r.scope && <StatusBadge kind="scope" status={r.scope} size="sm" />}
              </div>
              <span className="font-medium">{r.title}</span>
              {r.sub && <span className="num text-xs text-muted">{r.sub}</span>}
              <span className="mt-auto flex items-center justify-between gap-2 text-sm">
                <span className="num font-medium">{f.money(r.price, r.currency)}</span>
                <span className="inline-flex items-center gap-1 text-xs text-muted">
                  <Users className="size-3.5" aria-hidden />
                  <span className="num">{r.seats === null ? t.unlimited : fmt(t.seats, { n: r.seats })}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
