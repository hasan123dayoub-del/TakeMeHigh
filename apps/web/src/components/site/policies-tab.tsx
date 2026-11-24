'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ExternalLink, FileText, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
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
import { defineMessages, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import type { Policy } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';

const m = defineMessages({
  ar: {
    add: 'صفحة جديدة',
    hint: 'صفحات نصية مثل الشروط والأحكام وسياسة الإلغاء والخصوصية، تظهر روابطها في تذييل الصفحة العامة.',
    empty: 'لا صفحات بعد',
    emptyBody: 'أضف الشروط والأحكام وسياسة الإلغاء والاسترجاع.',
    slug: 'المعرّف في الرابط',
    slugHint: 'أحرف إنجليزية صغيرة وأرقام وشرطات (مثال cancellation-policy).',
    badSlug: 'أحرف إنجليزية صغيرة وأرقام وشرطات فقط (2 إلى 80)',
    title: 'العنوان',
    body: 'النص',
    bodyHint: 'تُحفظ الأسطر الفارغة وفواصل الأسطر كما تكتبها.',
    order: 'الترتيب',
    active: 'منشورة',
    hidden: 'مخفية',
    view: 'عرض في الموقع',
    updated: 'آخر تعديل {d}',
    newTitle: 'صفحة جديدة',
    editTitle: 'تعديل الصفحة',
    saved: 'تم حفظ الصفحة',
    deleteTitle: 'حذف الصفحة؟',
    deleteBody: 'سيتوقف رابطها في الصفحة العامة عن العمل.',
    minTitle: 'حرفان على الأقل',
    minBody: '10 أحرف على الأقل',
    badOrder: 'رقم بين 0 و999',
  },
  en: {
    add: 'New page',
    hint: 'Text pages such as terms, cancellation and privacy policies, linked from the public site footer.',
    empty: 'No pages yet',
    emptyBody: 'Add the terms and conditions and the cancellation and refund policy.',
    slug: 'URL slug',
    slugHint: 'Lowercase letters, digits and dashes (e.g. cancellation-policy).',
    badSlug: 'Lowercase letters, digits and dashes only (2 to 80)',
    title: 'Title',
    body: 'Text',
    bodyHint: 'Blank lines and line breaks are kept as you type them.',
    order: 'Order',
    active: 'Published',
    hidden: 'Hidden',
    view: 'View on site',
    updated: 'Updated {d}',
    newTitle: 'New page',
    editTitle: 'Edit page',
    saved: 'Page saved',
    deleteTitle: 'Delete this page?',
    deleteBody: 'Its link on the public site stops working.',
    minTitle: 'At least 2 characters',
    minBody: 'At least 10 characters',
    badOrder: 'A number from 0 to 999',
  },
});

export function PoliciesTab() {
  const t = useMessages(m);
  const c = useMessages(common);
  const f = useFormat();
  const q = useResource<Policy[]>('/cms/policies');
  const invalidate = useInvalidate();
  const [editing, setEditing] = useState<Policy | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Policy | null>(null);
  const items = q.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted">{t.hint}</p>
        <Button onClick={() => setEditing('new')}>
          <Plus /> {t.add}
        </Button>
      </div>
      <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => void q.refetch()}>
        {!items.length ? (
          <Card>
            <EmptyState icon={FileText} title={t.empty} description={t.emptyBody} action={<Button onClick={() => setEditing('new')}>{t.add}</Button>} />
          </Card>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {items.map((p) => (
              <li key={p.id}>
                <Card className={cn('flex h-full flex-col gap-3 p-5', !p.isActive && 'opacity-70')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-medium">{p.title}</h3>
                      <div className="num mt-0.5 text-xs text-muted" dir="ltr">
                        /policies/{p.slug}
                      </div>
                    </div>
                    <Badge tone={p.isActive ? 'success' : 'neutral'} size="sm" dot>
                      {p.isActive ? t.active : t.hidden}
                    </Badge>
                  </div>
                  <p className="line-clamp-3 text-sm leading-relaxed whitespace-pre-line text-muted">{p.body}</p>
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-1 text-xs text-muted">
                    <span className="num">#{p.sortOrder}</span>
                    {p.updatedAt && <span>{t.updated.replace('{d}', f.date(p.updatedAt, 'medium'))}</span>}
                    <span className="ms-auto flex items-center gap-1">
                      <Button asChild size="xs" variant="ghost">
                        <a href={`/policies/${p.slug}`} target="_blank" rel="noreferrer">
                          <ExternalLink /> {t.view}
                        </a>
                      </Button>
                      <Button size="icon-sm" variant="ghost" aria-label={c.edit} onClick={() => setEditing(p)}>
                        <Pencil />
                      </Button>
                      <Button size="icon-sm" variant="ghost" aria-label={c.delete} onClick={() => setDeleting(p)}>
                        <Trash2 className="text-danger" />
                      </Button>
                    </span>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </QueryState>

      {editing && <PolicyDialog item={editing === 'new' ? null : editing} nextOrder={items.length} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t.deleteTitle}
        description={t.deleteBody}
        destructive
        confirmLabel={c.delete}
        onConfirm={async () => {
          if (!deleting) return;
          await api.delete(`/cms/policies/${deleting.id}`);
          await invalidate('/cms/policies');
        }}
      />
    </div>
  );
}

function PolicyDialog({ item, nextOrder, onClose }: { item: Policy | null; nextOrder: number; onClose: () => void }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const invalidate = useInvalidate();
  const schema = useMemo(
    () =>
      z.object({
        slug: z.string().trim().regex(/^[a-z0-9-]{2,80}$/, { error: t.badSlug }),
        title: z.string().trim().min(2, { error: t.minTitle }).max(160),
        body: z.string().min(10, { error: t.minBody }).max(50000),
        sortOrder: z.string().refine((v) => /^\d{1,3}$/.test(v), { error: t.badOrder }),
        isActive: z.boolean(),
      }),
    [t],
  );
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { slug: item?.slug ?? '', title: item?.title ?? '', body: item?.body ?? '', sortOrder: String(item?.sortOrder ?? nextOrder), isActive: item?.isActive ?? true },
  });
  const save = useApiMutation(
    (v: Values) => {
      const body = { ...v, sortOrder: Number(v.sortOrder) };
      return item ? api.put(`/cms/policies/${item.id}`, body) : api.post('/cms/policies', body);
    },
    {
      success: t.saved,
      onSuccess: async () => {
        await invalidate('/cms/policies');
        onClose();
      },
    },
  );
  const errors = form.formState.errors;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? t.editTitle : t.newTitle}</DialogTitle>
          <DialogDescription>{t.hint}</DialogDescription>
        </DialogHeader>
        <form id="policy-form" onSubmit={form.handleSubmit((v) => save.mutate(v))} noValidate className="grid gap-4 sm:grid-cols-6">
          <FormField label={t.title} error={errors.title?.message} required className="sm:col-span-3">
            <Input {...form.register('title')} />
          </FormField>
          <FormField label={t.slug} hint={t.slugHint} error={errors.slug?.message} required className="sm:col-span-2">
            <Input dir="ltr" {...form.register('slug')} />
          </FormField>
          <FormField label={t.order} error={errors.sortOrder?.message} className="sm:col-span-1">
            <Input dir="ltr" inputMode="numeric" {...form.register('sortOrder')} />
          </FormField>
          <FormField label={t.body} hint={t.bodyHint} error={errors.body?.message} required className="sm:col-span-6">
            <Textarea rows={14} className="whitespace-pre-wrap" {...form.register('body')} />
          </FormField>
          <label className="flex items-center gap-2 text-sm sm:col-span-6">
            <input type="checkbox" className="size-4 accent-[var(--primary)]" {...form.register('isActive')} />
            {t.active}
          </label>
        </form>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {c.cancel}
          </Button>
          <Button type="submit" form="policy-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />} {c.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
