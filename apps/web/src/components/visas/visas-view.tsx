'use client';

import { LABELS, VISA_STATUSES, type VisaStatus } from '@travelos/shared';
import { BellRing, Info, Loader2, Pencil, X } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ResourceTable, FilterSelect, type ResourceColumn } from '@/components/data/resource-table';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { useOfficeSettings } from '@/lib/auth';
import { useApiMutation, useInvalidate } from '@/lib/hooks';
import { defineMessages, fmt, useLocale, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import type { VisaRow } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';
import { dateInput } from '../customers/shared';

const m = defineMessages({
  ar: {
    eyebrow: 'الحجوزات',
    title: 'التأشيرات',
    description: 'يُفتح ملف تأشيرة تلقائياً لكل راكب في رحلة خارجية ولكل دولة يزورها. تابع حالته حتى الموافقة.',
    traveller: 'المسافر',
    phone: 'الهاتف',
    country: 'الدولة',
    booking: 'الحجز',
    trip: 'الرحلة / البرنامج',
    passport: 'الجواز',
    status: 'الحالة',
    visaNo: 'رقم التأشيرة',
    expires: 'تنتهي',
    fee: 'الرسم',
    dueSoon: 'قبل السفر بأيام قليلة',
    dueSoonHint: 'غير الموافق عليها لرحلات تنطلق خلال {n} يوماً',
    filteredTrip: 'رحلة محددة',
    filteredProgram: 'برنامج محدد',
    clear: 'إزالة',
    search: 'اسم المسافر أو رقم الحجز أو رقم التأشيرة…',
    empty: 'لا توجد ملفات تأشيرات',
    emptyBody: 'تظهر هنا عند حجز رحلة خارجية.',
    editTitle: 'تحديث التأشيرة',
    vis02: 'عند «موافق عليها» مع رقم تأشيرة، تُحفظ التأشيرة تلقائياً ضمن وثائق العميل (VIS-02).',
    notes: 'ملاحظات',
    saved: 'تم تحديث التأشيرة',
    badFee: 'رسم غير صالح',
    needNumber: 'أدخل رقم التأشيرة لتُحفظ ضمن وثائق العميل',
  },
  en: {
    eyebrow: 'Bookings',
    title: 'Visas',
    description: 'A visa file opens automatically for every passenger on an international trip and every country visited. Track it until approval.',
    traveller: 'Traveller',
    phone: 'Phone',
    country: 'Country',
    booking: 'Booking',
    trip: 'Trip / program',
    passport: 'Passport',
    status: 'Status',
    visaNo: 'Visa no.',
    expires: 'Expires',
    fee: 'Fee',
    dueSoon: 'Departing soon',
    dueSoonHint: 'Not approved, for trips departing within {n} days',
    filteredTrip: 'One trip',
    filteredProgram: 'One program',
    clear: 'Remove',
    search: 'Traveller, booking no. or visa no.…',
    empty: 'No visa files',
    emptyBody: 'They appear here when an international trip is booked.',
    editTitle: 'Update visa',
    vis02: 'When “approved” with a visa number, the visa is saved to the customer’s documents automatically (VIS-02).',
    notes: 'Notes',
    saved: 'Visa updated',
    badFee: 'Invalid fee',
    needNumber: 'Enter the visa number so it is saved to the customer’s documents',
  },
});

function departure(v: VisaRow) {
  const b = v.passenger.booking;
  return b.trip?.startsAt ?? b.program?.legs[0]?.trip.startsAt ?? b.offer?.validFrom ?? null;
}

export function VisasView() {
  const t = useMessages(m);
  const c = useMessages(common);
  const { locale } = useLocale();
  const f = useFormat();
  const settings = useOfficeSettings().data;
  const [editing, setEditing] = useState<VisaRow | null>(null);

  const columns = useMemo<ResourceColumn<VisaRow>[]>(
    () => [
      {
        id: 'traveller',
        header: t.traveller,
        cell: (v) => (
          <Link href={`/dashboard/customers/${v.passenger.customer.id}`} onClick={(e) => e.stopPropagation()} className="font-medium hover:text-primary hover:underline">
            {v.passenger.customer.fullName}
          </Link>
        ),
        print: (v) => v.passenger.customer.fullName,
      },
      { id: 'phone', header: t.phone, cell: (v) => <span className="ltr-nums" dir="ltr">{v.passenger.customer.phone}</span> },
      { id: 'country', header: t.country, cell: (v) => v.country.nameAr },
      {
        id: 'booking',
        header: t.booking,
        cell: (v) => (
          <Link href={`/dashboard/bookings/${v.passenger.booking.id}`} onClick={(e) => e.stopPropagation()} className="num text-primary hover:underline">
            {v.passenger.booking.bookingNo}
          </Link>
        ),
        print: (v) => v.passenger.booking.bookingNo,
      },
      {
        id: 'trip',
        header: t.trip,
        cell: (v) => {
          const b = v.passenger.booking;
          const dep = departure(v);
          const soon = dep && new Date(dep).getTime() - Date.now() < (settings?.visaWarningDays ?? 14) * 86_400_000 && v.status !== 'APPROVED';
          return (
            <div className="flex flex-col">
              <span className="num text-xs font-medium">{b.trip?.code ?? b.program?.code ?? b.offer?.title}</span>
              {dep && <span className={cn('num text-xs', soon ? 'font-medium text-danger' : 'text-muted')}>{f.date(dep, 'medium')}</span>}
            </div>
          );
        },
        print: (v) => `${v.passenger.booking.trip?.code ?? v.passenger.booking.program?.code ?? ''} ${departure(v) ? f.date(departure(v), 'short') : ''}`,
      },
      {
        id: 'passport',
        header: t.passport,
        cell: (v) => (v.passenger.document ? <span className="num ltr-nums" dir="ltr">{v.passenger.document.docNumber}</span> : '—'),
        print: (v) => v.passenger.document?.docNumber ?? '—',
      },
      { id: 'status', header: t.status, cell: (v) => <StatusBadge kind="visa" status={v.status} />, print: (v) => LABELS.visaStatus[v.status][locale] },
      { id: 'visaNo', header: t.visaNo, cell: (v) => <span className="num ltr-nums">{v.visaNumber ?? '—'}</span> },
      { id: 'expires', header: t.expires, cell: (v) => <span className="num">{v.expiresOn ? f.date(v.expiresOn, 'medium') : '—'}</span> },
      { id: 'fee', header: t.fee, align: 'end', cell: (v) => <span className="num">{v.fee ? f.number(v.fee, { maximumFractionDigits: 2 }) : '—'}</span> },
      {
        id: 'actions',
        header: c.actions,
        screenOnly: true,
        align: 'end',
        cell: (v) => (
          <Button size="icon-sm" variant="ghost" aria-label={`${c.edit} ${v.passenger.customer.fullName}`} onClick={() => setEditing(v)}>
            <Pencil />
          </Button>
        ),
      },
    ],
    [t, c, f, locale, settings?.visaWarningDays],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <ResourceTable<VisaRow>
        endpoint="/visas"
        columns={columns}
        exportTitle={t.title}
        searchPlaceholder={t.search}
        filterKeys={['status', 'dueSoon', 'tripId', 'programId']}
        minWidth={1150}
        filters={(fl, set) => (
          <>
            <FilterSelect label={t.status} value={fl.status} onChange={(v) => set({ status: v })} options={VISA_STATUSES.map((s) => ({ value: s, label: LABELS.visaStatus[s][locale] }))} />
            <Button
              type="button"
              size="sm"
              variant={fl.dueSoon === 'true' ? 'ink' : 'secondary'}
              className="h-10"
              aria-pressed={fl.dueSoon === 'true'}
              title={fmt(t.dueSoonHint, { n: settings?.visaWarningDays ?? 14 })}
              onClick={() => set({ dueSoon: fl.dueSoon === 'true' ? undefined : 'true' })}
            >
              <BellRing /> {t.dueSoon}
            </Button>
            {(['tripId', 'programId'] as const)
              .filter((k) => fl[k])
              .map((k) => (
                <Badge key={k} tone="primary" className="h-8 gap-2 ps-3 pe-1">
                  {k === 'tripId' ? t.filteredTrip : t.filteredProgram}
                  <button type="button" className="grid size-6 place-items-center rounded-full hover:bg-primary/15" aria-label={t.clear} onClick={() => set({ [k]: undefined })}>
                    <X className="size-3.5" />
                  </button>
                </Badge>
              ))}
          </>
        )}
        onRowClick={(v) => setEditing(v)}
        getRowId={(v) => v.id}
        empty={{ title: t.empty, description: t.emptyBody }}
      />
      {editing && <VisaDialog visa={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function VisaDialog({ visa, onClose }: { visa: VisaRow; onClose: () => void }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const { locale } = useLocale();
  const invalidate = useInvalidate();
  const [status, setStatus] = useState<VisaStatus>(visa.status);
  const [visaNumber, setVisaNumber] = useState(visa.visaNumber ?? '');
  const [expiresOn, setExpiresOn] = useState(dateInput(visa.expiresOn));
  const [fee, setFee] = useState(visa.fee ?? '');
  const [notes, setNotes] = useState(visa.notes ?? '');
  const [feeError, setFeeError] = useState<string>();

  const save = useApiMutation(
    () =>
      api.patch(`/visas/${visa.id}`, {
        status,
        visaNumber: visaNumber.trim() || undefined,
        expiresOn: expiresOn || undefined,
        fee: fee.trim() || undefined,
        notes: notes.trim() || undefined,
      }),
    {
      success: t.saved,
      onSuccess: async () => {
        await invalidate('/visas', '/bookings', '/customers');
        onClose();
      },
    },
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t.editTitle}</DialogTitle>
          <DialogDescription>
            {visa.passenger.customer.fullName} · {visa.country.nameAr} · <span className="num">{visa.passenger.booking.bookingNo}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-start gap-2 rounded-field bg-info/10 p-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
          {t.vis02}
        </div>
        <form
          id="visa-form"
          className="grid gap-4 sm:grid-cols-2"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (fee.trim() && !/^\d{1,12}(\.\d{1,2})?$/.test(fee.trim())) return setFeeError(t.badFee);
            setFeeError(undefined);
            save.mutate(undefined);
          }}
        >
          <FormField label={t.status} required>
            <Select value={status} onValueChange={(v) => setStatus(v as VisaStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISA_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {LABELS.visaStatus[s][locale]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label={t.visaNo} hint={status === 'APPROVED' && !visaNumber.trim() ? t.needNumber : undefined}>
            <Input dir="ltr" value={visaNumber} onChange={(e) => setVisaNumber(e.target.value)} maxLength={60} />
          </FormField>
          <FormField label={t.expires}>
            <Input type="date" dir="ltr" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
          </FormField>
          <FormField label={t.fee} error={feeError}>
            <Input dir="ltr" inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} />
          </FormField>
          <FormField label={t.notes} className="sm:col-span-2">
            <Textarea rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {c.cancel}
          </Button>
          <Button type="submit" form="visa-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />} {c.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
