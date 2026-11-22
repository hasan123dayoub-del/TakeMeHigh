'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDown, ArrowUp, ImageIcon, ImageOff, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Controller, useFieldArray, useForm, useWatch, type Control } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { AppDialog } from '@/components/trips/kit/dialogs';
import { Switch } from '@/components/trips/kit/controls';
import { ErrorBanner, useErrorText } from '@/components/trips/kit/states';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { common, fmt, useLocale, useMessages } from '@/lib/i18n';
import { useSaveTour, useTourCategories } from '@/lib/queries/tours';
import type { TourDetail, TourInput } from '@/lib/types/tours';
import { cn } from '@/lib/utils';
import { toursMessages } from './messages';

const NONE = '__none';
const URL_RE = /^https?:\/\/[^\s]+$/i;

function useTourSchema() {
  const t = useMessages(toursMessages);
  return useMemo(() => {
    const int = (min: number, max: number) =>
      z
        .string()
        .trim()
        .refine((v) => /^\d+$/.test(v) && +v >= min && +v <= max, { error: fmt(t.intRange, { min, max }) });
    const optUrl = z
      .string()
      .trim()
      .refine((v) => !v || URL_RE.test(v), { error: t.invalidUrl });
    return z
      .object({
        name: z.string().trim().min(2, { error: t.nameMin }).max(160),
        destination: z.string().trim().min(1, { error: t.required }).max(120),
        categoryId: z.string(),
        days: int(1, 60),
        nights: int(0, 60),
        coverImageUrl: optUrl,
        description: z.string().max(5000),
        accommodationInfo: z.string().max(2000),
        transportationInfo: z.string().max(2000),
        bookingTerms: z.string().max(5000),
        cancellationTerms: z.string().max(5000),
        isActive: z.boolean(),
        itinerary: z.array(
          z.object({
            title: z.string().trim().min(1, { error: t.required }).max(160),
            location: z.string().max(120),
            description: z.string().max(3000),
          }),
        ),
        images: z.array(
          z.object({
            url: z
              .string()
              .trim()
              .refine((v) => URL_RE.test(v), { error: t.invalidUrl }),
            caption: z.string().max(160),
          }),
        ),
      })
      .superRefine((v, ctx) => {
        const days = Number(v.days);
        const nights = Number(v.nights);
        if (Number.isFinite(days) && Number.isFinite(nights) && nights > days)
          ctx.addIssue({ code: 'custom', path: ['nights'], message: t.nightsGtDays });
        if (Number.isFinite(days) && v.itinerary.length > days)
          ctx.addIssue({ code: 'custom', path: ['itinerary'], message: fmt(t.tooManyDays, { n: days }) });
      });
  }, [t]);
}

type Values = z.input<ReturnType<typeof useTourSchema>>;

function toValues(tour?: TourDetail | null): Values {
  return {
    name: tour?.name ?? '',
    destination: tour?.destination ?? '',
    categoryId: tour?.categoryId ?? NONE,
    days: String(tour?.days ?? 1),
    nights: String(tour?.nights ?? 0),
    coverImageUrl: tour?.coverImageUrl ?? '',
    description: tour?.description ?? '',
    accommodationInfo: tour?.accommodationInfo ?? '',
    transportationInfo: tour?.transportationInfo ?? '',
    bookingTerms: tour?.bookingTerms ?? '',
    cancellationTerms: tour?.cancellationTerms ?? '',
    isActive: tour?.isActive ?? true,
    itinerary: (tour?.itinerary ?? []).map((d) => ({
      title: d.title,
      location: d.location ?? '',
      description: d.description ?? '',
    })),
    images: (tour?.images ?? []).map((i) => ({ url: i.url, caption: i.caption ?? '' })),
  };
}

/** Create / edit a tour: basics, itinerary day editor, accommodation & transport, image URLs, terms. */
export function TourFormDialog({
  open,
  onOpenChange,
  tour,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tour?: TourDetail | null;
  onSaved?: (tour: TourDetail) => void;
}) {
  const t = useMessages(toursMessages);
  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      title={tour ? t.editTitle : t.createTitle}
      description={t.formDescription}
    >
      {open && <TourForm key={tour?.id ?? 'new'} tour={tour} onDone={onOpenChange} onSaved={onSaved} />}
    </AppDialog>
  );
}

function TourForm({
  tour,
  onDone,
  onSaved,
}: {
  tour?: TourDetail | null;
  onDone: (open: boolean) => void;
  onSaved?: (tour: TourDetail) => void;
}) {
  const t = useMessages(toursMessages);
  const c = useMessages(common);
  const { locale } = useLocale();
  const errorText = useErrorText();
  const schema = useTourSchema();
  const categories = useTourCategories();
  const save = useSaveTour();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(tour), mode: 'onTouched' });

  const days = useFieldArray({ control, name: 'itinerary' });
  const images = useFieldArray({ control, name: 'images' });

  const onSubmit = handleSubmit(async (v) => {
    setServerError(null);
    const opt = (s: string) => (s.trim() ? s.trim() : tour ? null : undefined);
    const input: TourInput = {
      name: v.name.trim(),
      destination: v.destination.trim(),
      categoryId: v.categoryId === NONE ? (tour ? null : undefined) : v.categoryId,
      days: Number(v.days),
      nights: Number(v.nights),
      coverImageUrl: opt(v.coverImageUrl),
      description: opt(v.description),
      accommodationInfo: opt(v.accommodationInfo),
      transportationInfo: opt(v.transportationInfo),
      bookingTerms: opt(v.bookingTerms),
      cancellationTerms: opt(v.cancellationTerms),
      ...(tour ? { isActive: v.isActive } : {}),
      itinerary: v.itinerary.map((d, i) => ({
        dayNumber: i + 1,
        title: d.title.trim(),
        ...(d.location.trim() ? { location: d.location.trim() } : {}),
        ...(d.description.trim() ? { description: d.description.trim() } : {}),
      })),
    };
    try {
      const saved = await save.mutateAsync({
        id: tour?.id,
        input,
        images: v.images.map((i) => ({ url: i.url.trim(), caption: i.caption.trim() || null })),
      });
      toast.success(tour ? t.saved : t.created);
      onSaved?.(saved);
      onDone(false);
    } catch (err) {
      setServerError(errorText(err));
    }
  });

  const itineraryError = (errors.itinerary as { message?: string } | undefined)?.message;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-7">
      {/* Basics */}
      <Section title={t.sectionBasics}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t.name} required error={errors.name?.message} className="sm:col-span-2">
            <Input {...register('name')} autoFocus={!tour} />
          </FormField>
          <FormField label={t.destination} required error={errors.destination?.message}>
            <Input {...register('destination')} />
          </FormField>
          <FormField label={t.category}>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                  <SelectTrigger className="text-start">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t.noCategory}</SelectItem>
                    {categories.data?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {locale === 'ar' ? (cat.nameAr ?? cat.name) : cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label={t.days} required error={errors.days?.message}>
            <Input {...register('days')} inputMode="numeric" dir="ltr" className="text-start" />
          </FormField>
          <FormField label={t.nights} required error={errors.nights?.message}>
            <Input {...register('nights')} inputMode="numeric" dir="ltr" className="text-start" />
          </FormField>
          <FormField label={t.summary} className="sm:col-span-2" error={errors.description?.message}>
            <Textarea rows={3} {...register('description')} />
          </FormField>
          <FormField label={t.coverImage} className="sm:col-span-2" error={errors.coverImageUrl?.message}>
            <Input {...register('coverImageUrl')} dir="ltr" placeholder="https://…" inputMode="url" />
          </FormField>
          {tour && (
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <div className="flex items-start justify-between gap-4 rounded-tile border border-border bg-surface px-4 py-3 sm:col-span-2">
                  <div>
                    <p className="text-sm font-medium" id="tour-active-label">
                      {t.isActive}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{t.isActiveHint}</p>
                  </div>
                  <Switch checked={field.value} onCheckedChange={field.onChange} label={t.isActive} />
                </div>
              )}
            />
          )}
        </div>
      </Section>

      {/* Itinerary */}
      <Section
        title={t.sectionItinerary}
        hint={t.itineraryHint}
        action={
          <Button type="button" variant="secondary" size="sm" onClick={() => days.append({ title: '', location: '', description: '' })}>
            <Plus /> {t.addDay}
          </Button>
        }
      >
        {itineraryError && <ErrorBanner className="mb-3">{itineraryError}</ErrorBanner>}
        {days.fields.length === 0 ? (
          <p className="rounded-tile border border-dashed border-border-strong px-4 py-6 text-center text-[13px] text-muted">
            {t.itineraryEmpty}
          </p>
        ) : (
          <ol className="grid gap-3">
            {days.fields.map((field, i) => (
              <li key={field.id} className="relative grid gap-3 rounded-tile border border-border bg-surface p-4 ps-14">
                <span className="num absolute start-4 top-4 grid size-7 place-items-center rounded-full bg-sky-100 text-xs font-medium text-sky-800 ring-1 ring-sky-300 dark:bg-sky-900 dark:text-sky-100 dark:ring-sky-700">
                  {i + 1}
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium tracking-[0.14em] text-muted uppercase">{fmt(t.day, { n: i + 1 })}</span>
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={t.moveUp} disabled={i === 0} onClick={() => days.move(i, i - 1)}>
                      <ArrowUp />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t.moveDown}
                      disabled={i === days.fields.length - 1}
                      onClick={() => days.move(i, i + 1)}
                    >
                      <ArrowDown />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={t.removeDay} onClick={() => days.remove(i)} className="hover:text-danger">
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
                  <FormField label={t.dayTitle} required error={errors.itinerary?.[i]?.title?.message}>
                    <Input {...register(`itinerary.${i}.title`)} />
                  </FormField>
                  <FormField label={t.dayLocation}>
                    <Input {...register(`itinerary.${i}.location`)} />
                  </FormField>
                </div>
                <FormField label={t.dayDescription}>
                  <Textarea rows={2} className="min-h-16" {...register(`itinerary.${i}.description`)} />
                </FormField>
              </li>
            ))}
          </ol>
        )}
      </Section>

      {/* Accommodation & transport */}
      <Section title={t.sectionStay}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t.accommodation}>
            <Textarea rows={3} {...register('accommodationInfo')} />
          </FormField>
          <FormField label={t.transport}>
            <Textarea rows={3} {...register('transportationInfo')} />
          </FormField>
        </div>
      </Section>

      {/* Images */}
      <Section
        title={t.sectionImages}
        hint={t.imagesHint}
        action={
          <Button type="button" variant="secondary" size="sm" onClick={() => images.append({ url: '', caption: '' })} disabled={images.fields.length >= 20}>
            <ImageIcon /> {t.addImage}
          </Button>
        }
      >
        {images.fields.length === 0 ? (
          <p className="rounded-tile border border-dashed border-border-strong px-4 py-6 text-center text-[13px] text-muted">{t.imagesEmpty}</p>
        ) : (
          <ul className="grid gap-3">
            {images.fields.map((field, i) => (
              <li key={field.id} className="grid gap-3 rounded-tile border border-border bg-surface p-3 sm:grid-cols-[112px_1fr_auto] sm:items-start">
                <ImagePreview control={control} index={i} failedLabel={t.imagePreviewFailed} />
                <div className="grid gap-3">
                  <FormField label={t.imageUrl} required error={errors.images?.[i]?.url?.message}>
                    <Input {...register(`images.${i}.url`)} dir="ltr" placeholder="https://…" inputMode="url" />
                  </FormField>
                  <FormField label={t.imageCaption}>
                    <Input {...register(`images.${i}.caption`)} />
                  </FormField>
                </div>
                <div className="flex gap-1 sm:flex-col">
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={t.moveUp} disabled={i === 0} onClick={() => images.move(i, i - 1)}>
                    <ArrowUp />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t.moveDown}
                    disabled={i === images.fields.length - 1}
                    onClick={() => images.move(i, i + 1)}
                  >
                    <ArrowDown />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={t.removeImage} onClick={() => images.remove(i)} className="hover:text-danger">
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Terms */}
      <Section title={t.sectionTerms}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t.bookingTerms}>
            <Textarea rows={4} {...register('bookingTerms')} />
          </FormField>
          <FormField label={t.cancellationTerms}>
            <Textarea rows={4} {...register('cancellationTerms')} />
          </FormField>
        </div>
      </Section>

      <ErrorBanner>{serverError}</ErrorBanner>

      <div className="sticky bottom-0 -mx-6 -mb-6 flex flex-col-reverse gap-2 border-t border-border bg-surface-raised/95 px-6 py-4 backdrop-blur sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={() => onDone(false)} disabled={save.isPending}>
          {c.cancel}
        </Button>
        <Button type="submit" loading={save.isPending}>
          {save.isPending ? c.saving : tour ? t.saveTour : t.createTour}
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <fieldset className="grid gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <legend className="heading-display text-[13px]">{title}</legend>
          {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </fieldset>
  );
}

function ImagePreview({ control, index, failedLabel }: { control: Control<Values>; index: number; failedLabel: string }) {
  const url = useWatch({ control, name: `images.${index}.url` });
  const [failed, setFailed] = useState<string | null>(null);
  const valid = URL_RE.test(url ?? '');
  const broken = failed === url;
  return (
    <div
      className={cn(
        'grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-[12px] border border-border bg-surface-sunken sm:w-28',
      )}
    >
      {valid && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary office URLs, not optimisable
        <img src={url} alt="" className="size-full object-cover" onError={() => setFailed(url)} />
      ) : (
        <span className="grid place-items-center gap-1 p-2 text-center text-[11px] text-subtle">
          {broken ? <ImageOff className="size-5" aria-hidden /> : <ImageIcon className="size-5" aria-hidden />}
          {broken && failedLabel}
        </span>
      )}
    </div>
  );
}
