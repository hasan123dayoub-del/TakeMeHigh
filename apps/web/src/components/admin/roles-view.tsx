'use client';

/*
 * Roles and permissions (AUTH-04..06): a matrix of every permission (rows, grouped by module)
 * against every role (columns). The Admin column always has everything and cannot be edited.
 * Edits are kept as a draft per role and saved with PUT /roles/:id/permissions.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { Info, Loader2, Pencil, Plus, RotateCcw, Save, Trash2, Users } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { LABELS, PERMISSION_MODULES, type Permission, type RoleScope } from '@travelos/shared';
import { ConfirmDialog } from '@/components/data/confirm-dialog';
import { QueryState } from '@/components/data/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api, errorMessage } from '@/lib/api';
import { useCan } from '@/lib/auth';
import { useApiMutation, useInvalidate, useResource } from '@/lib/hooks';
import { defineMessages, useLocale, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import type { Role } from '@/lib/types/api';
import { cn } from '@/lib/utils';
import { useToastAction } from './admin-helpers';

/** GET /roles/permissions */
interface CatalogueItem {
  code: Permission;
  module: keyof typeof PERMISSION_MODULES;
  ar: string;
  en: string;
}

const m = defineMessages({
  ar: {
    eyebrow: 'الإدارة',
    title: 'الأدوار والصلاحيات',
    description: 'حدّد ما يستطيع كل دور فعله. دور مدير المكتب يملك كل الصلاحيات دائماً ولا يمكن تقليصها.',
    refreshNote: 'يحصل أعضاء الدور على التغييرات عند التجديد التالي لجلستهم (خلال 15 دقيقة على الأكثر).',
    add: 'دور جديد',
    permission: 'الصلاحية',
    users: '{n} مستخدم',
    system: 'دور أساسي',
    custom: 'دور مخصص',
    unsaved: 'تغييرات غير محفوظة في {n} دور',
    saveAll: 'حفظ التغييرات',
    discard: 'تراجع',
    saved: 'تم حفظ صلاحيات {name}',
    savedAll: 'تم حفظ الصلاحيات',
    adminLocked: 'مدير المكتب يملك كل الصلاحيات دائماً',
    rename: 'تعديل الاسم',
    delete: 'حذف الدور',
    deleteTitle: 'حذف الدور {name}؟',
    deleteBody: 'يُحذف الدور نهائياً. لا يمكن حذف دور له مستخدمون.',
    deleteBlocked: 'انقل مستخدمي هذا الدور إلى دور آخر أولاً',
    deleted: 'تم حذف الدور',
    newTitle: 'دور جديد',
    newHint: 'الأدوار المخصصة تتبع فرعاً (أو الرحلات المسندة فقط). يمكنك البدء من صلاحيات دور موجود ثم تعديلها في المصفوفة.',
    editTitle: 'تعديل الدور',
    code: 'الرمز',
    codeHint: 'بأحرف إنكليزية كبيرة وشرطة سفلية، مثال SENIOR_EMPLOYEE. لا يتغير لاحقاً.',
    codeRule: 'الرمز 3–40 حرفاً: أحرف إنكليزية كبيرة وأرقام و _ ويبدأ بحرف',
    nameAr: 'الاسم بالعربية',
    nameEn: 'الاسم بالإنكليزية',
    roleDescription: 'الوصف',
    scope: 'النطاق',
    scopeHint: 'الفرع: يرى بيانات فرعه. المسند فقط: يرى الرحلات المسندة إليه (مثل الدليل).',
    copyFrom: 'البدء من صلاحيات',
    copyNone: 'بدون صلاحيات',
    required: 'هذا الحقل مطلوب',
    nameShort: 'الاسم حرفان على الأقل',
    roleSaved: 'تم حفظ الدور',
    count: '{n} من {total}',
  },
  en: {
    eyebrow: 'Administration',
    title: 'Roles & permissions',
    description: 'Choose what each role can do. The Admin role always has every permission and cannot be reduced.',
    refreshNote: 'Members of a role get the changes at their next session refresh (within 15 minutes).',
    add: 'New role',
    permission: 'Permission',
    users: '{n} users',
    system: 'System role',
    custom: 'Custom role',
    unsaved: 'Unsaved changes in {n} role(s)',
    saveAll: 'Save changes',
    discard: 'Discard',
    saved: 'Permissions of {name} saved',
    savedAll: 'Permissions saved',
    adminLocked: 'The Admin always has every permission',
    rename: 'Rename',
    delete: 'Delete role',
    deleteTitle: 'Delete the role {name}?',
    deleteBody: 'The role is deleted for good. A role with users cannot be deleted.',
    deleteBlocked: 'Move the users of this role to another role first',
    deleted: 'Role deleted',
    newTitle: 'New role',
    newHint: 'Custom roles are bound to a branch (or to assigned trips only). Start from an existing role, then adjust it in the matrix.',
    editTitle: 'Edit role',
    code: 'Code',
    codeHint: 'UPPER_SNAKE_CASE, e.g. SENIOR_EMPLOYEE. It cannot change later.',
    codeRule: 'Code: 3–40 characters, uppercase letters, digits and _, starting with a letter',
    nameAr: 'Arabic name',
    nameEn: 'English name',
    roleDescription: 'Description',
    scope: 'Scope',
    scopeHint: 'Own branch: sees the data of their branch. Assigned only: sees trips assigned to them (like a guide).',
    copyFrom: 'Start from the permissions of',
    copyNone: 'No permissions',
    required: 'This field is required',
    nameShort: 'The name needs at least 2 characters',
    roleSaved: 'Role saved',
    count: '{n} of {total}',
  },
});

const sameSet = (a: Set<string>, b: readonly string[]) => a.size === b.length && b.every((p) => a.has(p));

export function RolesView() {
  const t = useMessages(m);
  const canManage = useCan('roles.manage');
  const roles = useResource<Role[]>('/roles');
  const catalogue = useResource<CatalogueItem[]>('/roles/permissions');

  return (
    <div className="flex flex-col gap-6">
      <RolesHeader canManage={canManage} roles={roles.data ?? []} />
      <QueryState
        isLoading={roles.isLoading || catalogue.isLoading}
        error={roles.error ?? catalogue.error}
        onRetry={() => {
          void roles.refetch();
          void catalogue.refetch();
        }}
      >
        {roles.data && catalogue.data && <Matrix roles={roles.data} catalogue={catalogue.data} canManage={canManage} />}
      </QueryState>
      <p className="flex items-start gap-2 text-sm text-muted">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden /> {t.refreshNote}
      </p>
    </div>
  );
}

function RolesHeader({ canManage, roles }: { canManage: boolean; roles: Role[] }) {
  const t = useMessages(m);
  const [creating, setCreating] = useState(false);
  return (
    <>
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
        actions={
          canManage && (
            <Button onClick={() => setCreating(true)}>
              <Plus /> {t.add}
            </Button>
          )
        }
      />
      {creating && <RoleDialog role={null} roles={roles} onClose={() => setCreating(false)} />}
    </>
  );
}

function Matrix({ roles, catalogue, canManage }: { roles: Role[]; catalogue: CatalogueItem[]; canManage: boolean }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const { locale } = useLocale();
  const invalidate = useInvalidate();
  const run = useToastAction();
  /** Draft permission sets per role id (only roles the user touched). */
  const [drafts, setDrafts] = useState<Record<string, Set<string>>>({});
  const [saving, setSaving] = useState(false);
  const [renaming, setRenaming] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState<Role | null>(null);

  const groups = useMemo(() => {
    const out: { module: keyof typeof PERMISSION_MODULES; items: CatalogueItem[] }[] = [];
    for (const item of catalogue) {
      const g = out.find((x) => x.module === item.module);
      if (g) g.items.push(item);
      else out.push({ module: item.module, items: [item] });
    }
    return out;
  }, [catalogue]);

  const current = (r: Role) => drafts[r.id] ?? new Set(r.permissions);
  const dirty = roles.filter((r) => drafts[r.id] && !sameSet(drafts[r.id], r.permissions));
  const isAdminRole = (r: Role) => r.code === 'ADMIN';
  const editable = (r: Role) => canManage && !isAdminRole(r);

  const toggle = (r: Role, code: string) => {
    if (!editable(r)) return;
    setDrafts((d) => {
      const next = new Set(d[r.id] ?? r.permissions);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return { ...d, [r.id]: next };
    });
  };

  const toggleModule = (r: Role, items: CatalogueItem[]) => {
    if (!editable(r)) return;
    setDrafts((d) => {
      const next = new Set(d[r.id] ?? r.permissions);
      const allOn = items.every((i) => next.has(i.code));
      for (const i of items) {
        if (allOn) next.delete(i.code);
        else next.add(i.code);
      }
      return { ...d, [r.id]: next };
    });
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const r of dirty) {
        await api.put(`/roles/${r.id}/permissions`, { permissions: [...drafts[r.id]] });
        setDrafts((d) => {
          const { [r.id]: _done, ...rest } = d;
          void _done;
          return rest;
        });
      }
      toast.success(dirty.length === 1 ? t.saved.replace('{name}', locale === 'en' ? dirty[0].nameEn : dirty[0].nameAr) : t.savedAll);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
      await invalidate('/roles');
    }
  };

  const roleName = (r: Role) => (locale === 'en' ? r.nameEn : r.nameAr);

  return (
    <>
      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm">
            <caption className="sr-only">{t.title}</caption>
            <thead>
              <tr>
                <th scope="col" className="sticky start-0 z-20 min-w-[260px] border-b border-border bg-surface px-4 py-3 text-start align-bottom font-medium text-muted">
                  {t.permission}
                </th>
                {roles.map((r) => (
                  <th key={r.id} scope="col" className={cn('min-w-[150px] border-b border-border px-3 py-3 text-center align-bottom font-normal', drafts[r.id] && dirty.includes(r) && 'bg-warning/8')}>
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="font-medium text-foreground">{roleName(r)}</span>
                      <span className="font-mono text-[10px] text-subtle" dir="ltr">
                        {r.code}
                      </span>
                      <div className="flex flex-wrap items-center justify-center gap-1">
                        <Badge size="sm" tone={r.scope === 'ALL' ? 'ink' : r.scope === 'ASSIGNED' ? 'info' : 'neutral'}>
                          {LABELS.roleScope[r.scope][locale]}
                        </Badge>
                        <Badge size="sm" tone={r.isSystem ? 'primary' : 'warning'}>
                          {r.isSystem ? t.system : t.custom}
                        </Badge>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs text-muted">
                        <Users className="size-3" aria-hidden />
                        <span className="num">{t.users.replace('{n}', String(r.usersCount))}</span>
                      </span>
                      <span className="num text-[11px] text-subtle">{t.count.replace('{n}', String(current(r).size)).replace('{total}', String(catalogue.length))}</span>
                      {canManage && !r.isSystem && (
                        <div className="flex gap-0.5">
                          <Button size="icon-sm" variant="ghost" title={t.rename} aria-label={`${t.rename}: ${roleName(r)}`} onClick={() => setRenaming(r)}>
                            <Pencil />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            title={r.usersCount > 0 ? t.deleteBlocked : t.delete}
                            aria-label={`${t.delete}: ${roleName(r)}`}
                            disabled={r.usersCount > 0}
                            onClick={() => setDeleting(r)}
                          >
                            <Trash2 className="text-danger" />
                          </Button>
                        </div>
                      )}
                      {canManage && r.isSystem && !isAdminRole(r) && (
                        <Button size="icon-sm" variant="ghost" title={t.rename} aria-label={`${t.rename}: ${roleName(r)}`} onClick={() => setRenaming(r)}>
                          <Pencil />
                        </Button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <Fragment key={g.module}>
                  <tr>
                    <th scope="colgroup" className="sticky start-0 z-10 border-b border-border bg-surface-raised px-4 py-2 text-start text-xs font-semibold tracking-wide text-muted uppercase">
                      {PERMISSION_MODULES[g.module][locale]}
                    </th>
                    {roles.map((r) => {
                      const on = g.items.filter((i) => current(r).has(i.code)).length;
                      return (
                        <td key={r.id} className="border-b border-border bg-surface-raised px-3 py-2 text-center">
                          {editable(r) ? (
                            <button
                              type="button"
                              className="num rounded-full px-2 py-0.5 text-[11px] text-muted hover:bg-surface hover:text-foreground"
                              onClick={() => toggleModule(r, g.items)}
                              aria-label={`${PERMISSION_MODULES[g.module][locale]} — ${roleName(r)}`}
                            >
                              {on}/{g.items.length}
                            </button>
                          ) : (
                            <span className="num text-[11px] text-subtle">
                              {on}/{g.items.length}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  {g.items.map((p) => (
                    <tr key={p.code} className="hover:bg-surface-raised/60">
                      <th scope="row" className="sticky start-0 z-10 border-b border-border/60 bg-surface px-4 py-2.5 text-start font-normal">
                        <div className="flex flex-col">
                          <span>{locale === 'en' ? p.en : p.ar}</span>
                          <span className="self-start font-mono text-[10px] text-subtle" dir="ltr">
                            {p.code}
                          </span>
                        </div>
                      </th>
                      {roles.map((r) => {
                        const checked = isAdminRole(r) || current(r).has(p.code);
                        const changed = !!drafts[r.id] && drafts[r.id].has(p.code) !== r.permissions.includes(p.code);
                        return (
                          <td key={r.id} className={cn('border-b border-border/60 px-3 py-2.5 text-center', changed && 'bg-warning/10')}>
                            <input
                              type="checkbox"
                              className="size-4 cursor-pointer accent-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
                              checked={checked}
                              disabled={!editable(r)}
                              title={isAdminRole(r) ? t.adminLocked : undefined}
                              aria-label={`${locale === 'en' ? p.en : p.ar} — ${roleName(r)}`}
                              onChange={() => toggle(r, p.code)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {dirty.length > 0 && (
        <div className="sticky bottom-4 z-30 flex flex-wrap items-center justify-between gap-3 rounded-full border border-border bg-surface-raised px-5 py-3 shadow-card">
          <span className="text-sm font-medium">{t.unsaved.replace('{n}', String(dirty.length))}</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={saving} onClick={() => setDrafts({})}>
              <RotateCcw /> {t.discard}
            </Button>
            <Button size="sm" disabled={saving} onClick={saveAll}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />} {t.saveAll}
            </Button>
          </div>
        </div>
      )}

      {renaming && <RoleDialog role={renaming} roles={roles} onClose={() => setRenaming(null)} />}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={deleting ? t.deleteTitle.replace('{name}', roleName(deleting)) : ''}
        description={t.deleteBody}
        destructive
        confirmLabel={c.delete}
        onConfirm={async () => {
          if (!deleting) return;
          await run(() => api.delete(`/roles/${deleting.id}`), t.deleted);
          await invalidate('/roles');
        }}
      />
    </>
  );
}

function RoleDialog({ role, roles, onClose }: { role: Role | null; roles: Role[]; onClose: () => void }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const { locale } = useLocale();
  const invalidate = useInvalidate();

  const schema = useMemo(
    () =>
      z.object({
        code: role ? z.string() : z.string().trim().regex(/^[A-Z][A-Z0-9_]{2,39}$/, { error: t.codeRule }),
        nameAr: z.string().trim().min(2, { error: t.nameShort }),
        nameEn: z.string().trim().min(2, { error: t.nameShort }),
        description: z.string().trim().max(255).optional(),
        scope: z.enum(['BRANCH', 'ASSIGNED']),
        copyFrom: z.string().optional(),
      }),
    [t, role],
  );
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: role?.code ?? '',
      nameAr: role?.nameAr ?? '',
      nameEn: role?.nameEn ?? '',
      description: role?.description ?? '',
      scope: role?.scope === 'ASSIGNED' ? 'ASSIGNED' : 'BRANCH',
      copyFrom: 'none',
    },
  });

  const save = useApiMutation(
    (v: Values) => {
      if (role) return api.patch(`/roles/${role.id}`, { nameAr: v.nameAr, nameEn: v.nameEn, description: v.description || undefined });
      const source = roles.find((r) => r.id === v.copyFrom);
      return api.post('/roles', {
        code: v.code,
        nameAr: v.nameAr,
        nameEn: v.nameEn,
        description: v.description || undefined,
        scope: v.scope,
        permissions: source ? source.permissions : [],
      });
    },
    {
      success: t.roleSaved,
      onSuccess: async () => {
        await invalidate('/roles');
        onClose();
      },
    },
  );

  const errors = form.formState.errors;
  const scopes: Exclude<RoleScope, 'ALL'>[] = ['BRANCH', 'ASSIGNED'];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{role ? t.editTitle : t.newTitle}</DialogTitle>
          {!role && <DialogDescription>{t.newHint}</DialogDescription>}
        </DialogHeader>
        <form id="role-form" onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid gap-4 sm:grid-cols-2" noValidate>
          {!role && (
            <FormField label={t.code} hint={t.codeHint} error={errors.code?.message} required className="sm:col-span-2">
              <Input
                dir="ltr"
                className="font-mono"
                autoFocus
                {...form.register('code', { setValueAs: (v: string) => v.toUpperCase().replace(/[\s-]+/g, '_') })}
              />
            </FormField>
          )}
          <FormField label={t.nameAr} error={errors.nameAr?.message} required>
            <Input {...form.register('nameAr')} autoFocus={!!role} />
          </FormField>
          <FormField label={t.nameEn} error={errors.nameEn?.message} required>
            <Input dir="ltr" {...form.register('nameEn')} />
          </FormField>
          <FormField label={t.roleDescription} className="sm:col-span-2">
            <Textarea rows={2} maxLength={255} {...form.register('description')} />
          </FormField>
          {!role && (
            <>
              <FormField label={t.scope} hint={t.scopeHint} required>
                <Controller
                  control={form.control}
                  name="scope"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {scopes.map((s) => (
                          <SelectItem key={s} value={s}>
                            {LABELS.roleScope[s][locale]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField label={t.copyFrom}>
                <Controller
                  control={form.control}
                  name="copyFrom"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t.copyNone}</SelectItem>
                        {roles
                          .filter((r) => r.code !== 'ADMIN')
                          .map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {locale === 'en' ? r.nameEn : r.nameAr}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            </>
          )}
        </form>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {c.cancel}
          </Button>
          <Button type="submit" form="role-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />} {c.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
