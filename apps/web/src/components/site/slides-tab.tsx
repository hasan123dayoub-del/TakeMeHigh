'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { SlideLink } from '@travelos/shared';
import { ArrowDown, ArrowUp, Eye, EyeOff, GalleryHorizontal, Link2, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { ConfirmDialog } from '@/components/data/confirm-dialog';
import { QueryState } from '@/components/data/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useApiMutation, useInvalidate, useList, useResource } from '@/lib/hooks';
import { defineMessages, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import type { Offer, Program, Slide, TripListItem } from '@/lib/types/api';
import { cn } from '@/lib/utils';
import { ImageField } from './image-upload';

const m = defineMessages({
  ar: {
    add: 'شريحة جديدة',
    hint: 'تظهر الشرائح الفعّالة في أعلى الصفحة العامة بهذا الترتيب.',
    empty: 'لا شرائح بعد',
    emptyBody: 'أضف صورة جذابة مع عنوان، واربطها برحلة أو برنامج أو عرض.',
    image: 'الصورة',
    title: 'العنوان',
    subtitle: 'العنوان الفرعي',
    linkType: 'تربط إلى',
    target: 'الهدف',
    NONE: 'بدون رابط',
    TRIP: 'رحلة',
    PROGRAM: 'برنامج',
    OFFER: 'عرض',
    active: 'فعّالة',
    hidden: 'مخفية',
    show: 'إظهار',
    hide: 'إخفاء',
    up: 'تقديم',
    down: 'تأخير',
    newTitle: 'شريحة جديدة',
    editTitle: 'تعديل الشريحة',
    saved: 'تم حفظ الشريحة',
    deleteTitle: 'حذف الشريحة؟',
    deleteBody: 'ستختفي من الصفحة العامة فوراً.',
    required: 'هذا الحقل مطلوب',
    imageRequired: 'ارفع صورة للشريحة',
    targetRequired: 'اختر ما تربط إليه الشريحة',
    minTitle: 'حرفان على الأقل',
  },
  en: {
    add: 'New slide',
    hint: 'Active slides appear at the top of the public site in this order.',
    empty: 'No slides yet',
    emptyBody: 'Add an eye-catching image with a title and link it to a trip, program or offer.',
    image: 'Image',
    title: 'Title',
    subtitle: 'Subtitle',
    linkType: 'Links to',
    target: 'Target',
    NONE: 'No link',
    TRIP: 'Trip',
    PROGRAM: 'Program',
    OFFER: 'Offer',
    active: 'Active',
    hidden: 'Hidden',
    show: 'Show',
    hide: 'Hide',
    up: 'Move up',
    down: 'Move down',
    newTitle: 'New slide',
    editTitle: 'Edit slide',
    saved: 'Slide saved',
    deleteTitle: 'Delete this slide?',
    deleteBody: 'It disappears from the public site right away.',
    required: 'This field is required',
    imageRequired: 'Upload an image for the slide',
    targetRequired: 'Choose what the slide links to',
    minTitle: 'At least 2 characters',
  },
});

const LINKS: SlideLink[] = ['NONE', 'TRIP', 'PROGRAM', 'OFFER'];

export function SlidesTab() {
  const t = useMessages(m);
  const c = useMessages(common);
  const q = useResource<Slide[]>('/cms/slides');
  const invalidate = useInvalidate();
  const [editing, setEditing] = useState<Slide | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Slide | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const slides = q.data ?? [];

  const move = async (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= slides.length) return;
    const order = [...slides];
    [order[i], order[j]] = [order[j], order[i]];
    setBusy(slides[i].id);
    try {
      // normalise to 0..n so equal sort orders never get stuck
      await Promise.all(order.map((s, n) => (s.sortOrder !== n ? api.patch(`/cms/slides/${s.id}`, { sortOrder: n }) : null)));
      await invalidate('/cms/slides');
    } finally {
      setBusy(null);
    }
  };

  const toggle = useApiMutation((s: Slide) => api.patch(`/cms/slides/${s.id}`, { isActive: !s.isActive }), { onSuccess: () => void invalidate('/cms/slides') });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{t.hint}</p>
        <Button onClick={() => setEditing('new')}>
          <Plus /> {t.add}
        </Button>
      </div>
      <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => void q.refetch()}>
        {!slides.length ? (
          <Card>
            <EmptyState icon={GalleryHorizontal} title={t.empty} description={t.emptyBody} action={<Button onClick={() => setEditing('new')}>{t.add}</Button>} />
          </Card>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {slides.map((s, i) => {
              const target = s.trip ? `${s.trip.code} · ${s.trip.title}` : s.program ? `${s.program.code} · ${s.program.title}` : s.offer?.title;
              return (
                <li key={s.id}>
                  <Card className={cn('overflow-hidden', !s.isActive && 'opacity-70')}>
                    <div className="relative aspect-[16/9] bg-surface-sunken">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                        <div className="text-lg leading-snug font-medium text-balance">{s.title}</div>
                        {s.subtitle && <div className="mt-1 line-clamp-2 text-sm opacity-90">{s.subtitle}</div>}
                      </div>
                      <span className="num absolute start-3 top-3 grid size-7 place-items-center rounded-full bg-white/90 text-xs font-medium text-sky-900">{i + 1}</span>
                      <Badge tone={s.isActive ? 'success' : 'neutral'} dot className="absolute end-3 top-3 bg-white/90">
                        {s.isActive ? t.active : t.hidden}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 p-3">
                      <span className="inline-flex min-w-0 flex-1 items-center gap-1.5 text-xs text-muted">
                        <Link2 className="size-3.5 shrink-0" aria-hidden />
                        <span className="truncate">{s.linkType === 'NONE' ? t.NONE : `${t[s.linkType]}: ${target ?? '—'}`}</span>
                      </span>
                      <Button size="icon-sm" variant="ghost" aria-label={t.up} disabled={i === 0 || !!busy} onClick={() => void move(i, -1)}>
                        {busy === s.id ? <Loader2 className="animate-spin" /> : <ArrowUp />}
                      </Button>
                      <Button size="icon-sm" variant="ghost" aria-label={t.down} disabled={i === slides.length - 1 || !!busy} onClick={() => void move(i, 1)}>
                        <ArrowDown />
                      </Button>
                      <Button size="icon-sm" variant="ghost" aria-label={s.isActive ? t.hide : t.show} onClick={() => toggle.mutate(s)}>
                        {s.isActive ? <EyeOff /> : <Eye />}
                      </Button>
                      <Button size="icon-sm" variant="ghost" aria-label={c.edit} onClick={() => setEditing(s)}>
                        <Pencil />
                      </Button>
                      <Button size="icon-sm" variant="ghost" aria-label={c.delete} onClick={() => setDeleting(s)}>
                        <Trash2 className="text-danger" />
                      </Button>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </QueryState>

      {editing && <SlideDialog slide={editing === 'new' ? null : editing} nextOrder={slides.length} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t.deleteTitle}
        description={t.deleteBody}
        destructive
        confirmLabel={c.delete}
        onConfirm={async () => {
          if (!deleting) return;
          await api.delete(`/cms/slides/${deleting.id}`);
          await invalidate('/cms/slides');
        }}
      />
    </div>
  );
}

function SlideDialog({ slide, nextOrder, onClose }: { slide: Slide | null; nextOrder: number; onClose: () => void }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const invalidate = useInvalidate();

  const schema = useMemo(
    () =>
      z
        .object({
          imageUrl: z.string().nullable(),
          title: z.string().trim().min(2, { error: t.minTitle }).max(160),
          subtitle: z.string().trim().max(255),
          linkType: z.enum(['NONE', 'TRIP', 'PROGRAM', 'OFFER']),
          linkId: z.string(),
          isActive: z.boolean(),
        })
        .refine((v) => !!v.imageUrl, { path: ['imageUrl'], error: t.imageRequired })
        .refine((v) => v.linkType === 'NONE' || !!v.linkId, { path: ['linkId'], error: t.targetRequired }),
    [t],
  );
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      imageUrl: slide?.imageUrl ?? null,
      title: slide?.title ?? '',
      subtitle: slide?.subtitle ?? '',
      linkType: slide?.linkType ?? 'NONE',
      linkId: slide?.tripId ?? slide?.programId ?? slide?.offerId ?? '',
      isActive: slide?.isActive ?? true,
    },
  });
  const linkType = useWatch({ control: form.control, name: 'linkType' });
  const trips = useList<TripListItem>('/trips', { pageSize: 100, sort: 'startsAt', order: 'desc' }, { enabled: linkType === 'TRIP' });
  const programs = useList<Program>('/programs', { pageSize: 100 }, { enabled: linkType === 'PROGRAM' });
  const offers = useList<Offer>('/offers', { pageSize: 100 }, { enabled: linkType === 'OFFER' });
  const options =
    linkType === 'TRIP'
      ? (trips.data?.data ?? []).map((x) => ({ value: x.id, label: `${x.code} · ${x.title}` }))
      : linkType === 'PROGRAM'
        ? (programs.data?.data ?? []).map((x) => ({ value: x.id, label: `${x.code} · ${x.title}` }))
        : linkType === 'OFFER'
          ? (offers.data?.data ?? []).map((x) => ({ value: x.id, label: x.title }))
          : [];

  const save = useApiMutation(
    (v: Values) => {
      const body = {
        imageUrl: v.imageUrl,
        title: v.title,
        subtitle: v.subtitle || null,
        linkType: v.linkType,
        linkId: v.linkType === 'NONE' ? undefined : v.linkId,
        isActive: v.isActive,
        ...(slide ? {} : { sortOrder: nextOrder }),
      };
      return slide ? api.patch(`/cms/slides/${slide.id}`, body) : api.post('/cms/slides', body);
    },
    {
      success: t.saved,
      onSuccess: async () => {
        await invalidate('/cms/slides');
        onClose();
      },
    },
  );
  const errors = form.formState.errors;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{slide ? t.editTitle : t.newTitle}</DialogTitle>
          <DialogDescription>{t.hint}</DialogDescription>
        </DialogHeader>
        <form id="slide-form" onSubmit={form.handleSubmit((v) => save.mutate(v))} noValidate className="grid gap-4 sm:grid-cols-2">
          <FormField label={t.image} error={errors.imageUrl?.message} required className="sm:col-span-2">
            <Controller control={form.control} name="imageUrl" render={({ field }) => <ImageField label={t.image} value={field.value} onChange={field.onChange} aspect="aspect-[21/9]" />} />
          </FormField>
          <FormField label={t.title} error={errors.title?.message} required>
            <Input {...form.register('title')} />
          </FormField>
          <FormField label={t.subtitle} error={errors.subtitle?.message}>
            <Input {...form.register('subtitle')} />
          </FormField>
          <FormField label={t.linkType}>
            <Controller
              control={form.control}
              name="linkType"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                    form.setValue('linkId', '');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LINKS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {t[l]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label={t.target} error={errors.linkId?.message} required={linkType !== 'NONE'}>
            <Controller
              control={form.control}
              name="linkId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={linkType === 'NONE'}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" className="size-4 accent-[var(--primary)]" {...form.register('isActive')} />
            {t.active}
          </label>
        </form>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {c.cancel}
          </Button>
          <Button type="submit" form="slide-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />} {c.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
