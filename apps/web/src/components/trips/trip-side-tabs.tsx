'use client';

import { LABELS } from '@travelos/shared';
import { Clock, Gavel, ImagePlus, Layers, Loader2, MapPin, Plus, Tag, Trash2, UserRound, Users } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/data/confirm-dialog';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { ApiError, api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useInvalidate, useList, useName } from '@/lib/hooks';
import { defineMessages, useLocale, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import type { StaffUser } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';
import { CityCombobox } from './city-combobox';
import { amountPattern, uploadImage, type TripFull } from './trip-utils';

const m = defineMessages({
  ar: {
    pickupTitle: 'نقاط الانطلاق',
    pickupHint: 'مدن إضافية يمكن للركاب الصعود منها. السعر الأساسي واحد للجميع، ويُضاف فقط مبلغ الإضافة الخاص بنقطة الانطلاق (BR-15).',
    origin: 'نقطة الانطلاق الأساسية',
    noSurcharge: 'بدون إضافة',
    addPickup: 'إضافة نقطة',
    city: 'المدينة',
    time: 'وقت الصعود',
    surcharge: 'مبلغ الإضافة',
    surchargeHint: 'يحدده مدير المكتب فقط.',
    notes: 'ملاحظات',
    pickupAdded: 'تمت إضافة نقطة الانطلاق',
    pickupDeleted: 'تم حذف نقطة الانطلاق',
    deletePickup: 'حذف نقطة الانطلاق؟',
    deletePickupBody: 'لا يمكن حذف نقطة يصعد منها ركاب في حجوزات فعّالة.',
    required: 'اختر المدينة',
    badAmount: 'المبلغ غير صحيح',
    guidesTitle: 'الأدلة السياحيون',
    guidesHint: 'الأدلة المسندون إلى هذه الرحلة يرون كشف الركاب ويسجلون الحضور.',
    editGuides: 'تعديل الأدلة',
    noGuides: 'لا يوجد دليل مسند',
    noGuidesBody: 'أسند دليلاً سياحياً من فرع الرحلة.',
    chooseGuides: 'اختر الأدلة',
    chooseGuidesHint: 'أدلة فعّالون من فرع الرحلة (أو من أي فرع للرحلات المشتركة).',
    noCandidates: 'لا يوجد أدلة متاحون.',
    guidesSaved: 'تم حفظ الأدلة',
    languages: 'اللغات',
    license: 'الترخيص',
    imagesTitle: 'معرض الصور',
    imagesHint: 'صور إضافية تظهر في صفحة الرحلة العامة (حتى 20 صورة).',
    upload: 'رفع صورة',
    caption: 'وصف الصورة',
    saveImages: 'حفظ المعرض',
    imagesSaved: 'تم حفظ المعرض',
    noImages: 'لا توجد صور',
    termsTitle: 'الشروط والأحكام',
    noTerms: 'لم تُكتب شروط لهذه الرحلة. يمكن إضافتها من صفحة التعديل.',
    decisionsTitle: 'سجل القرارات',
    decisionsHint: 'قرارات ما بعد إغلاق التسجيل (CLS-05).',
    noDecisions: 'لا توجد قرارات بعد.',
    passengersAt: 'الركاب وقتها',
    prevDeadline: 'الموعد السابق',
    newDeadline: 'الموعد الجديد',
    by: 'بواسطة',
    programsTitle: 'البرامج التي تتضمن الرحلة',
    noPrograms: 'الرحلة ليست ضمن أي برنامج.',
    leg: 'المرحلة',
    offersTitle: 'العروض والخصومات',
    noOffers: 'لا توجد عروض على هذه الرحلة.',
    discount: 'خصم',
    active: 'فعّال',
    inactive: 'معطّل',
    created: 'أنشأها',
  },
  en: {
    pickupTitle: 'Boarding points',
    pickupHint: 'Extra cities where passengers can board. The base price is the same for everyone; only the boarding point surcharge is added (BR-15).',
    origin: 'Main departure point',
    noSurcharge: 'No surcharge',
    addPickup: 'Add point',
    city: 'City',
    time: 'Boarding time',
    surcharge: 'Surcharge',
    surchargeHint: 'Set by the Admin only.',
    notes: 'Notes',
    pickupAdded: 'Boarding point added',
    pickupDeleted: 'Boarding point deleted',
    deletePickup: 'Delete this boarding point?',
    deletePickupBody: 'A point used by active bookings cannot be deleted.',
    required: 'Choose the city',
    badAmount: 'Invalid amount',
    guidesTitle: 'Tour guides',
    guidesHint: 'Guides assigned to this trip see the passenger list and record attendance.',
    editGuides: 'Edit guides',
    noGuides: 'No guide assigned',
    noGuidesBody: 'Assign a tour guide from the trip’s branch.',
    chooseGuides: 'Choose guides',
    chooseGuidesHint: 'Active guides of the trip’s branch (any branch for shared trips).',
    noCandidates: 'No guides available.',
    guidesSaved: 'Guides saved',
    languages: 'Languages',
    license: 'License',
    imagesTitle: 'Gallery',
    imagesHint: 'Extra images on the public trip page (up to 20).',
    upload: 'Upload image',
    caption: 'Caption',
    saveImages: 'Save gallery',
    imagesSaved: 'Gallery saved',
    noImages: 'No images',
    termsTitle: 'Terms and conditions',
    noTerms: 'No terms for this trip yet. Add them from the edit page.',
    decisionsTitle: 'Decision history',
    decisionsHint: 'Decisions taken after registration closed (CLS-05).',
    noDecisions: 'No decisions yet.',
    passengersAt: 'Passengers then',
    prevDeadline: 'Previous deadline',
    newDeadline: 'New deadline',
    by: 'by',
    programsTitle: 'Programs containing this trip',
    noPrograms: 'This trip is not part of any program.',
    leg: 'Leg',
    offersTitle: 'Offers and discounts',
    noOffers: 'No offers target this trip.',
    discount: 'Discount',
    active: 'Active',
    inactive: 'Inactive',
    created: 'Created by',
  },
});

// ------------------------------------------------------------------ pickup points (TRP-09)

export function PickupPointsTab({ trip, editable }: { trip: TripFull; editable: boolean }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const f = useFormat();
  const name = useName();
  const invalidate = useInvalidate();
  const canSurcharge = useAuth().can('pricing.set_profit');
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<TripFull['pickupPoints'][number] | null>(null);
  const [cityId, setCityId] = useState('');
  const [time, setTime] = useState('');
  const [surcharge, setSurcharge] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const add = async () => {
    setErrors([]);
    if (!cityId) return setErrors([t.required]);
    if (canSurcharge && surcharge && !amountPattern.test(surcharge)) return setErrors([t.badAmount]);
    setBusy(true);
    try {
      await api.post(`/trips/${trip.id}/pickup-points`, {
        cityId,
        pickupTime: time || undefined,
        surcharge: canSurcharge && surcharge ? surcharge : undefined,
        notes: notes.trim() || undefined,
      });
      await invalidate('/trips');
      toast.success(t.pickupAdded);
      setAdding(false);
      setCityId('');
      setTime('');
      setSurcharge('');
      setNotes('');
    } catch (e) {
      setErrors(e instanceof ApiError ? e.messages : [errorMessage(e)]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t.pickupTitle}</CardTitle>
          <CardDescription className="max-w-2xl">{t.pickupHint}</CardDescription>
        </div>
        {editable && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus /> {t.addPickup}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          <li className="flex items-center gap-3 rounded-tile border border-primary/30 bg-primary/6 p-4">
            <span className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground">
              <MapPin className="size-[18px]" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{name(trip.originCity)}</div>
              <div className="text-xs text-muted">
                {t.origin} · <span className="num">{f.date(trip.startsAt, 'time')}</span>
              </div>
            </div>
            <Badge tone="primary" size="sm">
              {t.noSurcharge}
            </Badge>
          </li>
          {trip.pickupPoints.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-tile border border-border bg-surface-raised p-4">
              <span className="grid size-10 place-items-center rounded-full bg-surface text-muted ring-1 ring-border">
                <MapPin className="size-[18px]" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-medium">{name(p.city)}</div>
                <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                  {p.pickupTime && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" aria-hidden />
                      <span className="num ltr-nums">{p.pickupTime}</span>
                    </span>
                  )}
                  {p.notes && <span className="truncate">{p.notes}</span>}
                </div>
              </div>
              <span className={cn('num text-sm font-medium', Number(p.surcharge) > 0 ? 'text-foreground' : 'text-muted')}>
                {Number(p.surcharge) > 0 ? `+ ${f.money(p.surcharge, trip.currencyCode)}` : t.noSurcharge}
              </span>
              {editable && (
                <Button size="icon-sm" variant="ghost" aria-label={`${t.deletePickup} ${name(p.city)}`} onClick={() => setDeleting(p)}>
                  <Trash2 className="text-danger" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      </CardContent>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.addPickup}</DialogTitle>
            <DialogDescription>{t.pickupHint}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t.city} required className="sm:col-span-2">
              <CityCombobox value={cityId} onChange={setCityId} exclude={[trip.originCityId, ...trip.pickupPoints.map((p) => p.cityId)]} />
            </FormField>
            <FormField label={t.time}>
              <Input type="time" dir="ltr" className="num" value={time} onChange={(e) => setTime(e.target.value)} />
            </FormField>
            {canSurcharge ? (
              <FormField label={`${t.surcharge} (${trip.currencyCode})`}>
                <Input dir="ltr" inputMode="decimal" className="num" placeholder="0" value={surcharge} onChange={(e) => setSurcharge(e.target.value)} />
              </FormField>
            ) : (
              <p className="self-end text-xs text-muted">{t.surchargeHint}</p>
            )}
            <FormField label={t.notes} className="sm:col-span-2">
              <Input value={notes} maxLength={255} onChange={(e) => setNotes(e.target.value)} />
            </FormField>
            {errors.length > 0 && (
              <ul role="alert" className="list-disc rounded-tile border border-danger/30 bg-danger/8 py-3 ps-8 pe-4 text-sm text-danger sm:col-span-2">
                {errors.map((e) => (
                  <li key={e} dir="auto">{e}</li>
                ))}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setAdding(false)}>
              {c.cancel}
            </Button>
            <Button onClick={add} disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} {c.add}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t.deletePickup}
        description={t.deletePickupBody}
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await api.delete(`/trips/${trip.id}/pickup-points/${deleting.id}`);
            await invalidate('/trips');
            toast.success(t.pickupDeleted);
          } catch (e) {
            toast.error(errorMessage(e));
            throw e;
          }
        }}
      />
    </Card>
  );
}

// ------------------------------------------------------------------ guides (TRP-11)

export function GuidesTab({ trip, editable }: { trip: TripFull; editable: boolean }) {
  const t = useMessages(m);
  const [editing, setEditing] = useState(false);
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t.guidesTitle}</CardTitle>
          <CardDescription>{t.guidesHint}</CardDescription>
        </div>
        {editable && (
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            <Users /> {t.editGuides}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {trip.guides.length === 0 ? (
          <EmptyState icon={UserRound} size="sm" title={t.noGuides} description={editable ? t.noGuidesBody : undefined} />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {trip.guides.map((g) => (
              <li key={g.userId} className="flex items-start gap-3 rounded-tile border border-border bg-surface-raised p-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft font-display text-lg text-primary">{g.user.fullName.charAt(0)}</span>
                <div className="min-w-0 text-sm">
                  <div className="font-medium">{g.user.fullName}</div>
                  {g.user.phone && <div className="ltr-nums text-xs text-muted">{g.user.phone}</div>}
                  {g.user.guideProfile?.languages && (
                    <div className="mt-1 text-xs text-muted">
                      {t.languages}: {g.user.guideProfile.languages}
                    </div>
                  )}
                  {g.user.guideProfile?.licenseNo && (
                    <div className="text-xs text-muted">
                      {t.license}: <span className="num ltr-nums">{g.user.guideProfile.licenseNo}</span>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      {editing && <GuidesDialog trip={trip} onClose={() => setEditing(false)} />}
    </Card>
  );
}

function GuidesDialog({ trip, onClose }: { trip: TripFull; onClose: () => void }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const invalidate = useInvalidate();
  const canList = useAuth().can('users.view');
  const list = useList<StaffUser>('/users', { roleCode: 'TOUR_GUIDE', isActive: true, pageSize: 100 }, { enabled: canList });
  const [selected, setSelected] = useState<string[]>(trip.guides.map((g) => g.userId));
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const candidates = (list.data?.data ?? []).filter((u) => !trip.branchId || u.branch?.id === trip.branchId);

  const save = async () => {
    setBusy(true);
    setErrors([]);
    try {
      await api.put(`/trips/${trip.id}/guides`, { userIds: selected });
      await invalidate('/trips');
      toast.success(t.guidesSaved);
      onClose();
    } catch (e) {
      setErrors(e instanceof ApiError ? e.messages : [errorMessage(e)]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.chooseGuides}</DialogTitle>
          <DialogDescription>{t.chooseGuidesHint}</DialogDescription>
        </DialogHeader>
        <div className="grid max-h-80 gap-2 overflow-y-auto">
          {list.isLoading && <Loader2 className="mx-auto size-5 animate-spin text-muted" />}
          {!list.isLoading && candidates.length === 0 && <p className="py-4 text-center text-sm text-muted">{t.noCandidates}</p>}
          {candidates.map((u) => {
            const on = selected.includes(u.id);
            return (
              <label key={u.id} className={cn('flex cursor-pointer items-center gap-3 rounded-tile border p-3', on ? 'border-primary/40 bg-primary/8' : 'border-border bg-surface-raised')}>
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--primary)]"
                  checked={on}
                  onChange={() => setSelected((s) => (on ? s.filter((x) => x !== u.id) : [...s, u.id]))}
                />
                <div className="min-w-0 flex-1 text-sm">
                  <div className="font-medium">{u.fullName}</div>
                  <div className="text-xs text-muted">
                    {u.branch?.name}
                    {u.guideProfile?.languages ? ` · ${u.guideProfile.languages}` : ''}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
        {errors.length > 0 && <p className="text-sm text-danger">{errors.join(' ')}</p>}
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {c.cancel}
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} {c.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------ images and terms

export function MediaTab({ trip, editable }: { trip: TripFull; editable: boolean }) {
  const t = useMessages(m);
  const invalidate = useInvalidate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState(trip.images.map((i) => ({ url: i.url, caption: i.caption ?? '' })));
  const [busy, setBusy] = useState<'upload' | 'save' | null>(null);
  const dirty = JSON.stringify(images) !== JSON.stringify(trip.images.map((i) => ({ url: i.url, caption: i.caption ?? '' })));

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy('upload');
    try {
      const urls: string[] = [];
      for (const file of Array.from(files).slice(0, 20 - images.length)) urls.push(await uploadImage(file));
      setImages((s) => [...s, ...urls.map((url) => ({ url, caption: '' }))]);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const save = async () => {
    setBusy('save');
    try {
      await api.put(`/trips/${trip.id}/images`, { images: images.map((i) => ({ url: i.url, caption: i.caption.trim() || undefined })) });
      await invalidate('/trips');
      toast.success(t.imagesSaved);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>{t.imagesTitle}</CardTitle>
            <CardDescription>{t.imagesHint}</CardDescription>
          </div>
          {editable && (
            <div className="flex gap-2">
              <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => upload(e.target.files)} />
              <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()} disabled={!!busy || images.length >= 20}>
                {busy === 'upload' ? <Loader2 className="animate-spin" /> : <ImagePlus />} {t.upload}
              </Button>
              <Button size="sm" onClick={save} disabled={!!busy || !dirty}>
                {busy === 'save' && <Loader2 className="animate-spin" />} {t.saveImages}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {images.length === 0 ? (
            <EmptyState icon={ImagePlus} size="sm" title={t.noImages} />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((img, i) => (
                <li key={`${img.url}-${i}`} className="overflow-hidden rounded-tile border border-border bg-surface-raised">
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={img.caption} className="aspect-[4/3] w-full object-cover" />
                    {editable && (
                      <Button
                        size="icon-sm"
                        variant="secondary"
                        className="absolute end-2 top-2"
                        aria-label={`${t.noImages} ${i + 1}`}
                        onClick={() => setImages((s) => s.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="text-danger" />
                      </Button>
                    )}
                  </div>
                  <div className="p-2">
                    {editable ? (
                      <Input
                        value={img.caption}
                        placeholder={t.caption}
                        aria-label={t.caption}
                        maxLength={160}
                        className="h-9 text-[13px]"
                        onChange={(e) => setImages((s) => s.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))}
                      />
                    ) : (
                      <p className="px-1 text-[13px] text-muted">{img.caption || '—'}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t.termsTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {trip.terms ? <p className="text-sm leading-relaxed whitespace-pre-line">{trip.terms}</p> : <p className="text-sm text-muted">{t.noTerms}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

// ------------------------------------------------------------------ history

export function HistoryTab({ trip }: { trip: TripFull }) {
  const t = useMessages(m);
  const f = useFormat();
  const { locale } = useLocale();
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="lg:row-span-2">
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="size-4 text-primary" aria-hidden />
              {t.decisionsTitle}
            </CardTitle>
            <CardDescription>{t.decisionsHint}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {trip.decisions.length === 0 ? (
            <p className="text-sm text-muted">{t.noDecisions}</p>
          ) : (
            <ol className="relative grid gap-4 border-s border-border ps-5">
              {trip.decisions.map((d) => (
                <li key={d.id} className="relative">
                  <span aria-hidden className="absolute -start-[25px] top-1.5 size-2.5 rounded-full bg-primary ring-4 ring-surface" />
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={d.decision === 'CANCEL' ? 'danger' : d.decision === 'CONFIRM' ? 'success' : 'info'}>{LABELS.decisionType[d.decision][locale]}</Badge>
                    <span className="num text-xs text-muted">{f.date(d.createdAt, 'dateTime')}</span>
                    <span className="text-xs text-muted">
                      {t.by} {d.decidedBy.fullName}
                    </span>
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[13px] sm:grid-cols-3">
                    <div>
                      <dt className="text-xs text-muted">{t.passengersAt}</dt>
                      <dd className="num">{d.passengersAtTime}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">{t.prevDeadline}</dt>
                      <dd className="num">{f.date(d.previousDeadline, 'dateTime')}</dd>
                    </div>
                    {d.newDeadline && (
                      <div>
                        <dt className="text-xs text-muted">{t.newDeadline}</dt>
                        <dd className="num">{f.date(d.newDeadline, 'dateTime')}</dd>
                      </div>
                    )}
                  </dl>
                  {d.note && <p className="mt-1.5 rounded-[10px] bg-surface px-3 py-2 text-[13px]">{d.note}</p>}
                </li>
              ))}
            </ol>
          )}
          {trip.createdBy && (
            <p className="mt-6 text-xs text-muted">
              {t.created}: {trip.createdBy.fullName} · <span className="num">{f.date(trip.createdAt, 'dateTime')}</span>
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="size-4 text-primary" aria-hidden />
            {t.programsTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trip.programLegs.length === 0 ? (
            <p className="text-sm text-muted">{t.noPrograms}</p>
          ) : (
            <ul className="grid gap-2">
              {trip.programLegs.map((l) => (
                <li key={l.programId}>
                  <Link href={`/dashboard/programs/${l.program.id}`} className="flex items-center gap-3 rounded-tile border border-border bg-surface-raised p-3 transition-colors hover:border-border-strong">
                    <span className="num ltr-nums text-xs font-medium text-muted">{l.program.code}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{l.program.title}</span>
                    <span className="text-xs text-muted">
                      {t.leg} <span className="num">{l.sequenceNo}</span>
                    </span>
                    <StatusBadge kind="product" status={l.program.status} size="sm" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="size-4 text-primary" aria-hidden />
            {t.offersTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trip.offerTargets.length === 0 ? (
            <p className="text-sm text-muted">{t.noOffers}</p>
          ) : (
            <ul className="grid gap-2">
              {trip.offerTargets.map(({ offer: o }) => (
                <li key={o.id}>
                  <Link href={`/dashboard/offers/${o.id}`} className="flex flex-wrap items-center gap-3 rounded-tile border border-border bg-surface-raised p-3 hover:border-border-strong">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{o.title}</span>
                    <Badge tone="primary" size="sm" className="num">
                      {t.discount} {o.discountMode === 'PERCENT' ? `${Number(o.discountValue)}%` : f.money(o.discountValue, trip.currencyCode)}
                    </Badge>
                    <span className="num text-xs text-muted">
                      {f.date(o.validFrom, 'short')} – {f.date(o.validTo, 'short')}
                    </span>
                    <Badge tone={o.isActive ? 'success' : 'neutral'} size="sm" dot>
                      {o.isActive ? t.active : t.inactive}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
