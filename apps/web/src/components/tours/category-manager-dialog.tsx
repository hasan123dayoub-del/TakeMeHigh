'use client';

import { Check, Pencil, Plus, Tags, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { AppDialog, ConfirmDialog } from '@/components/trips/kit/dialogs';
import { ErrorBanner, QueryError, useErrorText } from '@/components/trips/kit/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { common, fmt, useMessages } from '@/lib/i18n';
import { useDeleteCategory, useSaveCategory, useTourCategories } from '@/lib/queries/tours';
import type { TourCategory } from '@/lib/types/tours';
import { toursMessages } from './messages';

/** Office tour categories: list, add, rename (English + Arabic) and delete. */
export function CategoryManagerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useMessages(toursMessages);
  const c = useMessages(common);
  const errorText = useErrorText();
  const categories = useTourCategories(open);
  const save = useSaveCategory();
  const del = useDeleteCategory();
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<TourCategory | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setAddError(null);
    if (name.trim().length < 2) return setAddError(t.nameMin);
    try {
      await save.mutateAsync({ name: name.trim(), nameAr: nameAr.trim() || undefined });
      toast.success(t.categoryAdded);
      setName('');
      setNameAr('');
    } catch (err) {
      setAddError(errorText(err));
    }
  };

  return (
    <AppDialog open={open} onOpenChange={onOpenChange} size="lg" title={t.categoriesTitle} description={t.categoriesDescription}>
      <form onSubmit={add} className="grid gap-2 rounded-tile border border-border bg-surface p-3 sm:grid-cols-[1fr_1fr_auto]" noValidate>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.categoryNameEn} aria-label={t.categoryNameEn} dir="ltr" className="h-10" />
        <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder={t.categoryNameAr} aria-label={t.categoryNameAr} dir="rtl" className="h-10" />
        <Button type="submit" loading={save.isPending && !editing} className="h-10">
          <Plus /> {t.addCategory}
        </Button>
        {addError && <ErrorBanner className="sm:col-span-3">{addError}</ErrorBanner>}
      </form>

      {categories.isLoading ? (
        <div className="grid gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : categories.isError ? (
        <QueryError error={categories.error} onRetry={() => categories.refetch()} />
      ) : !categories.data?.length ? (
        <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted">
          <Tags className="size-4" aria-hidden /> {t.noCategories}
        </p>
      ) : (
        <ul className="grid divide-y divide-border rounded-tile border border-border">
          {categories.data.map((cat) =>
            editing === cat.id ? (
              <EditRow key={cat.id} category={cat} onClose={() => setEditing(null)} />
            ) : (
              <li key={cat.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    <span dir="rtl">{cat.nameAr ?? '—'}</span>
                    <span className="mx-2 text-subtle">·</span>
                    <span dir="ltr">{cat.name}</span>
                  </p>
                  <p className="num text-xs text-muted">{fmt(t.categoryTours, { n: cat._count?.tours ?? 0 })}</p>
                </div>
                <Button variant="ghost" size="icon-sm" aria-label={`${c.edit} ${cat.name}`} onClick={() => setEditing(cat.id)}>
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${c.delete} ${cat.name}`}
                  className="hover:text-danger"
                  onClick={() => {
                    setDeleteError(null);
                    setToDelete(cat);
                  }}
                >
                  <Trash2 />
                </Button>
              </li>
            ),
          )}
        </ul>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={fmt(t.deleteCategoryTitle, { name: toDelete?.nameAr ?? toDelete?.name ?? '' })}
        description={fmt(t.deleteCategoryBody, { n: toDelete?._count?.tours ?? 0 })}
        confirmLabel={c.delete}
        loading={del.isPending}
        error={deleteError}
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await del.mutateAsync(toDelete.id);
            toast.success(t.categoryDeleted);
            setToDelete(null);
          } catch (err) {
            setDeleteError(errorText(err));
          }
        }}
      />
    </AppDialog>
  );
}

function EditRow({ category, onClose }: { category: TourCategory; onClose: () => void }) {
  const t = useMessages(toursMessages);
  const c = useMessages(common);
  const errorText = useErrorText();
  const save = useSaveCategory();
  const [name, setName] = useState(category.name);
  const [nameAr, setNameAr] = useState(category.nameAr ?? '');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) return setError(t.nameMin);
    try {
      await save.mutateAsync({ id: category.id, name: name.trim(), nameAr: nameAr.trim() || undefined });
      toast.success(t.categorySaved);
      onClose();
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <li className="px-3 py-3">
      <form onSubmit={submit} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]" noValidate>
        <Input value={name} onChange={(e) => setName(e.target.value)} aria-label={t.categoryNameEn} dir="ltr" className="h-10" autoFocus />
        <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} aria-label={t.categoryNameAr} dir="rtl" className="h-10" />
        <div className="flex gap-1">
          <Button type="submit" size="icon" aria-label={c.save} loading={save.isPending}>
            {!save.isPending && <Check />}
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label={c.cancel} onClick={onClose}>
            <X />
          </Button>
        </div>
        {error && <ErrorBanner className="sm:col-span-3">{error}</ErrorBanner>}
      </form>
    </li>
  );
}
