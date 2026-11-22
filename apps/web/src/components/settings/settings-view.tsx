'use client';

import type { Permission } from '@travelos/shared';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Forbidden, ListSkeleton, Ltr, QueryError } from '@/components/bookings/kit';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/card';
import { fieldBase } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { defineMessages, useLocale, useMessages } from '@/lib/i18n';
import {
  useBanners,
  useBannerTrips,
  useBranches,
  useCreateEmployee,
  useDeleteBanner,
  useEmployees,
  useOffice,
  usePermissionCatalogue,
  useRoles,
  useSaveBanner,
  useSaveBranch,
  useSaveRole,
  useUpdateEmployee,
  useUpdateOffice,
} from '@/lib/queries/settings';
import type { Office, Role } from '@/lib/types/settings';
import { useFormat } from '@/lib/use-format';

const m = defineMessages({
  ar: {
    eyebrow: 'الإعدادات',
    title: 'إعدادات المكتب',
    description: 'بيانات المكتب وصفحته العامة، الفروع، الموظفون، الأدوار والصلاحيات، والإعلانات.',
    office: 'المكتب',
    branches: 'الفروع',
    employees: 'الموظفون',
    roles: 'الأدوار',
    ads: 'الإعلانات',
    name: 'اسم المكتب',
    descriptionF: 'نبذة عن المكتب',
    phone: 'الهاتف',
    whatsapp: 'رقم واتساب (زر "احجز الآن")',
    email: 'البريد الإلكتروني',
    city: 'المدينة',
    address: 'العنوان',
    lat: 'خط العرض',
    lng: 'خط الطول',
    location: 'موقع المكتب على الخريطة',
    publicPage: 'تفعيل الصفحة العامة والظهور في واجهة سفرني',
    viewPublic: 'عرض الصفحة العامة',
    bookingTerms: 'شروط الحجز',
    cancellationTerms: 'شروط الإلغاء',
    save: 'حفظ',
    saved: 'تم الحفظ',
    add: 'إضافة',
    main: 'رئيسي',
    active: 'فعّال',
    inactive: 'معطّل',
    activate: 'تفعيل',
    deactivate: 'تعطيل',
    branchName: 'اسم الفرع',
    fullName: 'الاسم الكامل',
    password: 'كلمة المرور (8 أحرف وفيها رقم)',
    branch: 'الفرع',
    role: 'الدور',
    lastLogin: 'آخر دخول',
    never: 'لم يدخل بعد',
    sessionsNote: 'تغيير الفرع أو الدور أو التعطيل ينهي جلسات الموظف فوراً.',
    scopeOffice: 'كل الفروع',
    scopeBranch: 'فرعه فقط',
    system: 'افتراضي',
    members: '{n} موظف',
    savePerms: 'حفظ الصلاحيات',
    newRole: 'دور جديد',
    roleName: 'اسم الدور',
    scopeNote: 'دور "فرعه فقط" لا يمكن أن يملك صلاحيات إدارة المكتب.',
    adTitle: 'عنوان الإعلان',
    adSubtitle: 'نص فرعي',
    adTrip: 'الرحلة المرتبطة (اختياري)',
    starts: 'يبدأ',
    ends: 'ينتهي',
    noTrip: 'بدون رحلة',
    adsNote: 'تظهر الإعلانات الفعّالة في الشريط المتحرك أعلى واجهة سفرني وصفحة المكتب.',
  },
  en: {
    eyebrow: 'Settings',
    title: 'Office settings',
    description: 'Office profile and public page, branches, employees, roles & permissions, and ads.',
    office: 'Office',
    branches: 'Branches',
    employees: 'Employees',
    roles: 'Roles',
    ads: 'Ads',
    name: 'Office name',
    descriptionF: 'About the office',
    phone: 'Phone',
    whatsapp: 'WhatsApp number ("Book now" button)',
    email: 'Email',
    city: 'City',
    address: 'Address',
    lat: 'Latitude',
    lng: 'Longitude',
    location: 'Office location on the map',
    publicPage: 'Enable the public page and appear on the Safarni showcase',
    viewPublic: 'View public page',
    bookingTerms: 'Booking terms',
    cancellationTerms: 'Cancellation terms',
    save: 'Save',
    saved: 'Saved',
    add: 'Add',
    main: 'Main',
    active: 'Active',
    inactive: 'Inactive',
    activate: 'Activate',
    deactivate: 'Deactivate',
    branchName: 'Branch name',
    fullName: 'Full name',
    password: 'Password (8+ chars incl. a digit)',
    branch: 'Branch',
    role: 'Role',
    lastLogin: 'Last login',
    never: 'Never',
    sessionsNote: 'Changing branch or role, or deactivating, ends the employee’s sessions immediately.',
    scopeOffice: 'All branches',
    scopeBranch: 'Own branch',
    system: 'Default',
    members: '{n} employees',
    savePerms: 'Save permissions',
    newRole: 'New role',
    roleName: 'Role name',
    scopeNote: 'A "own branch" role cannot hold office-administration permissions.',
    adTitle: 'Ad title',
    adSubtitle: 'Subtitle',
    adTrip: 'Linked trip (optional)',
    starts: 'Starts',
    ends: 'Ends',
    noTrip: 'No trip',
    adsNote: 'Active ads appear in the moving strip on the Safarni showcase and the office page.',
  },
});

type Tab = 'office' | 'branches' | 'employees' | 'roles' | 'ads';
const ok = (msg: string) => toast.success(msg);
const fail = (e: unknown) => toast.error(errorMessage(e));

export function SettingsView() {
  const t = useMessages(m);
  const { can } = useAuth();
  const tabs = (
    [
      ['office', t.office, can('office.manage')],
      ['branches', t.branches, can('branches.manage')],
      ['employees', t.employees, can('employees.manage')],
      ['roles', t.roles, can('roles.manage')],
      ['ads', t.ads, can('offers.manage')],
    ] as const
  ).filter(([, , allowed]) => allowed);
  const [tab, setTab] = useState<Tab>(tabs[0]?.[0] ?? 'office');
  if (!tabs.length) return <Forbidden />;

  return (
    <div className="grid gap-6">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <SegmentedControl aria-label={t.title} value={tab} onValueChange={(v) => setTab(v as Tab)} options={tabs.map(([value, label]) => ({ value, label }))} />
      {tab === 'office' && <OfficeTab />}
      {tab === 'branches' && <BranchesTab />}
      {tab === 'employees' && <EmployeesTab />}
      {tab === 'roles' && <RolesTab />}
      {tab === 'ads' && <AdsTab />}
    </div>
  );
}

// ------------------------------------------------------------------ office

function OfficeTab() {
  const q = useOffice();
  if (q.isPending) return <ListSkeleton rows={6} />;
  if (q.isError) return <QueryError error={q.error} onRetry={() => void q.refetch()} />;
  return <OfficeForm office={q.data} />;
}

function OfficeForm({ office }: { office: Office }) {
  const t = useMessages(m);
  const save = useUpdateOffice();
  const [v, setV] = useState({
    name: office.name,
    description: office.description ?? '',
    phone: office.phone ?? '',
    whatsappNumber: office.whatsappNumber ?? '',
    email: office.email ?? '',
    city: office.city ?? '',
    address: office.address ?? '',
    latitude: office.latitude ?? '',
    longitude: office.longitude ?? '',
    publicPageEnabled: office.publicPageEnabled,
    bookingTerms: office.bookingTerms ?? '',
    cancellationTerms: office.cancellationTerms ?? '',
  });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((s) => ({ ...s, [k]: e.target.value }));
  const lat = Number(v.latitude);
  const lng = Number(v.longitude);
  const hasMap = v.latitude !== '' && v.longitude !== '' && Number.isFinite(lat) && Number.isFinite(lng);

  const submit = () =>
    save.mutate(
      {
        name: v.name,
        description: v.description || undefined,
        phone: v.phone || undefined,
        whatsappNumber: v.whatsappNumber || undefined,
        email: v.email || undefined,
        city: v.city || undefined,
        address: v.address || undefined,
        latitude: hasMap ? lat : undefined,
        longitude: hasMap ? lng : undefined,
        publicPageEnabled: v.publicPageEnabled,
        bookingTerms: v.bookingTerms || undefined,
        cancellationTerms: v.cancellationTerms || undefined,
      },
      { onSuccess: () => ok(t.saved), onError: fail },
    );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <GlassPanel className="grid gap-4 p-5 sm:grid-cols-2">
        <F label={t.name}><input className={fieldBase} value={v.name} onChange={set('name')} /></F>
        <F label={t.city}><input className={fieldBase} value={v.city} onChange={set('city')} /></F>
        <F label={t.phone}><input dir="ltr" className={fieldBase} value={v.phone} onChange={set('phone')} /></F>
        <F label={t.whatsapp}><input dir="ltr" className={fieldBase} value={v.whatsappNumber} onChange={set('whatsappNumber')} /></F>
        <F label={t.email}><input dir="ltr" className={fieldBase} value={v.email} onChange={set('email')} /></F>
        <F label={t.address}><input className={fieldBase} value={v.address} onChange={set('address')} /></F>
        <F label={t.descriptionF} wide><textarea className={`${fieldBase} min-h-20 py-2`} value={v.description} onChange={set('description')} /></F>
        <F label={t.bookingTerms} wide><textarea className={`${fieldBase} min-h-20 py-2`} value={v.bookingTerms} onChange={set('bookingTerms')} /></F>
        <F label={t.cancellationTerms} wide><textarea className={`${fieldBase} min-h-20 py-2`} value={v.cancellationTerms} onChange={set('cancellationTerms')} /></F>
        <label className="flex items-center gap-3 text-sm sm:col-span-2">
          <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={v.publicPageEnabled} onChange={(e) => setV((s) => ({ ...s, publicPageEnabled: e.target.checked }))} />
          {t.publicPage}
        </label>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button onClick={submit} loading={save.isPending}>{t.save}</Button>
          {office.publicPageEnabled && (
            <Button asChild variant="secondary">
              <a href={`/${office.slug}`} target="_blank" rel="noreferrer"><ExternalLink /> {t.viewPublic}</a>
            </Button>
          )}
        </div>
      </GlassPanel>
      <GlassPanel className="grid content-start gap-4 p-5">
        <p className="text-sm font-medium">{t.location}</p>
        <div className="grid grid-cols-2 gap-3">
          <F label={t.lat}><input dir="ltr" className={fieldBase} value={v.latitude} onChange={set('latitude')} /></F>
          <F label={t.lng}><input dir="ltr" className={fieldBase} value={v.longitude} onChange={set('longitude')} /></F>
        </div>
        {hasMap && (
          <iframe
            title={t.location}
            className="h-64 w-full rounded-tile border border-border"
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`}
          />
        )}
      </GlassPanel>
    </div>
  );
}

// ------------------------------------------------------------------ branches

function BranchesTab() {
  const t = useMessages(m);
  const q = useBranches();
  const save = useSaveBranch();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  if (q.isPending) return <ListSkeleton rows={4} />;
  if (q.isError) return <QueryError error={q.error} onRetry={() => void q.refetch()} />;
  return (
    <GlassPanel className="grid gap-4 p-5">
      <div className="flex flex-wrap items-end gap-3">
        <F label={t.branchName}><input className={fieldBase} value={name} onChange={(e) => setName(e.target.value)} /></F>
        <F label={t.city}><input className={fieldBase} value={city} onChange={(e) => setCity(e.target.value)} /></F>
        <Button
          disabled={name.trim().length < 2}
          loading={save.isPending}
          onClick={() => save.mutate({ input: { name: name.trim(), city: city.trim() || undefined } }, { onSuccess: () => { ok(t.saved); setName(''); setCity(''); }, onError: fail })}
        >
          <Plus /> {t.add}
        </Button>
      </div>
      <ul className="divide-y divide-border/70">
        {q.data.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center gap-3 py-3">
            <span className="font-medium">{b.name}</span>
            {b.isMain && <Badge size="sm" tone="primary">{t.main}</Badge>}
            <span className="text-sm text-muted">{b.city ?? ''}</span>
            <Badge size="sm" tone={b.isActive ? 'success' : 'neutral'}>{b.isActive ? t.active : t.inactive}</Badge>
            <span className="ms-auto" />
            {!b.isMain && (
              <Button size="sm" variant="secondary" onClick={() => save.mutate({ id: b.id, input: { isActive: !b.isActive } }, { onSuccess: () => ok(t.saved), onError: fail })}>
                {b.isActive ? t.deactivate : t.activate}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </GlassPanel>
  );
}

// ------------------------------------------------------------------ employees

function EmployeesTab() {
  const t = useMessages(m);
  const f = useFormat();
  const q = useEmployees('');
  const branches = useBranches();
  const roles = useRoles();
  const create = useCreateEmployee();
  const update = useUpdateEmployee();
  const empty = { fullName: '', email: '', password: '', branchId: '', roleId: '' };
  const [v, setV] = useState(empty);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((s) => ({ ...s, [k]: e.target.value }));

  if (q.isPending) return <ListSkeleton rows={4} />;
  if (q.isError) return <QueryError error={q.error} onRetry={() => void q.refetch()} />;
  return (
    <GlassPanel className="grid gap-4 p-5">
      <p className="text-xs text-muted">{t.sessionsNote}</p>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:items-end">
        <F label={t.fullName}><input className={fieldBase} value={v.fullName} onChange={set('fullName')} /></F>
        <F label={t.email}><input dir="ltr" className={fieldBase} value={v.email} onChange={set('email')} /></F>
        <F label={t.password}><input dir="ltr" type="password" className={fieldBase} value={v.password} onChange={set('password')} /></F>
        <F label={t.branch}>
          <select className={fieldBase} value={v.branchId} onChange={set('branchId')}>
            <option value="">—</option>
            {branches.data?.filter((b) => b.isActive).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </F>
        <F label={t.role}>
          <select className={fieldBase} value={v.roleId} onChange={set('roleId')}>
            <option value="">—</option>
            {roles.data?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </F>
        <Button
          disabled={!v.fullName || !v.email || !v.password || !v.branchId || !v.roleId}
          loading={create.isPending}
          onClick={() => create.mutate(v, { onSuccess: () => { ok(t.saved); setV(empty); }, onError: fail })}
        >
          <Plus /> {t.add}
        </Button>
      </div>
      <ul className="divide-y divide-border/70">
        {q.data.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0">
              <p className="font-medium">{e.user.fullName}</p>
              <Ltr className="text-xs text-muted">{e.user.email}</Ltr>
            </div>
            <Badge size="sm" tone="primary">{e.role.name} · {e.role.scope === 'OFFICE' ? t.scopeOffice : t.scopeBranch}</Badge>
            <span className="text-sm text-muted">{e.branch.name}</span>
            <span className="text-xs text-subtle">{t.lastLogin}: {e.user.lastLoginAt ? f.relative(e.user.lastLoginAt) : t.never}</span>
            <span className="ms-auto" />
            <Badge size="sm" tone={e.isActive ? 'success' : 'neutral'}>{e.isActive ? t.active : t.inactive}</Badge>
            <Button size="sm" variant="secondary" onClick={() => update.mutate({ id: e.id, input: { isActive: !e.isActive } }, { onSuccess: () => ok(t.saved), onError: fail })}>
              {e.isActive ? t.deactivate : t.activate}
            </Button>
          </li>
        ))}
      </ul>
    </GlassPanel>
  );
}

// ------------------------------------------------------------------ roles & permissions

function RolesTab() {
  const t = useMessages(m);
  const roles = useRoles();
  const catalogue = usePermissionCatalogue();
  const save = useSaveRole();
  const [name, setName] = useState('');
  const [scope, setScope] = useState<'OFFICE' | 'BRANCH'>('BRANCH');
  if (roles.isPending || catalogue.isPending) return <ListSkeleton rows={4} />;
  if (roles.isError) return <QueryError error={roles.error} onRetry={() => void roles.refetch()} />;
  if (catalogue.isError) return <QueryError error={catalogue.error} onRetry={() => void catalogue.refetch()} />;
  return (
    <div className="grid gap-4">
      <GlassPanel className="flex flex-wrap items-end gap-3 p-5">
        <F label={t.roleName}><input className={fieldBase} value={name} onChange={(e) => setName(e.target.value)} /></F>
        <F label={t.scopeOffice + ' / ' + t.scopeBranch}>
          <select className={fieldBase} value={scope} onChange={(e) => setScope(e.target.value as 'OFFICE' | 'BRANCH')}>
            <option value="BRANCH">{t.scopeBranch}</option>
            <option value="OFFICE">{t.scopeOffice}</option>
          </select>
        </F>
        <Button disabled={name.trim().length < 2} loading={save.isPending} onClick={() => save.mutate({ input: { name: name.trim(), scope, permissions: ['trips.view'] } }, { onSuccess: () => { ok(t.saved); setName(''); }, onError: fail })}>
          <Plus /> {t.newRole}
        </Button>
        <p className="w-full text-xs text-muted">{t.scopeNote}</p>
      </GlassPanel>
      {roles.data.map((r) => <RoleCard key={r.id + r.permissions.join()} role={r} catalogue={catalogue.data} />)}
    </div>
  );
}

function RoleCard({ role, catalogue }: { role: Role; catalogue: Array<{ key: Permission; group: string; ar: string; en: string }> }) {
  const t = useMessages(m);
  const { locale } = useLocale();
  const save = useSaveRole();
  const [perms, setPerms] = useState<Set<Permission>>(new Set(role.permissions));
  const groups = useMemo(() => [...new Set(catalogue.map((p) => p.group))], [catalogue]);
  const dirty = perms.size !== role.permissions.length || role.permissions.some((p) => !perms.has(p));
  return (
    <GlassPanel className="grid gap-4 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold">{role.name}</h3>
        {role.isSystem && <Badge size="sm" tone="neutral">{t.system}</Badge>}
        <Badge size="sm" tone="primary">{role.scope === 'OFFICE' ? t.scopeOffice : t.scopeBranch}</Badge>
        <span className="text-xs text-muted">{t.members.replace('{n}', String(role.members))}</span>
        <span className="ms-auto" />
        <Button size="sm" disabled={!dirty} loading={save.isPending} onClick={() => save.mutate({ id: role.id, input: { permissions: [...perms] } }, { onSuccess: () => ok(t.saved), onError: fail })}>
          {t.savePerms}
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map((g) => (
          <fieldset key={g} className="grid gap-1.5">
            <legend className="mb-1 text-xs font-semibold text-muted">{g}</legend>
            {catalogue.filter((p) => p.group === g).map((p) => (
              <label key={p.key} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-[var(--primary)]"
                  checked={perms.has(p.key)}
                  onChange={(e) => setPerms((s) => { const n = new Set(s); if (e.target.checked) n.add(p.key); else n.delete(p.key); return n; })}
                />
                <span>{p[locale]}</span>
              </label>
            ))}
          </fieldset>
        ))}
      </div>
    </GlassPanel>
  );
}

// ------------------------------------------------------------------ ads

function AdsTab() {
  const t = useMessages(m);
  const f = useFormat();
  const q = useBanners();
  const trips = useBannerTrips('');
  const save = useSaveBanner();
  const del = useDeleteBanner();
  const [empty] = useState(() => ({
    title: '',
    subtitle: '',
    tripId: '',
    startsAt: new Date().toISOString().slice(0, 10),
    endsAt: new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10),
  }));
  const [v, setV] = useState(empty);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((s) => ({ ...s, [k]: e.target.value }));
  if (q.isPending) return <ListSkeleton rows={4} />;
  if (q.isError) return <QueryError error={q.error} onRetry={() => void q.refetch()} />;
  return (
    <GlassPanel className="grid gap-4 p-5">
      <p className="text-xs text-muted">{t.adsNote}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
        <F label={t.adTitle}><input className={fieldBase} value={v.title} onChange={set('title')} /></F>
        <F label={t.adSubtitle}><input className={fieldBase} value={v.subtitle} onChange={set('subtitle')} /></F>
        <F label={t.adTrip}>
          <select className={fieldBase} value={v.tripId} onChange={set('tripId')}>
            <option value="">{t.noTrip}</option>
            {trips.data?.data.map((tr) => <option key={tr.id} value={tr.id}>{`${tr.code} · ${tr.tour.name}`}</option>)}
          </select>
        </F>
        <F label={t.starts}><input type="date" className={fieldBase} value={v.startsAt} onChange={set('startsAt')} /></F>
        <F label={t.ends}><input type="date" className={fieldBase} value={v.endsAt} onChange={set('endsAt')} /></F>
        <Button
          disabled={!v.title.trim()}
          loading={save.isPending}
          onClick={() => save.mutate({ input: { title: v.title.trim(), subtitle: v.subtitle || undefined, tripId: v.tripId || undefined, startsAt: v.startsAt, endsAt: v.endsAt } }, { onSuccess: () => { ok(t.saved); setV(empty); }, onError: fail })}
        >
          <Plus /> {t.add}
        </Button>
      </div>
      <ul className="divide-y divide-border/70">
        {q.data.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0">
              <p className="font-medium">{b.title}</p>
              {b.subtitle && <p className="text-xs text-muted">{b.subtitle}</p>}
            </div>
            {b.trip && <Ltr className="text-xs text-muted">{b.trip.code}</Ltr>}
            <span className="text-xs text-muted">{f.date(b.startsAt)} → {f.date(b.endsAt)}</span>
            <span className="ms-auto" />
            <Badge size="sm" tone={b.isActive ? 'success' : 'neutral'}>{b.isActive ? t.active : t.inactive}</Badge>
            <Button size="sm" variant="secondary" onClick={() => save.mutate({ id: b.id, input: { isActive: !b.isActive } }, { onSuccess: () => ok(t.saved), onError: fail })}>
              {b.isActive ? t.deactivate : t.activate}
            </Button>
            <Button size="icon-sm" variant="ghost" aria-label="delete" onClick={() => del.mutate(b.id, { onSuccess: () => ok(t.saved), onError: fail })}>
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
    </GlassPanel>
  );
}

function F({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`grid gap-1.5 text-sm ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

