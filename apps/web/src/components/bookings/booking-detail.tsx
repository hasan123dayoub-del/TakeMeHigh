'use client';

import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  Ban,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Hourglass,
  PlusCircle,
  Receipt as ReceiptIcon,
  RotateCcw,
  TrendingUp,
  Undo2,
  Users,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/data/confirm-dialog';
import { Field, QueryState } from '@/components/data/states';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useCan } from '@/lib/auth';
import { useInvalidate, useResource } from '@/lib/hooks';
import { defineMessages, fmt, useLocale, useMessages } from '@/lib/i18n';
import type { BookingDetail as BookingDetailT } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';
import { useLabel } from '../customers/shared';
import { PassengersDialog, PaymentDialog, RefundDialog, TransferDialog, WaitlistDialog } from './booking-dialogs';
import { BalanceText, MoneyRow, Muted, Section, TargetLink } from './parts';

const m = defineMessages({
  ar: {
    back: 'الحجوزات',
    eyebrow: 'حجز',
    branch: 'الفرع',
    createdBy: 'أنشأه',
    createdAt: 'تاريخ الإنشاء',
    confirmedAt: 'تاريخ التأكيد',
    cancelledAt: 'تاريخ الإلغاء',
    cancelReason: 'سبب الإلغاء',
    pickup: 'نقطة الانطلاق',
    notes: 'ملاحظات',
    fromRequest: 'من طلب رحلة',
    payer: 'الدافع',
    money: 'الحساب',
    pricePerPerson: 'سعر الشخص',
    discount: 'الخصم',
    surcharge: 'إضافة نقطة الانطلاق (للشخص)',
    total: 'الإجمالي',
    paid: 'المدفوع',
    refunded: 'المسترجع',
    balance: 'المتبقي',
    cost: 'الكلفة للشخص',
    passengers: 'الركاب',
    name: 'الاسم',
    nationality: 'الجنسية',
    document: 'الوثيقة',
    attendance: 'الحضور',
    visas: 'التأشيرات',
    noDoc: 'لا وثيقة',
    docProblems: 'وثائق ناقصة: لا يمكن التأكيد قبل إكمالها (BKG-07)',
    timeline: 'سجل الحجز',
    payments: 'الدفعات والوصولات',
    receiptNo: 'رقم الوصل',
    kind: 'النوع',
    amount: 'المبلغ',
    date: 'التاريخ',
    employee: 'الموظف',
    refundOf: 'استرجاع من',
    receipt: 'الوصل',
    refund: 'استرجاع',
    noPayments: 'لم تُسجّل أي دفعة بعد.',
    pay: 'تسجيل دفعة',
    confirm: 'تأكيد الحجز',
    confirmTitle: 'تأكيد الحجز وحجز المقاعد؟',
    confirmBody: 'تُحجز {n} مقاعد الآن. إن لم تكفِ المقاعد ينتقل الحجز إلى قائمة الانتظار تلقائياً.',
    promote: 'نقل من الانتظار إلى مؤكد',
    confirmed: 'تم تأكيد الحجز',
    waitlisted: 'لا مقاعد كافية — أُضيف إلى قائمة الانتظار',
    confirmFailed: 'تعذّر التأكيد',
    needPayment: 'سجّل أول دفعة قبل التأكيد (قاعدة المكتب).',
    needDocs: 'أكمل وثائق السفر للركاب قبل التأكيد.',
    editPassengers: 'تعديل الركاب',
    transfer: 'نقل لرحلة أخرى',
    cancel: 'إلغاء الحجز',
    cancelTitle: 'إلغاء الحجز؟',
    cancelBody: 'تتحرر مقاعده إن كان مؤكداً، وتبقى دفعاته مسجلة (يُسترجع المال بوصل استرجاع).',
    cancelled: 'تم إلغاء الحجز',
    reason: 'السبب',
    overrideNote: 'قُبل بعد انتهاء المهلة (استثناء المدير)',
    passengersN: 'الركاب الآن: {n}',
    blockers: 'قبل التأكيد',
  },
  en: {
    back: 'Bookings',
    eyebrow: 'Booking',
    branch: 'Branch',
    createdBy: 'Created by',
    createdAt: 'Created on',
    confirmedAt: 'Confirmed on',
    cancelledAt: 'Cancelled on',
    cancelReason: 'Cancel reason',
    pickup: 'Boarding point',
    notes: 'Notes',
    fromRequest: 'From trip request',
    payer: 'Payer',
    money: 'Account',
    pricePerPerson: 'Price per person',
    discount: 'Discount',
    surcharge: 'Boarding surcharge (per person)',
    total: 'Total',
    paid: 'Paid',
    refunded: 'Refunded',
    balance: 'Balance',
    cost: 'Cost per person',
    passengers: 'Passengers',
    name: 'Name',
    nationality: 'Nationality',
    document: 'Document',
    attendance: 'Attendance',
    visas: 'Visas',
    noDoc: 'No document',
    docProblems: 'Missing documents: the booking cannot be confirmed until they are complete (BKG-07)',
    timeline: 'Booking history',
    payments: 'Payments and receipts',
    receiptNo: 'Receipt no.',
    kind: 'Kind',
    amount: 'Amount',
    date: 'Date',
    employee: 'Employee',
    refundOf: 'Refund of',
    receipt: 'Receipt',
    refund: 'Refund',
    noPayments: 'No payment recorded yet.',
    pay: 'Record payment',
    confirm: 'Confirm booking',
    confirmTitle: 'Confirm and take the seats?',
    confirmBody: '{n} seats are taken now. If there are not enough, the booking joins the waiting list automatically.',
    promote: 'Promote from the waiting list',
    confirmed: 'Booking confirmed',
    waitlisted: 'Not enough seats — added to the waiting list',
    confirmFailed: 'Could not confirm',
    needPayment: 'Record the first payment before confirming (office rule).',
    needDocs: 'Complete the passengers’ travel documents before confirming.',
    editPassengers: 'Edit passengers',
    transfer: 'Transfer to another trip',
    cancel: 'Cancel booking',
    cancelTitle: 'Cancel this booking?',
    cancelBody: 'Its seats are freed if it was confirmed. Payments stay recorded (money is returned with a refund receipt).',
    cancelled: 'Booking cancelled',
    reason: 'Reason',
    overrideNote: 'Accepted after the deadline (Admin exception)',
    passengersN: 'Passengers now: {n}',
    blockers: 'Before confirming',
  },
});

const EVENT_LABELS: Record<string, { ar: string; en: string }> = {
  CREATED: { ar: 'أُنشئ الحجز', en: 'Booking created' },
  CONFIRMED: { ar: 'تأكّد الحجز', en: 'Booking confirmed' },
  WAITLISTED: { ar: 'أُضيف إلى قائمة الانتظار', en: 'Added to the waiting list' },
  PROMOTED: { ar: 'نُقل من الانتظار إلى مؤكد', en: 'Promoted from the waiting list' },
  PAYMENT: { ar: 'دفعة', en: 'Payment' },
  REFUND: { ar: 'استرجاع', en: 'Refund' },
  CANCELLED: { ar: 'أُلغي الحجز', en: 'Booking cancelled' },
  TRANSFERRED: { ar: 'نُقل إلى رحلة أخرى', en: 'Transferred to another trip' },
  PASSENGERS_UPDATED: { ar: 'عُدّل الركاب', en: 'Passengers updated' },
};
const EVENT_ICONS: Record<string, { icon: LucideIcon; tone: string }> = {
  CREATED: { icon: PlusCircle, tone: 'text-primary bg-primary/12' },
  CONFIRMED: { icon: CheckCircle2, tone: 'text-success bg-success/14' },
  WAITLISTED: { icon: Hourglass, tone: 'text-info bg-info/12' },
  PROMOTED: { icon: TrendingUp, tone: 'text-success bg-success/14' },
  PAYMENT: { icon: CreditCard, tone: 'text-success bg-success/14' },
  REFUND: { icon: Undo2, tone: 'text-danger bg-danger/12' },
  CANCELLED: { icon: Ban, tone: 'text-danger bg-danger/12' },
  TRANSFERRED: { icon: ArrowLeftRight, tone: 'text-warning bg-warning/14' },
  PASSENGERS_UPDATED: { icon: Users, tone: 'text-muted bg-neutral/12' },
};

const str = (d: Record<string, unknown> | null, k: string) => {
  const v = d?.[k];
  return v === undefined || v === null ? '' : String(v);
};

export function BookingDetail({ id }: { id: string }) {
  const t = useMessages(m);
  const f = useFormat();
  const label = useLabel();
  const { locale } = useLocale();
  const invalidate = useInvalidate();
  const canPay = useCan('payments.create');
  const canRefund = useCan('payments.refund');
  const canCreate = useCan('bookings.create');
  const canCancel = useCan('bookings.cancel');
  const q = useResource<BookingDetailT>(`/bookings/${id}`);
  const [dialog, setDialog] = useState<'pay' | 'passengers' | 'transfer' | 'confirm' | 'cancel' | null>(null);
  const [refunding, setRefunding] = useState<{ id: string; receiptNo: string; refundable: number } | null>(null);
  const [suggestions, setSuggestions] = useState<BookingDetailT['waitlistSuggestions']>();
  const b = q.data;

  const loc = (x: { ar: string; en: string }) => x[locale];

  return (
    <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()}>
      {b && (
        <div className="flex flex-col gap-6">
          <div>
            <Link href="/dashboard/bookings" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
              <ArrowRight className="size-4 rtl-flip" aria-hidden /> {t.back}
            </Link>
          </div>
          {(() => {
            const open = b.status === 'PENDING' || b.status === 'WAITLIST';
            const netPaid = Number(b.netPaid);
            const blockers = [...(b.confirmRequiresPayment && netPaid <= 0 ? [t.needPayment] : []), ...(!b.documentCheck.ok ? [t.needDocs] : [])];
            const refundedBy = (pid: string) => b.payments.filter((p) => p.refundOfId === pid).reduce((a, p) => a + Number(p.amount), 0);
            return (
              <>
                <PageHeader
                  eyebrow={t.eyebrow}
                  title={<span className="num">{b.bookingNo}</span>}
                  description={
                    <span className="flex flex-wrap items-center gap-2">
                      <StatusBadge kind="booking" status={b.status} />
                      {b.status !== 'CANCELLED' && <StatusBadge kind="paymentState" status={b.paymentState} />}
                      <TargetLink b={b} className="font-medium text-foreground" />
                    </span>
                  }
                  actions={
                    <>
                      {canPay && b.status !== 'CANCELLED' && Number(b.balance) > 0 && (
                        <Button onClick={() => setDialog('pay')}>
                          <CreditCard /> {t.pay}
                        </Button>
                      )}
                      {canCreate && open && (
                        <Button variant="ink" onClick={() => setDialog('confirm')}>
                          <CheckCircle2 /> {b.status === 'WAITLIST' ? t.promote : t.confirm}
                        </Button>
                      )}
                      {canCreate && open && (
                        <Button variant="secondary" onClick={() => setDialog('passengers')}>
                          <Users /> {t.editPassengers}
                        </Button>
                      )}
                      {canCancel && b.tripId && b.status !== 'CANCELLED' && (
                        <Button variant="secondary" onClick={() => setDialog('transfer')}>
                          <ArrowLeftRight /> {t.transfer}
                        </Button>
                      )}
                      {canCancel && b.status !== 'CANCELLED' && (
                        <Button variant="ghost" onClick={() => setDialog('cancel')}>
                          <Ban className="text-danger" /> {t.cancel}
                        </Button>
                      )}
                    </>
                  }
                />

                {open && blockers.length > 0 && (
                  <div role="status" className="flex items-start gap-3 rounded-card border border-warning/40 bg-warning/10 p-4 text-sm">
                    <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
                    <div>
                      <div className="font-medium">{t.blockers}</div>
                      <ul className="mt-1 list-disc ps-5 text-muted">
                        {blockers.map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                {!b.documentCheck.ok && b.status !== 'CANCELLED' && (
                  <div role="alert" className="flex items-start gap-3 rounded-card border border-danger/30 bg-danger/8 p-4 text-sm">
                    <FileText className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
                    <div>
                      <div className="font-medium">{t.docProblems}</div>
                      <ul className="mt-1 list-disc ps-5 text-muted" dir="auto">
                        {b.documentCheck.problems.map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="flex min-w-0 flex-col gap-6">
                    <Section title={`${t.passengers} (${b.passengerCount})`}>
                      <Table className="text-start">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-start">{t.name}</TableHead>
                            <TableHead className="text-start">{t.nationality}</TableHead>
                            <TableHead className="text-start">{t.document}</TableHead>
                            <TableHead className="text-start">{t.attendance}</TableHead>
                            <TableHead className="text-start">{t.visas}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {b.passengers.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell>
                                <Link href={`/dashboard/customers/${p.customer.id}`} className="font-medium hover:text-primary hover:underline">
                                  {p.customer.fullName}
                                </Link>
                                <div className="ltr-nums text-xs text-muted" dir="ltr">
                                  {p.customer.phone}
                                </div>
                              </TableCell>
                              <TableCell>{p.customer.nationality.nameAr}</TableCell>
                              <TableCell>
                                {p.document ? (
                                  <span>
                                    {label('documentType', p.document.docType)}{' '}
                                    <span className="num ltr-nums" dir="ltr">
                                      {p.document.docNumber}
                                    </span>
                                  </span>
                                ) : (
                                  <Badge tone="danger" size="sm">
                                    {t.noDoc}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {p.attendance ? (
                                  <Badge tone={p.attendance === 'PRESENT' ? 'success' : 'danger'} size="sm">
                                    {label('attendance', p.attendance)}
                                  </Badge>
                                ) : (
                                  '—'
                                )}
                              </TableCell>
                              <TableCell>
                                {p.visas.length ? (
                                  <span className="flex flex-wrap gap-1">
                                    {p.visas.map((v) => (
                                      <span key={v.id} className="inline-flex items-center gap-1 text-xs">
                                        {v.country.nameAr}
                                        <StatusBadge kind="visa" status={v.status} size="sm" />
                                      </span>
                                    ))}
                                  </span>
                                ) : (
                                  '—'
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Section>

                    <Section title={t.payments}>
                      {b.payments.length === 0 ? (
                        <Muted>{t.noPayments}</Muted>
                      ) : (
                        <Table className="text-start">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-start">{t.receiptNo}</TableHead>
                              <TableHead className="text-start">{t.kind}</TableHead>
                              <TableHead className="text-end">{t.amount}</TableHead>
                              <TableHead className="text-start">{t.date}</TableHead>
                              <TableHead className="text-end" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {b.payments.map((p) => {
                              const left = p.kind === 'REFUND' ? 0 : Number(p.amount) - refundedBy(p.id);
                              const of = p.refundOfId ? b.payments.find((x) => x.id === p.refundOfId) : undefined;
                              return (
                                <TableRow key={p.id}>
                                  <TableCell>
                                    <span className="num font-medium whitespace-nowrap">{p.receiptNo}</span>
                                    {of && (
                                      <div className="text-xs text-muted">
                                        {t.refundOf}{' '}
                                        <Link className="num text-primary hover:underline" href={`/dashboard/payments/${of.id}/receipt`}>
                                          {of.receiptNo}
                                        </Link>
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <StatusBadge kind="paymentKind" status={p.kind} />
                                  </TableCell>
                                  <TableCell className={cn('num text-end font-medium whitespace-nowrap', p.kind === 'REFUND' && 'text-danger')}>
                                    {p.kind === 'REFUND' ? '− ' : ''}
                                    {f.money(p.amount, p.currencyCode)}
                                  </TableCell>
                                  <TableCell>
                                    <div className="num">{f.date(p.paidAt, 'medium')}</div>
                                    <div className="text-xs text-muted">{p.receivedBy.fullName}</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex justify-end gap-1">
                                      <Button size="icon-sm" variant="secondary" asChild>
                                        <Link href={`/dashboard/payments/${p.id}/receipt`} aria-label={t.receipt} title={t.receipt}>
                                          <ReceiptIcon />
                                        </Link>
                                      </Button>
                                      {canRefund && left > 0 && (
                                        <Button size="icon-sm" variant="ghost" aria-label={t.refund} title={t.refund} onClick={() => setRefunding({ id: p.id, receiptNo: p.receiptNo, refundable: left })}>
                                          <RotateCcw className="text-danger" />
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </Section>

                    <Section title={t.timeline}>
                      <ol className="relative flex flex-col gap-4 ps-1">
                        {b.events.map((e, i) => {
                          const ic = EVENT_ICONS[e.type] ?? { icon: Clock, tone: 'text-muted bg-neutral/12' };
                          const Icon = ic.icon;
                          const d = e.data;
                          let detail = '';
                          if (e.type === 'PAYMENT') detail = `${str(d, 'receiptNo')} · ${f.money(str(d, 'amount'), b.currencyCode)}`;
                          if (e.type === 'REFUND') detail = `${str(d, 'receiptNo')} ← ${str(d, 'of')} · ${f.money(str(d, 'amount'), b.currencyCode)} · ${str(d, 'reason')}`;
                          if (e.type === 'CANCELLED') detail = str(d, 'reason');
                          if (e.type === 'TRANSFERRED')
                            detail = `${str(d, 'fromTrip')} → ${str(d, 'toTrip')} · ${f.money(str(d, 'oldTotal'), b.currencyCode)} → ${f.money(str(d, 'newTotal'), b.currencyCode)}${str(d, 'note') ? ` · ${str(d, 'note')}` : ''}`;
                          if (e.type === 'CREATED') detail = `${f.money(str(d, 'total'), b.currencyCode)}${d?.overrideDeadline ? ` · ${t.overrideNote}` : ''}`;
                          if (e.type === 'PASSENGERS_UPDATED') detail = fmt(t.passengersN, { n: str(d, 'passengers') });
                          return (
                            <li key={e.id} className="relative flex gap-3">
                              {i < b.events.length - 1 && <span aria-hidden className="absolute start-4 top-9 bottom-[-12px] w-px bg-border" />}
                              <span className={cn('relative grid size-8 shrink-0 place-items-center rounded-full', ic.tone)}>
                                <Icon className="size-4" aria-hidden />
                              </span>
                              <div className="min-w-0 flex-1 pt-1">
                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                  <span className="text-sm font-medium">{EVENT_LABELS[e.type] ? loc(EVENT_LABELS[e.type]) : e.type}</span>
                                  <span className="num text-xs text-muted">{f.date(e.createdAt, 'dateTime')}</span>
                                </div>
                                {detail && <div className="num mt-0.5 text-xs text-muted">{detail}</div>}
                                {e.actor && <div className="mt-0.5 text-xs text-subtle">{e.actor.fullName}</div>}
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    </Section>
                  </div>

                  <div className="flex flex-col gap-6">
                    <Section title={t.money}>
                      <MoneyRow label={t.pricePerPerson}>{f.money(b.pricePerPerson, b.currencyCode)}</MoneyRow>
                      {Number(b.discountAmount) > 0 && (
                        <MoneyRow label={`${t.discount}${b.discountTitle ? ` (${b.discountTitle})` : ''}`}>− {f.money(b.discountAmount, b.currencyCode)}</MoneyRow>
                      )}
                      {Number(b.surchargePerPerson) > 0 && <MoneyRow label={t.surcharge}>+ {f.money(b.surchargePerPerson, b.currencyCode)}</MoneyRow>}
                      <MoneyRow label={`${t.total} × ${b.passengerCount}`} strong>
                        {f.money(b.totalAmount, b.currencyCode)}
                      </MoneyRow>
                      <MoneyRow label={t.paid}>{f.money(b.paidAmount, b.currencyCode)}</MoneyRow>
                      {Number(b.refundedAmount) > 0 && <MoneyRow label={t.refunded}>− {f.money(b.refundedAmount, b.currencyCode)}</MoneyRow>}
                      <MoneyRow label={t.balance} strong>
                        <BalanceText value={b.balance} currency={b.currencyCode} className="text-lg" />
                      </MoneyRow>
                      {b.costPerPerson !== undefined && b.costPerPerson !== null && (
                        <MoneyRow label={t.cost} className="text-xs">
                          {f.money(b.costPerPerson, b.currencyCode)}
                        </MoneyRow>
                      )}
                    </Section>
                    <Section title={t.eyebrow}>
                      <dl className="grid grid-cols-2 gap-4">
                        <Field label={t.payer} className="col-span-2">
                          <Link href={`/dashboard/customers/${b.payer.id}`} className="hover:text-primary hover:underline">
                            {b.payer.fullName}
                          </Link>{' '}
                          <span className="ltr-nums text-xs text-muted" dir="ltr">
                            {b.payer.phone}
                          </span>
                        </Field>
                        <Field label={t.branch}>{b.branch.name}</Field>
                        <Field label={t.createdBy}>{b.createdBy.fullName}</Field>
                        <Field label={t.createdAt}>
                          <span className="num">{f.date(b.createdAt, 'dateTime')}</span>
                        </Field>
                        {b.confirmedAt && (
                          <Field label={t.confirmedAt}>
                            <span className="num">{f.date(b.confirmedAt, 'dateTime')}</span>
                          </Field>
                        )}
                        {b.pickupPoint && (
                          <Field label={t.pickup} className="col-span-2">
                            {b.pickupPoint.city.nameAr} {b.pickupPoint.pickupTime && <span className="num text-muted">· {b.pickupPoint.pickupTime}</span>}
                          </Field>
                        )}
                        {b.cancelledAt && (
                          <Field label={t.cancelledAt}>
                            <span className="num">{f.date(b.cancelledAt, 'dateTime')}</span>
                          </Field>
                        )}
                        {b.cancelReason && (
                          <Field label={t.cancelReason} className="col-span-2">
                            {b.cancelReason}
                          </Field>
                        )}
                        {b.convertedFrom && (
                          <Field label={t.fromRequest}>
                            <span className="num">{b.convertedFrom.requestNo}</span>
                          </Field>
                        )}
                        {b.notes && (
                          <Field label={t.notes} className="col-span-2">
                            {b.notes}
                          </Field>
                        )}
                      </dl>
                    </Section>
                  </div>
                </div>

                {dialog === 'pay' && <PaymentDialog booking={b} onClose={() => setDialog(null)} />}
                {dialog === 'passengers' && <PassengersDialog booking={b} onClose={() => setDialog(null)} />}
                {dialog === 'transfer' && <TransferDialog booking={b} onClose={() => setDialog(null)} />}
                {refunding && <RefundDialog payment={refunding} refundable={refunding.refundable} currency={b.currencyCode} onClose={() => setRefunding(null)} />}
                {suggestions && suggestions.length > 0 && <WaitlistDialog suggestions={suggestions} onClose={() => setSuggestions(undefined)} />}

                <ConfirmDialog
                  open={dialog === 'confirm'}
                  onOpenChange={(o) => !o && setDialog(null)}
                  title={t.confirmTitle}
                  description={
                    <>
                      {fmt(t.confirmBody, { n: b.passengerCount })}
                      {blockers.length > 0 && (
                        <span className="mt-2 block text-warning">
                          {blockers.map((x) => (
                            <span key={x} className="block">
                              • {x}
                            </span>
                          ))}
                        </span>
                      )}
                    </>
                  }
                  confirmLabel={b.status === 'WAITLIST' ? t.promote : t.confirm}
                  onConfirm={async () => {
                    try {
                      const r = await api.post<BookingDetailT>(`/bookings/${b.id}/confirm`);
                      if (r.seatsUnavailable) toast.warning(t.waitlisted);
                      else toast.success(t.confirmed);
                      await invalidate('/bookings', '/trips', '/programs', '/offers');
                    } catch (e) {
                      const hint = e instanceof ApiError && (e.status === 409 || e.status === 400) ? blockers.join(' ') : '';
                      toast.error(t.confirmFailed, { description: [errorMessage(e), hint].filter(Boolean).join(' — '), duration: 10000 });
                      throw e;
                    }
                  }}
                />
                <ConfirmDialog
                  open={dialog === 'cancel'}
                  onOpenChange={(o) => !o && setDialog(null)}
                  title={t.cancelTitle}
                  description={t.cancelBody}
                  destructive
                  reason
                  reasonLabel={t.reason}
                  confirmLabel={t.cancel}
                  onConfirm={async (reason) => {
                    try {
                      const r = await api.post<BookingDetailT>(`/bookings/${b.id}/cancel`, { reason });
                      toast.success(t.cancelled);
                      await invalidate('/bookings', '/trips', '/programs', '/offers');
                      if (r.waitlistSuggestions?.length) setSuggestions(r.waitlistSuggestions);
                    } catch (e) {
                      toast.error(errorMessage(e));
                      throw e;
                    }
                  }}
                />
              </>
            );
          })()}
        </div>
      )}
    </QueryState>
  );
}
