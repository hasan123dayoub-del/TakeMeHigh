'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api, errorMessage } from '@/lib/api';
import { useInvalidate, useList, useResource } from '@/lib/hooks';
import { defineMessages, fmt, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import type { BookingDetail, Customer, Receipt, TripDetail, TripListItem } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';
import { CustomerSearch, PassengerList, type PickedPassenger } from './passenger-picker';

const m = defineMessages({
  ar: {
    payTitle: 'تسجيل دفعة نقدية',
    payHint: 'الدفعة لا تُعدَّل بعد حفظها؛ يُصحَّح الخطأ باسترجاع. يُطبع الوصل بعد الحفظ.',
    amount: 'المبلغ',
    remaining: 'المبلغ المتبقي',
    max: 'الحد الأقصى {v}',
    payerName: 'اسم الدافع على الوصل',
    paidAt: 'تاريخ ووقت الدفع',
    notes: 'ملاحظات',
    save: 'حفظ وفتح الوصل',
    badAmount: 'أدخل مبلغاً أكبر من صفر بخانتين عشريتين كحد أقصى',
    overBalance: 'المبلغ أكبر من المتبقي',
    recorded: 'تم تسجيل الدفعة {no}',
    refundTitle: 'استرجاع من الوصل {no}',
    refundHint: 'يُسجَّل الاسترجاع كوصل منفصل مرتبط بالدفعة الأصلية (لا تُحذف الدفعات أبداً).',
    refundable: 'يمكن استرجاع حتى {v}',
    reason: 'سبب الاسترجاع',
    reasonShort: 'اكتب السبب (3 أحرف على الأقل)',
    refund: 'تسجيل الاسترجاع',
    refunded: 'تم تسجيل الاسترجاع {no}',
    transferTitle: 'نقل الحجز إلى رحلة أخرى',
    transferHint: 'تظهر الرحلات المفتوحة بنفس العملة فقط. يُعاد تسعير الحجز حسب الرحلة الجديدة، ويُنقل حجز المقاعد إن كان الحجز مؤكداً.',
    toTrip: 'الرحلة الجديدة',
    note: 'ملاحظة',
    transfer: 'نقل',
    transferred: 'تم نقل الحجز',
    noTrips: 'لا توجد رحلة مفتوحة أخرى بنفس العملة.',
    seats: '{n} مقعد متبقٍ',
    passengersTitle: 'تعديل الركاب',
    passengersHint: 'متاح قبل التأكيد فقط. يبقى سعر الشخص كما هو عند الحجز، ويتغير الإجمالي حسب العدد ونقطة الانطلاق.',
    pickup: 'نقطة الانطلاق',
    mainPickup: 'الأساسية (بدون إضافة)',
    savePassengers: 'حفظ الركاب',
    passengersSaved: 'تم تحديث الركاب',
    needOne: 'أضف راكباً واحداً على الأقل',
    waitTitle: 'مقاعد تحرّرت',
    waitHint: 'هذه حجوزات من قائمة الانتظار تتسع لها المقاعد المتحررة الآن (الأقدم أولاً). أكّد ما تريد.',
    confirmOne: 'تأكيد',
    confirmed: 'تم تأكيد {no}',
    stillWaiting: 'لا مقاعد كافية — بقي في قائمة الانتظار',
    passengersN: '{n} راكب',
  },
  en: {
    payTitle: 'Record a cash payment',
    payHint: 'Payments cannot be edited once saved; mistakes are corrected with a refund. The receipt opens after saving.',
    amount: 'Amount',
    remaining: 'Remaining balance',
    max: 'Maximum {v}',
    payerName: 'Payer name on the receipt',
    paidAt: 'Paid at',
    notes: 'Notes',
    save: 'Save and open receipt',
    badAmount: 'Enter an amount above zero with at most two decimals',
    overBalance: 'The amount is more than the balance',
    recorded: 'Payment {no} recorded',
    refundTitle: 'Refund from receipt {no}',
    refundHint: 'A refund is a separate receipt linked to the original payment (payments are never deleted).',
    refundable: 'Up to {v} can be refunded',
    reason: 'Reason',
    reasonShort: 'Write the reason (at least 3 characters)',
    refund: 'Record refund',
    refunded: 'Refund {no} recorded',
    transferTitle: 'Transfer to another trip',
    transferHint: 'Only open trips in the same currency are listed. The booking is re-priced for the new trip; a confirmed booking moves its seats.',
    toTrip: 'New trip',
    note: 'Note',
    transfer: 'Transfer',
    transferred: 'Booking transferred',
    noTrips: 'No other open trip in the same currency.',
    seats: '{n} seats left',
    passengersTitle: 'Edit passengers',
    passengersHint: 'Only before confirmation. The price per person stays as booked; the total follows the count and boarding point.',
    pickup: 'Boarding point',
    mainPickup: 'Main (no surcharge)',
    savePassengers: 'Save passengers',
    passengersSaved: 'Passengers updated',
    needOne: 'Add at least one passenger',
    waitTitle: 'Seats were freed',
    waitHint: 'These waiting-list bookings fit in the freed seats (oldest first). Confirm the ones you want.',
    confirmOne: 'Confirm',
    confirmed: '{no} confirmed',
    stillWaiting: 'Not enough seats — still on the waiting list',
    passengersN: '{n} passengers',
  },
});

const AMOUNT = /^\d{1,12}(\.\d{1,2})?$/;
const localNow = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

/** PAY-01..03, PAY-10: one idempotency key per dialog, so a double click records once. */
export function PaymentDialog({ booking, onClose }: { booking: BookingDetail; onClose: () => void }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const f = useFormat();
  const router = useRouter();
  const invalidate = useInvalidate();
  const [key] = useState(() => crypto.randomUUID());
  const balance = Number(booking.balance);
  const [amount, setAmount] = useState('');
  const [payerName, setPayerName] = useState(booking.payer.fullName);
  const [paidAt, setPaidAt] = useState(localNow);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  const submit = async () => {
    if (inFlight.current) return;
    const a = amount.trim();
    if (!AMOUNT.test(a) || Number(a) <= 0) return setError(t.badAmount);
    if (Number(a) > balance) return setError(t.overBalance);
    setError(undefined);
    inFlight.current = true;
    setBusy(true);
    try {
      const r = await api.post<Receipt>(`/bookings/${booking.id}/payments`, {
        amount: a,
        payerName: payerName.trim().length >= 3 ? payerName.trim() : undefined,
        paidAt: paidAt ? new Date(paidAt).toISOString() : undefined,
        notes: notes.trim() || undefined,
        idempotencyKey: key,
      });
      toast.success(fmt(t.recorded, { no: r.receiptNo }));
      await invalidate('/bookings', '/payments', '/customers');
      onClose();
      router.push(`/dashboard/payments/${r.id}/receipt`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.payTitle}</DialogTitle>
          <DialogDescription>{t.payHint}</DialogDescription>
        </DialogHeader>
        <form
          id="pay-form"
          noValidate
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <FormField
            label={`${t.amount} (${booking.currencyCode})`}
            required
            error={error}
            hint={fmt(t.max, { v: f.money(balance, booking.currencyCode) })}
            labelAside={
              <Button type="button" size="xs" variant="secondary" onClick={() => setAmount(String(balance))}>
                {t.remaining}
              </Button>
            }
          >
            <Input dir="ltr" inputMode="decimal" className="num text-lg" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
          </FormField>
          <FormField label={t.payerName}>
            <Input value={payerName} onChange={(e) => setPayerName(e.target.value)} maxLength={160} />
          </FormField>
          <FormField label={t.paidAt}>
            <Input type="datetime-local" dir="ltr" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
          </FormField>
          <FormField label={t.notes}>
            <Textarea rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {c.cancel}
          </Button>
          <Button type="submit" form="pay-form" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} {t.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** PAY-05/06: refund (part of) one payment, never more than what is left of it. */
export function RefundDialog({ payment, refundable, currency, onClose }: { payment: { id: string; receiptNo: string }; refundable: number; currency: string; onClose: () => void }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const f = useFormat();
  const router = useRouter();
  const invalidate = useInvalidate();
  const [key] = useState(() => crypto.randomUUID());
  const [amount, setAmount] = useState(String(refundable));
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<{ amount?: string; reason?: string }>({});
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  const submit = async () => {
    if (inFlight.current) return;
    const a = amount.trim();
    const e: typeof errors = {};
    if (!AMOUNT.test(a) || Number(a) <= 0) e.amount = t.badAmount;
    else if (Number(a) > refundable) e.amount = fmt(t.refundable, { v: f.money(refundable, currency) });
    if (reason.trim().length < 3) e.reason = t.reasonShort;
    setErrors(e);
    if (Object.keys(e).length) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const r = await api.post<Receipt>(`/payments/${payment.id}/refund`, { amount: a, reason: reason.trim(), idempotencyKey: key });
      toast.success(fmt(t.refunded, { no: r.receiptNo }));
      await invalidate('/bookings', '/payments', '/customers');
      onClose();
      router.push(`/dashboard/payments/${r.id}/receipt`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{fmt(t.refundTitle, { no: payment.receiptNo })}</DialogTitle>
          <DialogDescription>{t.refundHint}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <FormField label={`${t.amount} (${currency})`} required error={errors.amount} hint={fmt(t.refundable, { v: f.money(refundable, currency) })}>
            <Input dir="ltr" inputMode="decimal" className="num text-lg" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </FormField>
          <FormField label={t.reason} required error={errors.reason}>
            <Textarea rows={3} maxLength={255} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {c.cancel}
          </Button>
          <Button variant="destructive" onClick={submit} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} {t.refund}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** BKG-11: move a trip booking to another open trip in the same currency. */
export function TransferDialog({ booking, onClose }: { booking: BookingDetail; onClose: () => void }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const f = useFormat();
  const invalidate = useInvalidate();
  const trips = useList<TripListItem>('/trips', { bookable: 'true', pageSize: 100 });
  const options = (trips.data?.data ?? []).filter((x) => x.id !== booking.tripId && x.currencyCode === booking.currencyCode);
  const [toTripId, setToTripId] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const chosen = options.find((x) => x.id === toTripId);

  const submit = async () => {
    if (!toTripId) return;
    setBusy(true);
    try {
      await api.post(`/bookings/${booking.id}/transfer`, { toTripId, note: note.trim() || undefined });
      toast.success(t.transferred);
      await invalidate('/bookings', '/trips');
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t.transferTitle}</DialogTitle>
          <DialogDescription>{t.transferHint}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <FormField label={t.toTrip} required>
            {trips.isLoading ? (
              <Loader2 className="size-4 animate-spin text-muted" />
            ) : options.length === 0 ? (
              <p className="text-sm text-muted">{t.noTrips}</p>
            ) : (
              <Select value={toTripId || undefined} onValueChange={setToTripId}>
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((x) => (
                    <SelectItem key={x.id} value={x.id}>
                      {x.code} — {x.title} · {f.date(x.startsAt, 'short')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
          {chosen && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge tone="primary">{f.money(chosen.pricePerPerson, chosen.currencyCode)}</Badge>
              <Badge>{fmt(t.seats, { n: chosen.availableSeats })}</Badge>
            </div>
          )}
          <FormField label={t.note}>
            <Textarea rows={2} maxLength={255} value={note} onChange={(e) => setNote(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {c.cancel}
          </Button>
          <Button onClick={submit} disabled={busy || !toTripId}>
            {busy && <Loader2 className="animate-spin" />} {t.transfer}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Replace passengers / boarding point of a PENDING or WAITLIST booking. */
export function PassengersDialog({ booking, onClose }: { booking: BookingDetail; onClose: () => void }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const f = useFormat();
  const invalidate = useInvalidate();
  const trip = useResource<TripDetail>(booking.tripId ? `/trips/${booking.tripId}` : null);
  const pickupPoints = trip.data?.pickupPoints ?? (booking.pickupPoint ? [{ ...booking.pickupPoint, cityId: '', notes: null }] : []);
  // the passenger rows carry no documents list: load each customer for the document choice
  const [passengers, setPassengers] = useState<PickedPassenger[]>(() =>
    booking.passengers.map((p) => ({
      customer: { id: p.customer.id, fullName: p.customer.fullName, phone: p.customer.phone, documents: p.document ? [{ ...p.document }] : [] },
      documentId: p.documentId ?? undefined,
    })),
  );
  const [pickupId, setPickupId] = useState(booking.pickupPoint?.id ?? 'none');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    void Promise.all(booking.passengers.map((p) => api.get<Customer>(`/customers/${p.customer.id}`).catch(() => null))).then((list) => {
      if (!alive) return;
      setPassengers((cur) => cur.map((p) => ({ ...p, customer: { ...p.customer, documents: list.find((x) => x?.id === p.customer.id)?.documents ?? p.customer.documents } })));
    });
    return () => {
      alive = false;
    };
  }, [booking.passengers]);

  const submit = async () => {
    if (!passengers.length) return toast.error(t.needOne);
    setBusy(true);
    try {
      await api.patch(`/bookings/${booking.id}/passengers`, {
        passengers: passengers.map((p) => ({ customerId: p.customer.id, documentId: p.documentId })),
        pickupPointId: pickupId === 'none' ? null : pickupId,
      });
      toast.success(t.passengersSaved);
      await invalidate('/bookings', '/customers');
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const add = async (cu: { id: string }) => {
    if (passengers.some((p) => p.customer.id === cu.id)) return;
    try {
      const full = await api.get<Customer>(`/customers/${cu.id}`);
      setPassengers((l) => [...l, { customer: full }]);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t.passengersTitle}</DialogTitle>
          <DialogDescription>{t.passengersHint}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <CustomerSearch onPick={add} pickedIds={passengers.map((p) => p.customer.id)} />
          <PassengerList passengers={passengers} onChange={setPassengers} />
          {pickupPoints.length > 0 && (
            <FormField label={t.pickup}>
              <Select value={pickupId} onValueChange={setPickupId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t.mainPickup}</SelectItem>
                  {pickupPoints.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.city.nameAr} {p.pickupTime ? `· ${p.pickupTime}` : ''} {Number(p.surcharge) > 0 ? `(+${f.money(p.surcharge, booking.currencyCode)})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {c.cancel}
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} {t.savePassengers}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** BKG-09: after a cancellation, offer to confirm the waiting bookings that now fit. */
export function WaitlistDialog({ suggestions, onClose }: { suggestions: NonNullable<BookingDetail['waitlistSuggestions']>; onClose: () => void }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const invalidate = useInvalidate();
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const confirm = async (id: string, no: string) => {
    setBusy(id);
    try {
      const r = await api.post<BookingDetail>(`/bookings/${id}/confirm`);
      if (r.seatsUnavailable) toast.warning(t.stillWaiting);
      else {
        toast.success(fmt(t.confirmed, { no }));
        setDone((d) => ({ ...d, [id]: true }));
      }
      await invalidate('/bookings');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.waitTitle}</DialogTitle>
          <DialogDescription>{t.waitHint}</DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col divide-y divide-border rounded-field border border-border">
          {suggestions.map((s) => (
            <li key={s.id} className="flex items-center gap-3 p-3">
              <div className="flex-1">
                <div className="num font-medium">{s.bookingNo}</div>
                <div className="text-xs text-muted">
                  {s.payer.fullName} · {fmt(t.passengersN, { n: s.passengerCount })}
                </div>
              </div>
              <Button size="sm" disabled={!!done[s.id] || busy === s.id} onClick={() => confirm(s.id, s.bookingNo)}>
                {busy === s.id && <Loader2 className="animate-spin" />} {done[s.id] ? '✓' : t.confirmOne}
              </Button>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {c.close}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
