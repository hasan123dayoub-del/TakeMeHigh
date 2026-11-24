'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDown, ArrowUp, CalendarDays, Images, Loader2, Pencil, Plus, Trash2, Trophy, Upload, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { useApiMutation, useInvalidate, useResource } from '@/lib/hooks';
import { defineMessages, fmt, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import type { Achievement } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';
import { IMAGE_TYPES, useImageUploader } from './image-upload';

const m = defineMessages({
  ar: {
    add: 'إنجاز جديد',
    hint: 'إنجازات المكتب وصورها في قسم «إنجازاتنا» بالصفحة العامة.',
    empty: 'لا إنجازات بعد',
    emptyBody: 'أضف محطات المكتب المهمة: أعداد المسافرين، الجوائز، الرحلات المميزة…',
    title: 'العنوان',
    description: 'الوصف',
    date: 'التاريخ',
    order: 'الترتيب',
    orderHint: 'الأصغر يظهر أولاً',
    active: 'ظاهر في الموقع',
    hidden: 'مخفي',
    images: 'الصور',
    imagesHint: 'حتى 20 صورة. JPEG أو PNG أو WebP حتى 5 ميغابايت لكل صورة.',
    addImages: 'إضافة صور',
    uploading: 'جارٍ الرفع…',
    caption: 'وصف الصورة',
    removeImage: 'إزالة الصورة',
    up: 'تقديم',
    down: 'تأخير',
    photos: '{n} صورة',
    newTitle: 'إنجاز جديد',
    editTitle: 'تعديل الإنجاز',
    saved: 'تم حفظ الإنجاز',
    deleteTitle: 'حذف الإنجاز؟',
    deleteBody: 'سيُحذف مع صوره من الصفحة العامة.',
    minTitle: 'حرفان على الأقل',
    badOrder: 'رقم بين 0 و999',
  },
  en: {
    add: 'New achievement',
    hint: 'Office milestones and their photos in the “Our achievements” section of the public site.',
    empty: 'No achievements yet',
    emptyBody: 'Add the office’s milestones: travellers served, awards, standout trips…',
    title: 'Title',
    description: 'Description',
    date: 'Date',
    order: 'Order',
    orderHint: 'Lower shows first',
    active: 'Shown on the site',
    hidden: 'Hidden',
    images: 'Photos',
    imagesHint: 'Up to 20 photos. JPEG, PNG or WebP up to 5 MB each.',
    addImages: 'Add photos',
    uploading: 'Uploading…',
    caption: 'Caption',
    removeImage: 'Remove photo',
    up: 'Move up',
    down: 'Move down',
    photos: '{n} photos',
    newTitle: 'New achievement',
    editTitle: 'Edit achievement',
    saved: 'Achievement saved',
    deleteTitle: 'Delete this achievement?',
    deleteBody: 'It is removed with its photos from the public site.',
    minTitle: 'At least 2 characters',
    badOrder: 'A number from 0 to 999',
  },
});

export function AchievementsTab() {
  const t = useMessages(m);
  const c = useMessages(common);
  const f = useFormat();
  const q = useResource<Achievement[]>('/cms/achievements');
  const invalidate = useInvalidate();
  const [editing, setEditing] = useState<Achievement | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Achievement | null>(null);
  const items = q.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{t.hint}</p>
        <Button onClick={() => setEditing('new')}>
          <Plus /> {t.add}
        </Button>
      </div>
      <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => void q.refetch()}>
        {!items.length ? (
          <Card>
            <EmptyState icon={Trophy} title={t.empty} description={t.emptyBody} action={<Button onClick={() => setEditing('new')}>{t.add}</Button>} />
          </Card>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {items.map((a) => (
              <li key={a.id}>
                <Card className={cn('flex h-full flex-col overflow-hidden', !a.isActive && 'opacity-70')}>
                  <div className="grid aspect-[16/9] grid-cols-3 grid-rows-2 gap-0.5 overflow-hidden bg-surface-sunken [&>img]:h-full [&>img]:min-h-0">
                    {a.images.length ? (
                      a.images.slice(0, 3).map((img, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={img.url} src={img.url} alt={img.caption ?? ''} className={cn('size-full object-cover', i === 0 ? 'col-span-2 row-span-2' : '', a.images.length === 1 && 'col-span-3', a.images.length === 2 && i === 1 && 'row-span-2')} />
                      ))
                    ) : (
                      <div className="col-span-3 row-span-2 grid place-items-center text-subtle">
                        <Images className="size-8" aria-hidden />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium leading-snug text-balance">{a.title}</h3>
                      <Badge tone={a.isActive ? 'success' : 'neutral'} size="sm" dot>
                        {a.isActive ? t.active : t.hidden}
                      </Badge>
                    </div>
                    {a.description && <p className="line-clamp-2 text-sm text-muted">{a.description}</p>}
                    <div className="mt-auto flex items-center gap-3 pt-2 text-xs text-muted">
                      {a.achievedOn && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="size-3.5" aria-hidden />
                          <span className="num">{f.date(a.achievedOn, 'medium')}</span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Images className="size-3.5" aria-hidden />
                        <span className="num">{fmt(t.photos, { n: a.images.length })}</span>
                      </span>
                      <span className="num">#{a.sortOrder}</span>
                      <span className="ms-auto flex gap-1">
                        <Button size="icon-sm" variant="ghost" aria-label={c.edit} onClick={() => setEditing(a)}>
                          <Pencil />
                        </Button>
                        <Button size="icon-sm" variant="ghost" aria-label={c.delete} onClick={() => setDeleting(a)}>
                          <Trash2 className="text-danger" />
                        </Button>
                      </span>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </QueryState>

      {editing && <AchievementDialog item={editing === 'new' ? null : editing} nextOrder={items.length} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t.deleteTitle}
        description={t.deleteBody}
        destructive
        confirmLabel={c.delete}
        onConfirm={async () => {
          if (!deleting) return;
          await api.delete(`/cms/achievements/${deleting.id}`);
          await invalidate('/cms/achievements');
        }}
      />
    </div>
  );
}

function AchievementDialog({ item, nextOrder, onClose }: { item: Achievement | null; nextOrder: number; onClose: () => void }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const invalidate = useInvalidate();
  const fileInput = useRef<HTMLInputElement>(null);
  const { upload, busy } = useImageUploader();
  const [images, setImages] = useState<{ url: string; caption: string }[]>(() => (item?.images ?? []).map((i) => ({ url: i.url, caption: i.caption ?? '' })));

  const schema = useMemo(
    () =>
      z.object({
        title: z.string().trim().min(2, { error: t.minTitle }).max(160),
        description: z.string().trim().max(5000),
        achievedOn: z.string(),
        sortOrder: z.string().refine((v) => /^\d{1,3}$/.test(v), { error: t.badOrder }),
        isActive: z.boolean(),
      }),
    [t],
  );
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: item?.title ?? '',
      description: item?.description ?? '',
      achievedOn: item?.achievedOn?.slice(0, 10) ?? '',
      sortOrder: String(item?.sortOrder ?? nextOrder),
      isActive: item?.isActive ?? true,
    },
  });

  const save = useApiMutation(
    (v: Values) => {
      const body = {
        title: v.title,
        description: v.description || null,
        achievedOn: v.achievedOn || undefined,
        sortOrder: Number(v.sortOrder),
        isActive: v.isActive,
        images: images.map((i) => ({ url: i.url, caption: i.caption.trim() || undefined })),
      };
      return item ? api.patch(`/cms/achievements/${item.id}`, body) : api.post('/cms/achievements', body);
    },
    {
      success: t.saved,
      onSuccess: async () => {
        await invalidate('/cms/achievements');
        onClose();
      },
    },
  );

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = Math.max(0, 20 - images.length);
    const urls = await upload([...files].slice(0, room));
    setImages((prev) => [...prev, ...urls.map((url) => ({ url, caption: '' }))]);
    if (fileInput.current) fileInput.current.value = '';
  };
  const move = (i: number, d: -1 | 1) =>
    setImages((prev) => {
      const j = i + d;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const errors = form.formState.errors;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? t.editTitle : t.newTitle}</DialogTitle>
          <DialogDescription>{t.hint}</DialogDescription>
        </DialogHeader>
        <form id="achievement-form" onSubmit={form.handleSubmit((v) => save.mutate(v))} noValidate className="grid gap-4 sm:grid-cols-6">
          <FormField label={t.title} error={errors.title?.message} required className="sm:col-span-6">
            <Input {...form.register('title')} />
          </FormField>
          <FormField label={t.description} error={errors.description?.message} className="sm:col-span-6">
            <Textarea rows={3} {...form.register('description')} />
          </FormField>
          <FormField label={t.date} className="sm:col-span-3">
            <Input type="date" dir="ltr" {...form.register('achievedOn')} />
          </FormField>
          <FormField label={t.order} hint={t.orderHint} error={errors.sortOrder?.message} className="sm:col-span-3">
            <Input dir="ltr" inputMode="numeric" {...form.register('sortOrder')} />
          </FormField>

          <div className="grid gap-3 sm:col-span-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-medium">{t.images}</div>
                <p className="text-xs text-muted">{t.imagesHint}</p>
              </div>
              <Button type="button" size="sm" variant="secondary" disabled={busy || images.length >= 20} onClick={() => fileInput.current?.click()}>
                {busy ? <Loader2 className="animate-spin" /> : <Upload />} {busy ? t.uploading : t.addImages}
              </Button>
              <input ref={fileInput} type="file" multiple accept={IMAGE_TYPES.join(',')} className="hidden" onChange={(e) => void addFiles(e.target.files)} />
            </div>
            {images.length > 0 && (
              <ul className="grid gap-3 sm:grid-cols-2">
                {images.map((img, i) => (
                  <li key={img.url} className="flex gap-3 rounded-tile bg-surface p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={img.caption} className="size-20 shrink-0 rounded-[12px] object-cover" />
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <Input
                        className="h-9"
                        placeholder={t.caption}
                        aria-label={t.caption}
                        value={img.caption}
                        maxLength={160}
                        onChange={(e) => setImages((prev) => prev.map((x, n) => (n === i ? { ...x, caption: e.target.value } : x)))}
                      />
                      <div className="flex gap-1">
                        <Button type="button" size="icon-sm" variant="ghost" aria-label={t.up} disabled={i === 0} onClick={() => move(i, -1)}>
                          <ArrowUp />
                        </Button>
                        <Button type="button" size="icon-sm" variant="ghost" aria-label={t.down} disabled={i === images.length - 1} onClick={() => move(i, 1)}>
                          <ArrowDown />
                        </Button>
                        <Button type="button" size="icon-sm" variant="ghost" className="ms-auto" aria-label={t.removeImage} onClick={() => setImages((prev) => prev.filter((_, n) => n !== i))}>
                          <X className="text-danger" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm sm:col-span-6">
            <input type="checkbox" className="size-4 accent-[var(--primary)]" {...form.register('isActive')} />
            {t.active}
          </label>
        </form>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {c.cancel}
          </Button>
          <Button type="submit" form="achievement-form" disabled={save.isPending || busy}>
            {save.isPending && <Loader2 className="animate-spin" />} {c.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
