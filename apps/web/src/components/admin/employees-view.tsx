'use client';

/*
 * Staff (ORG-04..09, AUTH-11, AUTH-13): employees, branch managers and tour guides.
 * The Admin sees every branch; a branch manager sees and adds staff of their own branch only,
 * and may only create employees and tour guides (the API enforces the same rules).
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftRight, KeyRound, Loader2, Lock, MoreHorizontal, Pencil, Plus, Power } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { ConfirmDialog } from '@/components/data/confirm-dialog';
import { FilterSelect, ResourceTable, type ResourceColumn } from '@/components/data/resource-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useApiMutation, useInvalidate, useLookups, useResource } from '@/lib/hooks';
import { defineMessages, useLocale, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import type { Role, StaffUser } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';
import { CopyButton, useToastAction } from './admin-helpers';

/** Roles a branch manager may hand out (ORG-05). */
const BRANCH_GRANTABLE = ['EMPLOYEE', 'TOUR_GUIDE'];
/** Same rule as the API (AUTH-10): at least 10 characters with a letter and a digit. */
const PASSWORD_RULE = /^(?=.*[A-Za-z؀-ۿ])(?=.*\d).{10,128}$/;

const m = defineMessages({
  ar: {
    eyebrow: 'الإدارة',
    title: 'الموظفون',
    description: 'موظفو المكتب ومديرو الفروع والأدلة السياحيون. يغيّر كل مستخدم كلمة مروره الأولى عند أول دخول.',
    descriptionBranch: 'موظفو فرعك والأدلة السياحيون. يمكنك إضافة موظفين وأدلة إلى فرعك فقط.',
    add: 'موظف جديد',
    name: 'الاسم',
    email: 'البريد الإلكتروني',
    phone: 'الهاتف',
    role: 'الدور',
    branch: 'الفرع',
    allBranches: 'كل الفروع',
    lastLogin: 'آخر دخول',
    never: 'لم يسجّل الدخول بعد',
    status: 'الحالة',
    active: 'فعّال',
    inactive: 'معطّل',
    locked: 'مقفل مؤقتاً',
    lockedHint: 'أُقفل الحساب بعد محاولات دخول فاشلة حتى {time}. إعادة تعيين كلمة المرور تفتحه.',
    mustChange: 'يجب تغيير كلمة المرور',
    search: 'ابحث بالاسم أو البريد أو الهاتف…',
    empty: 'لا يوجد موظفون',
    emptyBody: 'أضف أول موظف واختر دوره وفرعه.',
    newTitle: 'موظف جديد',
    editTitle: 'تعديل بيانات الموظف',
    formHint: 'يُطلب من المستخدم تغيير كلمة المرور الأولى عند أول دخول.',
    editHint: 'لنقل الموظف إلى فرع آخر استخدم «نقل إلى فرع». تغيير الدور ينهي جلسات المستخدم الحالية.',
    password: 'كلمة المرور الأولى',
    passwordHint: '10 أحرف على الأقل، وتحتوي حرفاً ورقماً.',
    passwordRule: 'كلمة المرور 10 أحرف على الأقل وتحتوي حرفاً ورقماً',
    branchOwn: 'يُضاف إلى فرعك تلقائياً.',
    branchNone: 'هذا الدور يرى كل الفروع ولا يتبع فرعاً.',
    guideSection: 'ملف الدليل السياحي',
    languages: 'اللغات',
    languagesHint: 'مثال: العربية، الإنكليزية',
    licenseNo: 'رقم الترخيص',
    bio: 'نبذة',
    required: 'هذا الحقل مطلوب',
    nameShort: 'الاسم 3 أحرف على الأقل',
    invalidEmail: 'بريد إلكتروني غير صالح',
    saved: 'تم حفظ الموظف',
    deactivate: 'تعطيل',
    activate: 'تفعيل',
    deactivateTitle: 'تعطيل حساب {name}؟',
    deactivateBody: 'لن يستطيع تسجيل الدخول وتنتهي جلساته الحالية. تبقى بياناته وسجلّه محفوظة.',
    activateTitle: 'تفعيل حساب {name}؟',
    activateBody: 'سيتمكن من تسجيل الدخول مجدداً، ويُفتح قفل الحساب إن وُجد.',
    activated: 'تم تفعيل الحساب',
    deactivated: 'تم تعطيل الحساب',
    resetPassword: 'إعادة تعيين كلمة المرور',
    resetTitle: 'إعادة تعيين كلمة مرور {name}؟',
    resetBody: 'تُنشأ كلمة مرور مؤقتة تظهر مرة واحدة فقط، وتنتهي جلسات المستخدم الحالية، ويُفتح قفل الحساب. سيُطلب منه تغييرها عند الدخول.',
    reset: 'إعادة التعيين',
    resetDone: 'تمت إعادة تعيين كلمة المرور',
    tempTitle: 'كلمة المرور المؤقتة',
    tempBody: 'سلّمها إلى {name} بطريقة آمنة. لن تظهر مرة أخرى، وسيُطلب منه تغييرها عند أول دخول.',
    transfer: 'نقل إلى فرع',
    transferTitle: 'نقل {name} إلى فرع آخر',
    transferBody: 'ينتقل الموظف مع صلاحيات دوره إلى الفرع الجديد، وتنتهي جلساته الحالية. تبقى العمليات السابقة مسجلة باسم الفرع القديم.',
    newBranch: 'الفرع الجديد',
    transferred: 'تم نقل الموظف',
    current: 'الحالي',
    rowActions: 'إجراءات {name}',
    rolesError: 'تعذّر تحميل الأدوار',
  },
  en: {
    eyebrow: 'Administration',
    title: 'Staff',
    description: 'Office staff, branch managers and tour guides. Every user changes the initial password at first sign-in.',
    descriptionBranch: 'Staff and tour guides of your branch. You can add employees and guides to your branch only.',
    add: 'New staff member',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    role: 'Role',
    branch: 'Branch',
    allBranches: 'All branches',
    lastLogin: 'Last sign-in',
    never: 'Never signed in',
    status: 'Status',
    active: 'Active',
    inactive: 'Inactive',
    locked: 'Locked',
    lockedHint: 'Locked after failed sign-ins until {time}. Resetting the password unlocks it.',
    mustChange: 'Must change password',
    search: 'Search by name, email or phone…',
    empty: 'No staff yet',
    emptyBody: 'Add the first staff member and choose their role and branch.',
    newTitle: 'New staff member',
    editTitle: 'Edit staff member',
    formHint: 'The user must change the initial password at first sign-in.',
    editHint: 'Use “Move to branch” to change the branch. Changing the role ends the user’s current sessions.',
    password: 'Initial password',
    passwordHint: 'At least 10 characters with a letter and a digit.',
    passwordRule: 'The password needs at least 10 characters with a letter and a digit',
    branchOwn: 'Added to your branch automatically.',
    branchNone: 'This role sees every branch and has no branch.',
    guideSection: 'Tour guide profile',
    languages: 'Languages',
    languagesHint: 'e.g. Arabic, English',
    licenseNo: 'Licence number',
    bio: 'Bio',
    required: 'This field is required',
    nameShort: 'The name needs at least 3 characters',
    invalidEmail: 'Invalid email address',
    saved: 'Staff member saved',
    deactivate: 'Deactivate',
    activate: 'Activate',
    deactivateTitle: 'Deactivate {name}?',
    deactivateBody: 'They will not be able to sign in and their sessions end. Their data and history stay.',
    activateTitle: 'Activate {name}?',
    activateBody: 'They can sign in again; any lock on the account is cleared.',
    activated: 'Account activated',
    deactivated: 'Account deactivated',
    resetPassword: 'Reset password',
    resetTitle: 'Reset the password of {name}?',
    resetBody: 'A temporary password is shown once, current sessions end and the account is unlocked. They must change it at sign-in.',
    reset: 'Reset',
    resetDone: 'Password reset',
    tempTitle: 'Temporary password',
    tempBody: 'Give it to {name} safely. It will not be shown again, and they must change it at first sign-in.',
    transfer: 'Move to branch',
    transferTitle: 'Move {name} to another branch',
    transferBody: 'The user keeps their role in the new branch and their sessions end. Past operations stay recorded under the old branch.',
    newBranch: 'New branch',
    transferred: 'Staff member moved',
    current: 'current',
    rowActions: 'Actions for {name}',
    rolesError: 'Could not load roles',
  },
});

const fill = (s: string, name: string) => s.replace('{name}', name);

export function EmployeesView() {
  const t = useMessages(m);
  const c = useMessages(common);
  const { locale } = useLocale();
  const { can, isAdmin, user: me } = useAuth();
  const f = useFormat();
  const lookups = useLookups();
  const invalidate = useInvalidate();
  const run = useToastAction();
  const canManage = can('users.manage');
  const canTransfer = isAdmin && can('users.manage', 'branches.manage');
  const roles = useResource<Role[]>(canManage ? '/roles' : null);

  const [editing, setEditing] = useState<StaffUser | 'new' | null>(null);
  const [toggling, setToggling] = useState<StaffUser | null>(null);
  const [resetting, setResetting] = useState<StaffUser | null>(null);
  const [temp, setTemp] = useState<{ name: string; password: string } | null>(null);
  const [moving, setMoving] = useState<StaffUser | null>(null);

  /** A branch manager only manages employees and guides of the branch (the API checks too). */
  const canManageRow = (u: StaffUser) => canManage && (isAdmin || BRANCH_GRANTABLE.includes(u.role.code));
  const roleName = (r: { nameAr: string; nameEn: string }) => (locale === 'en' ? r.nameEn : r.nameAr);

  const columns = useMemo<ResourceColumn<StaffUser>[]>(
    () => [
      {
        id: 'name',
        header: t.name,
        sortKey: 'fullName',
        cell: (u) => (
          <div className="flex min-w-0 flex-col">
            <span className="font-medium">{u.fullName}</span>
            <span className="truncate text-xs text-muted" dir="ltr">
              {u.email}
            </span>
          </div>
        ),
        print: (u) => `${u.fullName} — ${u.email}`,
      },
      { id: 'phone', header: t.phone, cell: (u) => <span className="ltr-nums" dir="ltr">{u.phone ?? '—'}</span> },
      {
        id: 'role',
        header: t.role,
        cell: (u) => (
          <Badge tone={u.role.scope === 'ALL' ? 'ink' : u.role.code === 'BRANCH_MANAGER' ? 'primary' : u.role.scope === 'ASSIGNED' ? 'info' : 'neutral'}>
            {roleName(u.role)}
          </Badge>
        ),
        print: (u) => roleName(u.role),
      },
      { id: 'branch', header: t.branch, cell: (u) => u.branch?.name ?? <span className="text-muted">{t.allBranches}</span>, print: (u) => u.branch?.name ?? t.allBranches },
      {
        id: 'lastLogin',
        header: t.lastLogin,
        sortKey: 'lastLoginAt',
        cell: (u) =>
          u.lastLoginAt ? (
            <span className="num text-[14px]" title={f.date(u.lastLoginAt, 'dateTime')}>
              {f.date(u.lastLoginAt, 'dateTime')}
            </span>
          ) : (
            <span className="text-xs text-subtle">{t.never}</span>
          ),
        print: (u) => (u.lastLoginAt ? f.date(u.lastLoginAt, 'dateTime') : '—'),
      },
      {
        id: 'status',
        header: t.status,
        cell: (u) => {
          const locked = !!u.lockedUntil && new Date(u.lockedUntil).getTime() > Date.now();
          return (
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone={u.isActive ? 'success' : 'neutral'} dot>
                {u.isActive ? t.active : t.inactive}
              </Badge>
              {locked && (
                <Badge tone="danger" title={t.lockedHint.replace('{time}', f.date(u.lockedUntil, 'dateTime'))}>
                  <Lock className="size-3" aria-hidden /> {t.locked}
                </Badge>
              )}
              {u.mustChangePassword && <Badge tone="warning">{t.mustChange}</Badge>}
            </div>
          );
        },
        print: (u) => (u.isActive ? t.active : t.inactive),
      },
      ...(canManage
        ? [
            {
              id: 'actions',
              header: c.actions,
              screenOnly: true,
              align: 'end' as const,
              cell: (u: StaffUser) =>
                canManageRow(u) ? (
                  <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button size="icon-sm" variant="ghost" aria-label={`${c.edit} ${u.fullName}`} title={c.edit} onClick={() => setEditing(u)}>
                      <Pencil />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon-sm" variant="ghost" aria-label={fill(t.rowActions, u.fullName)}>
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onSelect={() => setResetting(u)}>
                          <KeyRound /> {t.resetPassword}
                        </DropdownMenuItem>
                        {canTransfer && u.role.scope !== 'ALL' && (
                          <DropdownMenuItem onSelect={() => setMoving(u)}>
                            <ArrowLeftRight /> {t.transfer}
                          </DropdownMenuItem>
                        )}
                        {u.id !== me?.id && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant={u.isActive ? 'danger' : 'default'} onSelect={() => setToggling(u)}>
                              <Power /> {u.isActive ? t.deactivate : t.activate}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : null,
            },
          ]
        : []),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, c, f, locale, canManage, canTransfer, isAdmin, me?.id],
  );

  // a branch manager never sees the Admin in their list, so the Admin role is not a useful filter for them
  const roleOptions = (roles.data ?? []).filter((r) => isAdmin || r.scope !== 'ALL').map((r) => ({ value: r.code, label: roleName(r) }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={isAdmin ? t.description : t.descriptionBranch}
        actions={
          canManage && (
            <Button onClick={() => setEditing('new')}>
              <Plus /> {t.add}
            </Button>
          )
        }
      />
      <ResourceTable<StaffUser>
        endpoint="/users"
        columns={columns}
        exportTitle={t.title}
        searchPlaceholder={t.search}
        filterKeys={['branchId', 'roleCode', 'isActive']}
        defaultSort={{ key: 'createdAt', order: 'desc' }}
        filters={(fl, set) => (
          <>
            {isAdmin && (
              <FilterSelect
                label={t.branch}
                value={fl.branchId}
                onChange={(v) => set({ branchId: v })}
                options={(lookups.data?.branches ?? []).map((b) => ({ value: b.id, label: b.name }))}
              />
            )}
            {roleOptions.length > 0 && <FilterSelect label={t.role} value={fl.roleCode} onChange={(v) => set({ roleCode: v })} options={roleOptions} />}
            <FilterSelect
              label={t.status}
              value={fl.isActive}
              onChange={(v) => set({ isActive: v })}
              options={[
                { value: 'true', label: t.active },
                { value: 'false', label: t.inactive },
              ]}
            />
          </>
        )}
        onRowClick={canManage ? (u) => canManageRow(u) && setEditing(u) : undefined}
        getRowId={(u) => u.id}
        empty={{ title: t.empty, description: t.emptyBody }}
        minWidth={980}
      />

      {editing && (
        <EmployeeDialog
          employee={editing === 'new' ? null : editing}
          roles={roles.data ?? []}
          rolesError={roles.isError}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={!!toggling}
        onOpenChange={(o) => !o && setToggling(null)}
        title={toggling ? fill(toggling.isActive ? t.deactivateTitle : t.activateTitle, toggling.fullName) : ''}
        description={toggling?.isActive ? t.deactivateBody : t.activateBody}
        destructive={toggling?.isActive}
        confirmLabel={toggling?.isActive ? t.deactivate : t.activate}
        onConfirm={async () => {
          if (!toggling) return;
          await run(() => api.patch(`/users/${toggling.id}/active`, { isActive: !toggling.isActive }), toggling.isActive ? t.deactivated : t.activated);
          await invalidate('/users', '/branches');
        }}
      />

      <ConfirmDialog
        open={!!resetting}
        onOpenChange={(o) => !o && setResetting(null)}
        title={resetting ? fill(t.resetTitle, resetting.fullName) : ''}
        description={t.resetBody}
        confirmLabel={t.reset}
        onConfirm={async () => {
          if (!resetting) return;
          const target = resetting;
          let password = '';
          await run(async () => {
            const res = await api.post<{ temporaryPassword: string }>(`/users/${target.id}/reset-password`);
            password = res.temporaryPassword;
          }, t.resetDone);
          setTemp({ name: target.fullName, password });
          await invalidate('/users');
        }}
      />

      <Dialog open={!!temp} onOpenChange={(o) => !o && setTemp(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.tempTitle}</DialogTitle>
            <DialogDescription>{temp ? fill(t.tempBody, temp.name) : ''}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-[14px] border border-border bg-surface p-3">
            <code dir="ltr" className="flex-1 font-mono text-lg tracking-wider select-all">
              {temp?.password}
            </code>
            {temp && <CopyButton value={temp.password} />}
          </div>
          <DialogFooter>
            <Button onClick={() => setTemp(null)}>{c.close}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {moving && <TransferDialog employee={moving} onClose={() => setMoving(null)} />}
    </div>
  );
}

function EmployeeDialog({ employee, roles, rolesError, onClose }: { employee: StaffUser | null; roles: Role[]; rolesError: boolean; onClose: () => void }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const { locale } = useLocale();
  const { isAdmin } = useAuth();
  const lookups = useLookups();
  const invalidate = useInvalidate();
  const isNew = !employee;

  // Branch managers may only grant employee and guide roles; an edit cannot cross the Admin / branch line.
  const roleChoices = roles.filter(
    (r) => (isAdmin || BRANCH_GRANTABLE.includes(r.code)) && (isNew || (r.scope === 'ALL') === (employee.role.scope === 'ALL')),
  );

  const schema = useMemo(
    () =>
      z
        .object({
          fullName: z.string().trim().min(3, { error: t.nameShort }),
          email: z.string().trim().email({ error: t.invalidEmail }),
          phone: z.string().trim().optional(),
          roleId: z.string().min(1, { error: t.required }),
          branchId: z.string().optional(),
          password: z.string().optional(),
          languages: z.string().trim().optional(),
          licenseNo: z.string().trim().optional(),
          bio: z.string().trim().optional(),
        })
        .superRefine((v, ctx) => {
          if (isNew && !PASSWORD_RULE.test(v.password ?? '')) ctx.addIssue({ code: 'custom', path: ['password'], message: t.passwordRule });
          const role = roles.find((r) => r.id === v.roleId);
          if (isNew && isAdmin && role && role.scope !== 'ALL' && !v.branchId) ctx.addIssue({ code: 'custom', path: ['branchId'], message: t.required });
        }),
    [t, isNew, isAdmin, roles],
  );
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: employee?.fullName ?? '',
      email: employee?.email ?? '',
      phone: employee?.phone ?? '',
      roleId: employee?.role.id ?? '',
      branchId: employee?.branch?.id ?? '',
      password: '',
      languages: employee?.guideProfile?.languages ?? '',
      licenseNo: employee?.guideProfile?.licenseNo ?? '',
      bio: employee?.guideProfile?.bio ?? '',
    },
  });

  const roleId = useWatch({ control: form.control, name: 'roleId' });
  const role = roles.find((r) => r.id === roleId);
  const isGuide = role?.code === 'TOUR_GUIDE';

  const save = useApiMutation(
    (v: Values) => {
      const guideProfile = isGuide ? { languages: v.languages || undefined, licenseNo: v.licenseNo || undefined, bio: v.bio || undefined } : undefined;
      const base = { fullName: v.fullName, email: v.email, phone: v.phone || undefined, roleId: v.roleId, guideProfile };
      if (employee) return api.patch(`/users/${employee.id}`, base);
      return api.post('/users', {
        ...base,
        password: v.password,
        branchId: isAdmin && role?.scope !== 'ALL' ? v.branchId || undefined : undefined,
      });
    },
    {
      success: t.saved,
      onSuccess: async () => {
        await invalidate('/users', '/branches', '/roles');
        onClose();
      },
    },
  );

  const errors = form.formState.errors;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{employee ? t.editTitle : t.newTitle}</DialogTitle>
          <DialogDescription>{employee ? t.editHint : t.formHint}</DialogDescription>
        </DialogHeader>
        <form id="employee-form" onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid gap-4 sm:grid-cols-2" noValidate>
          <FormField label={t.name} error={errors.fullName?.message} required>
            <Input {...form.register('fullName')} autoFocus />
          </FormField>
          <FormField label={t.email} error={errors.email?.message} required>
            <Input dir="ltr" type="email" autoComplete="off" {...form.register('email')} />
          </FormField>
          <FormField label={t.phone}>
            <Input dir="ltr" inputMode="tel" {...form.register('phone')} />
          </FormField>
          <FormField label={t.role} error={errors.roleId?.message ?? (rolesError ? t.rolesError : undefined)} required>
            <Controller
              control={form.control}
              name="roleId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleChoices.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {locale === 'en' ? r.nameEn : r.nameAr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          {isNew && (
            <FormField
              label={t.branch}
              error={errors.branchId?.message}
              required={isAdmin && role?.scope !== 'ALL'}
              hint={!isAdmin ? t.branchOwn : role?.scope === 'ALL' ? t.branchNone : undefined}
            >
              <Controller
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!isAdmin || role?.scope === 'ALL'}>
                    <SelectTrigger>
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
                )}
              />
            </FormField>
          )}
          {isNew && (
            <FormField label={t.password} hint={t.passwordHint} error={errors.password?.message} required>
              <Input dir="ltr" type="text" autoComplete="new-password" {...form.register('password')} />
            </FormField>
          )}
          {isGuide && (
            <fieldset className="grid gap-4 rounded-[16px] border border-border p-4 sm:col-span-2 sm:grid-cols-2">
              <legend className="px-1 text-sm font-medium">{t.guideSection}</legend>
              <FormField label={t.languages} hint={t.languagesHint}>
                <Input {...form.register('languages')} />
              </FormField>
              <FormField label={t.licenseNo}>
                <Input dir="ltr" {...form.register('licenseNo')} />
              </FormField>
              <FormField label={t.bio} className="sm:col-span-2">
                <Textarea rows={3} {...form.register('bio')} />
              </FormField>
            </fieldset>
          )}
        </form>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {c.cancel}
          </Button>
          <Button type="submit" form="employee-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />} {c.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransferDialog({ employee, onClose }: { employee: StaffUser; onClose: () => void }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const lookups = useLookups();
  const invalidate = useInvalidate();
  const [branchId, setBranchId] = useState('');

  const move = useApiMutation((id: string) => api.patch(`/users/${employee.id}/branch`, { branchId: id }), {
    success: t.transferred,
    onSuccess: async () => {
      await invalidate('/users', '/branches');
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{fill(t.transferTitle, employee.fullName)}</DialogTitle>
          <DialogDescription>{t.transferBody}</DialogDescription>
        </DialogHeader>
        <FormField label={t.newBranch} required>
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {(lookups.data?.branches ?? []).map((b) => (
                <SelectItem key={b.id} value={b.id} disabled={b.id === employee.branch?.id}>
                  {b.name}
                  {b.id === employee.branch?.id ? ` (${t.current})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {c.cancel}
          </Button>
          <Button disabled={!branchId || move.isPending} onClick={() => move.mutate(branchId)}>
            {move.isPending && <Loader2 className="animate-spin" />} {t.transfer}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
