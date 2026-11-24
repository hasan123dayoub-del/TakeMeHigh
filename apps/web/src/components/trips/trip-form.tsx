'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ImageUp, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { QueryState } from '@/components/data/states';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, api, errorMessage } from '@/lib/api';
import { useAuth, useDefaultCurrency } from '@/lib/auth';
import { useInvalidate, useLookups, useName, useResource } from '@/lib/hooks';
import { defineMessages, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import { CityCombobox } from './city-combobox';
import { tripWords } from './trip-messages';
import { fromLocalInput, scopeOf, toLocalInput, uploadImage, type TripFull } from './trip-utils';

const SHARED = '__shared__';

const m = defineMessages({
  ar: {
    newTitle: 'رحلة جديدة',
    editTitle: 'تعديل الرحلة',
    newDescription: 'ابدأ بإطار الرحلة: المسار والتواريخ والسعة. بعد الحفظ تُضاف الخدمات من الموردين ويُحسب السعر تلقائياً.',
    editDescription: 'تعديل إطار الرحلة. التواريخ والمدن تُجمَّد بعد إغلاق التسجيل، وبعد وجود حجوزات لا يغيّرها إلا مدير المكتب.',
    basics: 'المعلومات الأساسية',
    basicsHint: 'العنوان والوصف يظهران في الصفحة العامة.',
    routeCard: 'المسار والتواريخ',
    routeHint: 'يُحدَّد النطاق (داخلية/خارجية) تلقائياً من بلدي الانطلاق والوجهة.',
    capacityCard: 'السعة والعملة',
    publishing: 'الصورة والشروط',
    titleLabel: 'عنوان الرحلة',
    description: 'الوصف',
    category: 'التصنيف',
    branch: 'الفرع',
    shared: 'مشتركة لكل الفروع',
    origin: 'مدينة الانطلاق',
    destination: 'الوجهة',
    startsAt: 'الانطلاق',
    endsAt: 'العودة',
    deadline: 'آخر موعد للتسجيل',
    deadlineHint: 'يُغلق التسجيل تلقائياً عند هذا الموعد، ويجب أن يكون قبل الانطلاق.',
    min: 'الحد الأدنى للركاب',
    max: 'الحد الأقصى للركاب',
    currency: 'العملة',
    currencyHint: 'كل خدمات الرحلة يجب أن تكون بهذه العملة، ولا تتغير بعد الإنشاء.',
    currencyFixed: 'العملة ثابتة بعد الإنشاء',
    isPublic: 'إظهار الرحلة في الصفحة العامة',
    isPublicHint: 'تظهر للعموم فقط عندما يكون التسجيل مفتوحاً.',
    cover: 'صورة الغلاف',
    coverHint: 'رابط صورة أو ارفع صورة (JPEG/PNG/WebP حتى 5 ميغابايت).',
    upload: 'رفع صورة',
    uploading: 'جارٍ الرفع…',
    remove: 'إزالة',
    terms: 'الشروط والأحكام',
    scopeLive: 'النطاق المحسوب',
    frozen: 'التسجيل مغلق: لا يمكن تعديل التواريخ والمدن.',
    required: 'هذا الحقل مطلوب',
    titleMin: 'العنوان 3 أحرف على الأقل',
    endBeforeStart: 'العودة يجب أن تكون بعد الانطلاق',
    deadlineAfterStart: 'آخر موعد للتسجيل يجب ألا يتجاوز موعد الانطلاق',
    maxBelowMin: 'الحد الأقصى يجب أن يكون أكبر من أو يساوي الحد الأدنى',
    sameCity: 'الوجهة يجب أن تختلف عن مدينة الانطلاق',
    positive: 'أدخل رقماً صحيحاً أكبر من صفر',
    created: 'تم إنشاء الرحلة. أضف خدماتها الآن.',
    saved: 'تم حفظ التعديلات',
    create: 'إنشاء الرحلة',
    backToTrip: 'العودة إلى الرحلة',
    apiErrors: 'لم يقبل الخادم البيانات:',
  },
  en: {
    newTitle: 'New trip',
    editTitle: 'Edit trip',
    newDescription: 'Start with the trip frame: route, dates and capacity. After saving, add the supplier services; the price is computed automatically.',
    editDescription: 'Edit the trip frame. Dates and cities freeze once registration closes; with bookings only the Admin can change them.',
    basics: 'Basics',
    basicsHint: 'The title and description appear on the public page.',
    routeCard: 'Route and dates',
    routeHint: 'The scope (domestic / international) follows from the countries of origin and destination.',
    capacityCard: 'Capacity and currency',
    publishing: 'Cover and terms',
    titleLabel: 'Trip title',
    description: 'Description',
    category: 'Category',
    branch: 'Branch',
    shared: 'Shared by all branches',
    origin: 'Origin city',
    destination: 'Destination',
    startsAt: 'Departure',
    endsAt: 'Return',
    deadline: 'Registration deadline',
    deadlineHint: 'Registration closes automatically at this time; it must be before departure.',
    min: 'Minimum passengers',
    max: 'Maximum passengers',
    currency: 'Currency',
    currencyHint: 'Every service of the trip must use this currency; it cannot change after creation.',
    currencyFixed: 'The currency is fixed after creation',
    isPublic: 'Show the trip on the public page',
    isPublicHint: 'It is shown publicly only while registration is open.',
    cover: 'Cover image',
    coverHint: 'Image URL, or upload an image (JPEG/PNG/WebP up to 5 MB).',
    upload: 'Upload image',
    uploading: 'Uploading…',
    remove: 'Remove',
    terms: 'Terms and conditions',
    scopeLive: 'Computed scope',
    frozen: 'Registration is closed: dates and cities cannot change.',
    required: 'This field is required',
    titleMin: 'At least 3 characters',
    endBeforeStart: 'The return must be after the departure',
    deadlineAfterStart: 'The registration deadline cannot be after the departure',
    maxBelowMin: 'The maximum must be at least the minimum',
    sameCity: 'The destination must differ from the origin',
    positive: 'Enter a whole number above zero',
    created: 'Trip created. Add its services now.',
    saved: 'Changes saved',
    create: 'Create trip',
    backToTrip: 'Back to the trip',
    apiErrors: 'The server rejected the data:',
  },
});

export function TripFormPage({ id }: { id?: string }) {
  const trip = useResource<TripFull>(id ? `/trips/${id}` : null);
  if (!id) return <TripForm trip={null} />;
  return (
    <QueryState isLoading={trip.isLoading} error={trip.error} onRetry={() => trip.refetch()}>
      {trip.data && <TripForm trip={trip.data} />}
    </QueryState>
  );
}

function TripForm({ trip }: { trip: TripFull | null }) {
  const t = useMessages(m);
  const w = useMessages(tripWords);
  const c = useMessages(common);
  const { isAdmin } = useAuth();
  const lookups = useLookups().data;
  const name = useName();
  const router = useRouter();
  const invalidate = useInvalidate();
  const defaultCurrency = useDefaultCurrency();
  const [apiErrors, setApiErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const frozen = !!trip && !['DRAFT', 'OPEN'].includes(trip.status);

  const schema = useMemo(
    () =>
      z
        .object({
          title: z.string().trim().min(3, { error: t.titleMin }).max(160),
          description: z.string().max(5000).optional(),
          categoryId: z.string().min(1, { error: t.required }),
          branchId: z.string(),
          originCityId: z.string().min(1, { error: t.required }),
          destinationCityId: z.string().min(1, { error: t.required }),
          startsAt: z.string().min(1, { error: t.required }),
          endsAt: z.string().min(1, { error: t.required }),
          registrationDeadline: z.string().min(1, { error: t.required }),
          minPassengers: z.coerce.number<string>().int({ error: t.positive }).min(1, { error: t.positive }).max(5000),
          maxPassengers: z.coerce.number<string>().int({ error: t.positive }).min(1, { error: t.positive }).max(5000),
          currencyCode: z.string().length(3, { error: t.required }),
          isPublic: z.boolean(),
          coverImageUrl: z.string().max(500).optional(),
          terms: z.string().max(10000).optional(),
        })
        .superRefine((v, ctx) => {
          if (v.startsAt && v.endsAt && new Date(v.endsAt) < new Date(v.startsAt)) ctx.addIssue({ code: 'custom', path: ['endsAt'], message: t.endBeforeStart });
          if (v.startsAt && v.registrationDeadline && new Date(v.registrationDeadline) > new Date(v.startsAt))
            ctx.addIssue({ code: 'custom', path: ['registrationDeadline'], message: t.deadlineAfterStart });
          if (v.maxPassengers < v.minPassengers) ctx.addIssue({ code: 'custom', path: ['maxPassengers'], message: t.maxBelowMin });
          if (v.originCityId && v.originCityId === v.destinationCityId) ctx.addIssue({ code: 'custom', path: ['destinationCityId'], message: t.sameCity });
        }),
    [t],
  );
  type Input = z.input<typeof schema>;
  type Values = z.output<typeof schema>;

  const form = useForm<Input, unknown, Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: trip?.title ?? '',
      description: trip?.description ?? '',
      categoryId: trip?.categoryId ?? '',
      branchId: trip ? (trip.branchId ?? SHARED) : SHARED,
      originCityId: trip?.originCityId ?? '',
      destinationCityId: trip?.destinationCityId ?? '',
      startsAt: toLocalInput(trip?.startsAt),
      endsAt: toLocalInput(trip?.endsAt),
      registrationDeadline: toLocalInput(trip?.registrationDeadline),
      minPassengers: String(trip?.minPassengers ?? 10),
      maxPassengers: String(trip?.maxPassengers ?? 40),
      currencyCode: trip?.currencyCode ?? defaultCurrency,
      isPublic: trip?.isPublic ?? false,
      coverImageUrl: trip?.coverImageUrl ?? '',
      terms: trip?.terms ?? '',
    },
  });
  const errors = form.formState.errors;
  const origin = useWatch({ control: form.control, name: 'originCityId' });
  const destination = useWatch({ control: form.control, name: 'destinationCityId' });
  const cover = useWatch({ control: form.control, name: 'coverImageUrl' });
  const scope = scopeOf(lookups, origin, destination);

  const submit = async (v: Values) => {
    setApiErrors([]);
    const body: Record<string, unknown> = {
      title: v.title,
      description: v.description || undefined,
      categoryId: v.categoryId,
      minPassengers: v.minPassengers,
      maxPassengers: v.maxPassengers,
      isPublic: v.isPublic,
      coverImageUrl: v.coverImageUrl || undefined,
      terms: v.terms || undefined,
      registrationDeadline: fromLocalInput(v.registrationDeadline),
    };
    if (!frozen) {
      body.originCityId = v.originCityId;
      body.destinationCityId = v.destinationCityId;
      body.startsAt = fromLocalInput(v.startsAt);
      body.endsAt = fromLocalInput(v.endsAt);
    }
    if (isAdmin) body.branchId = v.branchId === SHARED ? (trip ? null : undefined) : v.branchId;
    try {
      if (trip) {
        // only send the branch when it actually changes (non-admins never send it)
        if (isAdmin && (trip.branchId ?? SHARED) === v.branchId) delete body.branchId;
        await api.patch(`/trips/${trip.id}`, body);
        await invalidate('/trips');
        toast.success(t.saved);
        router.push(`/dashboard/trips/${trip.id}`);
      } else {
        body.currencyCode = v.currencyCode;
        const created = await api.post<{ id: string }>('/trips', body);
        await invalidate('/trips');
        toast.success(t.created);
        router.push(`/dashboard/trips/${created.id}?tab=services`);
      }
    } catch (e) {
      const list = e instanceof ApiError ? e.messages : [errorMessage(e)];
      setApiErrors(list);
      toast.error(errorMessage(e));
    }
  };

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      form.setValue('coverImageUrl', url, { shouldDirty: true });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={
          <Link href={trip ? `/dashboard/trips/${trip.id}` : '/dashboard/trips'} className="inline-flex items-center gap-1.5 hover:text-foreground">
            <ArrowLeft className="size-3.5 rtl-flip" aria-hidden />
            {trip ? `${t.backToTrip} · ${trip.code}` : w.trips}
          </Link>
        }
        title={trip ? t.editTitle : t.newTitle}
        description={trip ? t.editDescription : t.newDescription}
      />

      <form onSubmit={form.handleSubmit(submit)} noValidate className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{t.basics}</CardTitle>
                <CardDescription>{t.basicsHint}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField label={t.titleLabel} error={errors.title?.message} required className="sm:col-span-2">
                <Input {...form.register('title')} autoFocus={!trip} />
              </FormField>
              <FormField label={t.category} error={errors.categoryId?.message} required>
                <Controller
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        {(lookups?.categories ?? []).map((x) => (
                          <SelectItem key={x.id} value={x.id}>
                            {name(x)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              {isAdmin && (
                <FormField label={t.branch}>
                  <Controller
                    control={form.control}
                    name="branchId"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SHARED}>{t.shared}</SelectItem>
                          {(lookups?.branches ?? []).map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>
              )}
              <FormField label={t.description} className="sm:col-span-2">
                <Textarea rows={4} {...form.register('description')} />
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>{t.routeCard}</CardTitle>
                <CardDescription>{t.routeHint}</CardDescription>
              </div>
              {scope && (
                <div className="flex items-center gap-2 text-xs text-muted">
                  {t.scopeLive}
                  <StatusBadge kind="scope" status={scope} />
                </div>
              )}
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {frozen && <p className="rounded-tile bg-warning/12 px-4 py-3 text-sm sm:col-span-2">{t.frozen}</p>}
              <FormField label={t.origin} error={errors.originCityId?.message} required>
                <Controller
                  control={form.control}
                  name="originCityId"
                  render={({ field }) => <CityCombobox value={field.value} onChange={field.onChange} disabled={frozen} />}
                />
              </FormField>
              <FormField label={t.destination} error={errors.destinationCityId?.message} required>
                <Controller
                  control={form.control}
                  name="destinationCityId"
                  render={({ field }) => <CityCombobox value={field.value} onChange={field.onChange} exclude={origin ? [origin] : []} disabled={frozen} />}
                />
              </FormField>
              <FormField label={t.startsAt} error={errors.startsAt?.message} required>
                <Input type="datetime-local" dir="ltr" className="num" disabled={frozen} {...form.register('startsAt')} />
              </FormField>
              <FormField label={t.endsAt} error={errors.endsAt?.message} required>
                <Input type="datetime-local" dir="ltr" className="num" disabled={frozen} {...form.register('endsAt')} />
              </FormField>
              <FormField label={t.deadline} error={errors.registrationDeadline?.message} hint={t.deadlineHint} required className="sm:col-span-2">
                <Input type="datetime-local" dir="ltr" className="num sm:max-w-xs" {...form.register('registrationDeadline')} />
              </FormField>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>{t.capacityCard}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <FormField label={t.min} error={errors.minPassengers?.message} required>
                <Input type="number" min={1} dir="ltr" className="num" {...form.register('minPassengers')} />
              </FormField>
              <FormField label={t.max} error={errors.maxPassengers?.message} required>
                <Input type="number" min={1} dir="ltr" className="num" {...form.register('maxPassengers')} />
              </FormField>
              <FormField label={t.currency} hint={trip ? t.currencyFixed : t.currencyHint} className="col-span-2">
                <Controller
                  control={form.control}
                  name="currencyCode"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={!!trip}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(lookups?.currencies ?? []).map((x) => (
                          <SelectItem key={x.code} value={x.code}>
                            {x.code} · {name(x)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <label className="col-span-2 flex items-start gap-2.5 text-sm">
                <input type="checkbox" className="mt-1 size-4 accent-[var(--primary)]" {...form.register('isPublic')} />
                <span>
                  {t.isPublic}
                  <span className="block text-xs text-muted">{t.isPublicHint}</span>
                </span>
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.publishing}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <FormField label={t.cover} hint={t.coverHint}>
                <Input dir="ltr" placeholder="https://…" {...form.register('coverImageUrl')} />
              </FormField>
              <div className="overflow-hidden rounded-tile border border-dashed border-border bg-surface">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt="" className="aspect-[16/9] w-full object-cover" />
                ) : (
                  <div className="grid aspect-[16/9] place-items-center text-subtle">
                    <ImageUp className="size-8" strokeWidth={1.5} aria-hidden />
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => onUpload(e.target.files?.[0])} />
                <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="animate-spin" /> : <ImageUp />} {uploading ? t.uploading : t.upload}
                </Button>
                {cover && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => form.setValue('coverImageUrl', '', { shouldDirty: true })}>
                    <Trash2 /> {t.remove}
                  </Button>
                )}
              </div>
              <FormField label={t.terms}>
                <Textarea rows={5} {...form.register('terms')} />
              </FormField>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-3 lg:col-span-2">
          {apiErrors.length > 0 && (
            <div role="alert" className="rounded-tile border border-danger/30 bg-danger/8 px-4 py-3 text-sm">
              <p className="font-medium text-danger">{t.apiErrors}</p>
              <ul className="mt-1.5 list-disc ps-5">
                {apiErrors.map((e) => (
                  <li key={e} dir="auto">{e}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" asChild>
              <Link href={trip ? `/dashboard/trips/${trip.id}` : '/dashboard/trips'}>{c.cancel}</Link>
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="animate-spin" />} {trip ? c.save : t.create}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
