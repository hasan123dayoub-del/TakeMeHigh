'use client';

import { CalendarRange, Link2, Loader2, MapPin, MessageCircle, Phone, Search, Send, Users, Wand2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Field } from '@/components/data/states';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useInvalidate, useList, useLookups, useName, useResource } from '@/lib/hooks';
import { defineMessages, LABELS, useLocale, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import type { BookingListItem, CustomRequest } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';
import { useDebounced, waLink } from '../customers/shared';
import { RequestServices } from './requests-view';

const m = defineMessages({
  ar: {
    request: 'طلب رحلة مخصصة',
    whatsapp: 'واتساب',
    call: 'اتصال',
    route: 'المسار',
    dates: 'الفترة المطلوبة',
    people: 'عدد الأشخاص',
    category: 'التصنيف',
    services: 'الخدمات المطلوبة',
    message: 'رسالة الزبون',
    branch: 'الفرع',
    unassigned: 'غير مسند',
    handledBy: 'عالجه',
    converted: 'تحوّل إلى الحجز',
    handle: 'المعالجة',
    status: 'الحالة',
    staffNotes: 'ملاحظات الموظفين',
    saveStatus: 'حفظ',
    saved: 'تم حفظ الطلب',
    assign: 'إسناد إلى فرع',
    assignBtn: 'إسناد',
    assigned: 'تم إسناد الطلب',
    actions: 'الخطوة التالية',
    draft: 'إنشاء مسودة رحلة',
    draftHint: 'تُنشأ رحلة «مسودة» بمسار الطلب وتواريخه وعدد أشخاصه، وتُذكر الخدمات المطلوبة في وصفها لتكمل بناءها.',
    category2: 'تصنيف الرحلة',
    deadline: 'آخر موعد للتسجيل',
    deadlineHint: 'يجب أن يكون قبل موعد الانطلاق المطلوب ({d}).',
    create: 'إنشاء المسودة',
    drafted: 'تم إنشاء مسودة الرحلة',
    convert: 'ربط بحجز',
    convertHint: 'ابحث عن الحجز الذي تحوّل إليه هذا الطلب؛ تصبح حالة الطلب «تم التحويل».',
    searchBooking: 'رقم الحجز أو اسم الدافع أو الهاتف…',
    link: 'ربط',
    linked: 'تم ربط الطلب بالحجز',
    noBookings: 'لا توجد حجوزات مطابقة.',
    required: 'هذا الحقل مطلوب',
    closed: 'هذا الطلب تحوّل إلى حجز ولا يُعدّل.',
  },
  en: {
    request: 'Custom trip request',
    whatsapp: 'WhatsApp',
    call: 'Call',
    route: 'Route',
    dates: 'Requested dates',
    people: 'People',
    category: 'Category',
    services: 'Requested services',
    message: 'Customer message',
    branch: 'Branch',
    unassigned: 'Unassigned',
    handledBy: 'Handled by',
    converted: 'Converted to booking',
    handle: 'Handling',
    status: 'Status',
    staffNotes: 'Staff notes',
    saveStatus: 'Save',
    saved: 'Request saved',
    assign: 'Assign to a branch',
    assignBtn: 'Assign',
    assigned: 'Request assigned',
    actions: 'Next step',
    draft: 'Create draft trip',
    draftHint: 'A draft trip is created with the request’s route, dates and group size; the requested services are listed in its description.',
    category2: 'Trip category',
    deadline: 'Registration deadline',
    deadlineHint: 'Must be before the requested departure ({d}).',
    create: 'Create draft',
    drafted: 'Draft trip created',
    convert: 'Link a booking',
    convertHint: 'Find the booking this request turned into; the request becomes “converted”.',
    searchBooking: 'Booking no., payer or phone…',
    link: 'Link',
    linked: 'Request linked to the booking',
    noBookings: 'No matching bookings.',
    required: 'This field is required',
    closed: 'This request was converted into a booking and is read-only.',
  },
});

export function RequestSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const t = useMessages(m);
  const { locale } = useLocale();
  const f = useFormat();
  const name = useName();
  const { isAdmin, can } = useAuth();
  const lookups = useLookups();
  const invalidate = useInvalidate();
  const q = useResource<CustomRequest>(id ? `/requests/${id}` : null);
  const r = q.data;
  const canManage = can('requests.manage');
  const [status, setStatus] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [branchId, setBranchId] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'draft' | 'convert' | null>(null);

  // copy the loaded request into the form once per request (state adjusted during render)
  const [loadedFor, setLoadedFor] = useState<CustomRequest | null>(null);
  if (r && r !== loadedFor) {
    setLoadedFor(r);
    setStatus(r.status);
    setNotes(r.staffNotes ?? '');
    setBranchId(r.assignedBranch?.id ?? '');
  }

  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try {
      await fn();
      toast.success(ok);
      await invalidate('/requests');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const locked = r?.status === 'CONVERTED';

  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="max-w-xl">
        <SheetHeader>
          <SheetTitle>
            {t.request} {r && <span className="num">{r.requestNo}</span>}
          </SheetTitle>
          <SheetDescription>{r ? f.date(r.createdAt, 'dateTime') : ''}</SheetDescription>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-5 pb-6">
          {!r ? (
            <>
              <Skeleton className="h-24" />
              <Skeleton className="h-40" />
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 rounded-field border border-border bg-surface p-4">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{r.contactName}</div>
                  <div className="ltr-nums text-sm text-muted" dir="ltr">
                    {r.contactPhone}
                  </div>
                </div>
                <StatusBadge kind="request" status={r.status} />
                <div className="flex w-full gap-2">
                  <Button size="sm" asChild className="bg-[#1f9d55] text-white hover:bg-[#188046]">
                    <a href={waLink(r.contactPhone)} target="_blank" rel="noreferrer">
                      <MessageCircle /> {t.whatsapp}
                    </a>
                  </Button>
                  <Button size="sm" variant="secondary" asChild>
                    <a href={`tel:${r.contactPhone}`}>
                      <Phone /> {t.call}
                    </a>
                  </Button>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-4">
                <Field label={t.route}>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-muted" aria-hidden />
                    {name(r.originCity)} {locale === 'ar' ? '←' : '→'} {name(r.destinationCity)}
                  </span>
                </Field>
                <Field label={t.dates}>
                  <span className="num inline-flex items-center gap-1.5">
                    <CalendarRange className="size-3.5 text-muted" aria-hidden />
                    {f.date(r.desiredFrom, 'medium')} – {f.date(r.desiredTo, 'medium')}
                  </span>
                </Field>
                <Field label={t.people}>
                  <span className="num inline-flex items-center gap-1.5">
                    <Users className="size-3.5 text-muted" aria-hidden />
                    {r.passengersCount}
                  </span>
                </Field>
                <Field label={t.category}>{r.category?.nameAr ?? '—'}</Field>
                <Field label={t.services} className="col-span-2">
                  <RequestServices r={r} />
                </Field>
                {r.message && (
                  <Field label={t.message} className="col-span-2">
                    <span className="whitespace-pre-line">{r.message}</span>
                  </Field>
                )}
                <Field label={t.branch}>{r.assignedBranch?.name ?? <Badge tone="warning" size="sm">{t.unassigned}</Badge>}</Field>
                <Field label={t.handledBy}>{r.handledBy?.fullName ?? '—'}</Field>
                {r.convertedBooking && (
                  <Field label={t.converted} className="col-span-2">
                    <Link href={`/dashboard/bookings/${r.convertedBooking.id}`} className="num text-primary hover:underline">
                      {r.convertedBooking.bookingNo}
                    </Link>
                  </Field>
                )}
              </dl>

              {locked && <p className="rounded-field bg-success/10 p-3 text-sm">{t.closed}</p>}

              {canManage && !locked && (
                <section className="flex flex-col gap-3 rounded-field border border-border p-4">
                  <h3 className="heading-display text-[14px]">{t.handle}</h3>
                  <FormField label={t.status}>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['NEW', 'CONTACTED', 'REJECTED'] as const).map((s) => (
                          <SelectItem key={s} value={s}>
                            {LABELS.requestStatus[s][locale]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label={t.staffNotes}>
                    <Textarea rows={3} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </FormField>
                  <Button
                    className="self-start"
                    size="sm"
                    disabled={busy === 'save'}
                    onClick={() => run('save', () => api.patch(`/requests/${r.id}`, { status, staffNotes: notes.trim() || undefined }), t.saved)}
                  >
                    {busy === 'save' && <Loader2 className="animate-spin" />} {t.saveStatus}
                  </Button>
                </section>
              )}

              {canManage && isAdmin && !locked && (
                <section className="flex flex-col gap-3 rounded-field border border-border p-4">
                  <h3 className="heading-display text-[14px]">{t.assign}</h3>
                  <div className="flex gap-2">
                    <Select value={branchId || undefined} onValueChange={setBranchId}>
                      <SelectTrigger className="flex-1">
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
                    <Button
                      variant="secondary"
                      disabled={!branchId || branchId === r.assignedBranch?.id || busy === 'assign'}
                      onClick={() => run('assign', () => api.post(`/requests/${r.id}/assign`, { branchId }), t.assigned)}
                    >
                      {busy === 'assign' ? <Loader2 className="animate-spin" /> : <Send />} {t.assignBtn}
                    </Button>
                  </div>
                </section>
              )}

              {canManage && !locked && (
                <section className="flex flex-col gap-3 rounded-field border border-border p-4">
                  <h3 className="heading-display text-[14px]">{t.actions}</h3>
                  <div className="flex flex-wrap gap-2">
                    {can('trips.manage') && (
                      <Button onClick={() => setDialog('draft')}>
                        <Wand2 /> {t.draft}
                      </Button>
                    )}
                    <Button variant="secondary" onClick={() => setDialog('convert')}>
                      <Link2 /> {t.convert}
                    </Button>
                  </div>
                </section>
              )}
            </>
          )}
        </SheetBody>
      </SheetContent>
      {r && dialog === 'draft' && <DraftTripDialog r={r} onClose={() => setDialog(null)} />}
      {r && dialog === 'convert' && <ConvertDialog r={r} onClose={() => setDialog(null)} />}
    </Sheet>
  );
}

function DraftTripDialog({ r, onClose }: { r: CustomRequest; onClose: () => void }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const f = useFormat();
  const name = useName();
  const router = useRouter();
  const lookups = useLookups();
  const invalidate = useInvalidate();
  const [categoryId, setCategoryId] = useState(r.category?.id ?? '');
  const [deadline, setDeadline] = useState('');
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);

  const submit = async () => {
    setTried(true);
    if (!categoryId || !deadline) return;
    setBusy(true);
    try {
      const trip = await api.post<{ id: string; code: string }>(`/requests/${r.id}/draft-trip`, { categoryId, registrationDeadline: new Date(deadline).toISOString() });
      toast.success(`${t.drafted} ${trip.code ?? ''}`);
      await invalidate('/requests', '/trips');
      router.push(`/dashboard/trips/${trip.id}`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.draft}</DialogTitle>
          <DialogDescription>{t.draftHint}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <FormField label={t.category2} required error={tried && !categoryId ? t.required : undefined}>
            <Select value={categoryId || undefined} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {(lookups.data?.categories ?? []).map((x) => (
                  <SelectItem key={x.id} value={x.id}>
                    {name(x)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label={t.deadline} required hint={t.deadlineHint.replace('{d}', f.date(r.desiredFrom, 'medium'))} error={tried && !deadline ? t.required : undefined}>
            <Input type="datetime-local" dir="ltr" value={deadline} max={`${r.desiredFrom.slice(0, 10)}T08:00`} onChange={(e) => setDeadline(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {c.cancel}
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} {t.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConvertDialog({ r, onClose }: { r: CustomRequest; onClose: () => void }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const f = useFormat();
  const invalidate = useInvalidate();
  const [text, setText] = useState(r.contactPhone);
  const q = useDebounced(text.trim(), 300);
  const list = useList<BookingListItem>('/bookings', { search: q, pageSize: 8 }, { enabled: q.length >= 2 });
  const [busy, setBusy] = useState<string | null>(null);

  const link = async (b: BookingListItem) => {
    setBusy(b.id);
    try {
      await api.post(`/requests/${r.id}/convert`, { bookingId: b.id });
      toast.success(t.linked);
      await invalidate('/requests');
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t.convert}</DialogTitle>
          <DialogDescription>{t.convertHint}</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={t.searchBooking} aria-label={t.searchBooking} className="ps-10" autoFocus />
        </div>
        <ul className="flex max-h-80 flex-col divide-y divide-border overflow-y-auto rounded-field border border-border">
          {list.data?.data.length === 0 && <li className="p-3 text-sm text-muted">{t.noBookings}</li>}
          {list.data?.data.map((b) => (
            <li key={b.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="num font-medium">{b.bookingNo}</span>
                  <StatusBadge kind="booking" status={b.status} size="sm" />
                </div>
                <div className="truncate text-xs text-muted">
                  {b.payer.fullName} · {b.targetTitle} · <span className="num">{f.date(b.createdAt, 'short')}</span>
                </div>
              </div>
              <Button size="sm" variant="secondary" disabled={busy === b.id} onClick={() => link(b)}>
                {busy === b.id && <Loader2 className="animate-spin" />} {t.link}
              </Button>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {c.cancel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
