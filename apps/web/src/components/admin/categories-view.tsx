'use client';

/*
 * Trip categories (REF-06): cultural, religious, ... A category in use cannot be deleted
 * (BR-20); deactivate it instead so it disappears from new choices.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ConfirmDialog } from '@/components/data/confirm-dialog';
import { FilterSelect, ResourceTable, type ResourceColumn } from '@/components/data/resource-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { api } from '@/lib/api';
import { useCan } from '@/lib/auth';
import { useApiMutation, useInvalidate, useName } from '@/lib/hooks';
import { defineMessages, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import type { Category } from '@/lib/types/api';
import { useToastAction } from './admin-helpers';

const m = defineMessages({
  ar: {
    eyebrow: 'البيانات المرجعية',
    title: 'تصنيفات الرحلات',
    description: 'تصنيفات تُستخدم للرحلات والبرامج وطلبات الرحلات المخصصة. يُحذف التصنيف فقط إن لم يُستخدم؛ وإلا يُعطَّل فيختفي من الخيارات الجديدة.',
    add: 'تصنيف جديد',
    nameAr: 'الاسم بالعربية',
    nameEn: 'الاسم بالإنكليزية',
    trips: 'الرحلات',
    programs: 'البرامج',
    status: 'الحالة',
    active: 'فعّال',
    inactive: 'معطّل',
    newTitle: 'تصنيف جديد',
    editTitle: 'تعديل التصنيف',
    formHint: 'يظهر الاسم العربي في لوحة التحكم والصفحة العامة، والإنكليزي في الواجهة الإنكليزية.',
    saved: 'تم حفظ التصنيف',
    nameShort: 'الاسم حرفان على الأقل',
    activate: 'تفعيل',
    deactivate: 'تعطيل',
    deactivateTitle: 'تعطيل التصنيف {name}؟',
    deactivateBody: 'يختفي من الخيارات الجديدة، وتبقى الرحلات والبرامج المرتبطة به كما هي.',
    activateTitle: 'تفعيل التصنيف {name}؟',
    activated: 'تم تفعيل التصنيف',
    deactivated: 'تم تعطيل التصنيف',
    delete: 'حذف',
    deleteTitle: 'حذف التصنيف {name}؟',
    deleteBody: 'يُحذف التصنيف نهائياً. يمكن حذف التصنيفات غير المستخدمة فقط.',
    deleteBlocked: 'التصنيف مستخدم في رحلات أو برامج؛ عطّله بدلاً من حذفه',
    deleted: 'تم حذف التصنيف',
    search: 'ابحث بالاسم…',
    empty: 'لا توجد تصنيفات',
    emptyBody: 'أضف تصنيفات مثل: ثقافي، ديني، ترفيهي.',
  },
  en: {
    eyebrow: 'Reference data',
    title: 'Trip categories',
    description: 'Categories for trips, programs and custom trip requests. A category can be deleted only when unused; otherwise disable it so it leaves new choices.',
    add: 'New category',
    nameAr: 'Arabic name',
    nameEn: 'English name',
    trips: 'Trips',
    programs: 'Programs',
    status: 'Status',
    active: 'Active',
    inactive: 'Inactive',
    newTitle: 'New category',
    editTitle: 'Edit category',
    formHint: 'The Arabic name shows in the dashboard and the public site; the English one in the English interface.',
    saved: 'Category saved',
    nameShort: 'The name needs at least 2 characters',
    activate: 'Activate',
    deactivate: 'Deactivate',
    deactivateTitle: 'Deactivate the category {name}?',
    deactivateBody: 'It disappears from new choices; linked trips and programs stay unchanged.',
    activateTitle: 'Activate the category {name}?',
    activated: 'Category activated',
    deactivated: 'Category deactivated',
    delete: 'Delete',
    deleteTitle: 'Delete the category {name}?',
    deleteBody: 'The category is deleted for good. Only unused categories can be deleted.',
    deleteBlocked: 'Used by trips or programs; deactivate it instead',
    deleted: 'Category deleted',
    search: 'Search by name…',
    empty: 'No categories yet',
    emptyBody: 'Add categories such as cultural, religious, leisure.',
  },
});

const usage = (x: Category) => (x._count?.trips ?? 0) + (x._count?.programs ?? 0);

export function CategoriesView() {
  const t = useMessages(m);
  const c = useMessages(common);
  const canManage = useCan('categories.manage');
  const name = useName();
  const invalidate = useInvalidate();
  const run = useToastAction();
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [toggling, setToggling] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const columns = useMemo<ResourceColumn<Category>[]>(
    () => [
      { id: 'nameAr', header: t.nameAr, sortKey: 'nameAr', cell: (x) => <span className="font-medium">{x.nameAr}</span> },
      { id: 'nameEn', header: t.nameEn, sortKey: 'nameEn', cell: (x) => <span dir="ltr">{x.nameEn}</span> },
      { id: 'trips', header: t.trips, align: 'end', cell: (x) => <span className="num">{x._count?.trips ?? 0}</span> },
      { id: 'programs', header: t.programs, align: 'end', cell: (x) => <span className="num">{x._count?.programs ?? 0}</span> },
      {
        id: 'status',
        header: t.status,
        cell: (x) => (
          <Badge tone={x.isActive ? 'success' : 'neutral'} dot>
            {x.isActive ? t.active : t.inactive}
          </Badge>
        ),
        print: (x) => (x.isActive ? t.active : t.inactive),
      },
      ...(canManage
        ? [
            {
              id: 'actions',
              header: c.actions,
              screenOnly: true,
              align: 'end' as const,
              cell: (x: Category) => (
                <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button size="icon-sm" variant="ghost" title={c.edit} aria-label={`${c.edit} ${name(x)}`} onClick={() => setEditing(x)}>
                    <Pencil />
                  </Button>
                  <Button size="icon-sm" variant="ghost" title={x.isActive ? t.deactivate : t.activate} aria-label={`${x.isActive ? t.deactivate : t.activate} ${name(x)}`} onClick={() => setToggling(x)}>
                    <Power className={x.isActive ? 'text-danger' : 'text-success'} />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    title={usage(x) > 0 ? t.deleteBlocked : t.delete}
                    aria-label={`${t.delete} ${name(x)}`}
                    disabled={usage(x) > 0}
                    onClick={() => setDeleting(x)}
                  >
                    <Trash2 className="text-danger" />
                  </Button>
                </div>
              ),
            },
          ]
        : []),
    ],
    [t, c, canManage, name],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
        actions={
          canManage && (
            <Button onClick={() => setEditing('new')}>
              <Plus /> {t.add}
            </Button>
          )
        }
      />
      <ResourceTable<Category>
        endpoint="/categories"
        columns={columns}
        exportTitle={t.title}
        searchPlaceholder={t.search}
        filterKeys={['isActive']}
        defaultSort={{ key: 'nameAr', order: 'asc' }}
        filters={(f, set) => (
          <FilterSelect
            label={t.status}
            value={f.isActive}
            onChange={(v) => set({ isActive: v })}
            options={[
              { value: 'true', label: t.active },
              { value: 'false', label: t.inactive },
            ]}
          />
        )}
        onRowClick={canManage ? (x) => setEditing(x) : undefined}
        getRowId={(x) => x.id}
        empty={{ title: t.empty, description: t.emptyBody }}
      />

      {editing && <CategoryDialog category={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}

      <ConfirmDialog
        open={!!toggling}
        onOpenChange={(o) => !o && setToggling(null)}
        title={toggling ? (toggling.isActive ? t.deactivateTitle : t.activateTitle).replace('{name}', name(toggling)) : ''}
        description={toggling?.isActive ? t.deactivateBody : undefined}
        destructive={toggling?.isActive}
        confirmLabel={toggling?.isActive ? t.deactivate : t.activate}
        onConfirm={async () => {
          if (!toggling) return;
          await run(() => api.patch(`/categories/${toggling.id}/active`, { isActive: !toggling.isActive }), toggling.isActive ? t.deactivated : t.activated);
          await invalidate('/categories', '/lookups');
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={deleting ? t.deleteTitle.replace('{name}', name(deleting)) : ''}
        description={t.deleteBody}
        destructive
        confirmLabel={t.delete}
        onConfirm={async () => {
          if (!deleting) return;
          // the API answers 409 when the category is used (also by custom requests); its message is shown
          await run(() => api.delete(`/categories/${deleting.id}`), t.deleted);
          await invalidate('/categories', '/lookups');
        }}
      />
    </div>
  );
}

function CategoryDialog({ category, onClose }: { category: Category | null; onClose: () => void }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const invalidate = useInvalidate();
  const schema = useMemo(
    () =>
      z.object({
        nameAr: z.string().trim().min(2, { error: t.nameShort }),
        nameEn: z.string().trim().min(2, { error: t.nameShort }),
      }),
    [t],
  );
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { nameAr: category?.nameAr ?? '', nameEn: category?.nameEn ?? '' },
  });
  const save = useApiMutation((v: Values) => (category ? api.patch(`/categories/${category.id}`, v) : api.post('/categories', v)), {
    success: t.saved,
    onSuccess: async () => {
      await invalidate('/categories', '/lookups');
      onClose();
    },
  });
  const errors = form.formState.errors;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? t.editTitle : t.newTitle}</DialogTitle>
          <DialogDescription>{t.formHint}</DialogDescription>
        </DialogHeader>
        <form id="category-form" onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid gap-4" noValidate>
          <FormField label={t.nameAr} error={errors.nameAr?.message} required>
            <Input {...form.register('nameAr')} autoFocus />
          </FormField>
          <FormField label={t.nameEn} error={errors.nameEn?.message} required>
            <Input dir="ltr" {...form.register('nameEn')} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {c.cancel}
          </Button>
          <Button type="submit" form="category-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />} {c.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
