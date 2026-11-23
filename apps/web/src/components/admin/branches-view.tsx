'use client';

/*
 * REFERENCE PAGE: every list/CRUD page follows this structure.
 *  - PageHeader with the action button (shown only when the role can use it; the API enforces too)
 *  - ResourceTable: endpoint + columns + URL filters; Excel/PDF export comes for free (RPT-01)
 *  - a dialog form (react-hook-form + zod) that POSTs / PATCHes and invalidates the list
 *  - ConfirmDialog before sensitive actions (activate / deactivate)
 *  - all text through defineMessages (Arabic first, English second)
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, MapPin, Pencil, Plus, Power } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { ConfirmDialog } from '@/components/data/confirm-dialog';
import { FilterSelect, ResourceTable, type ResourceColumn } from '@/components/data/resource-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useCan } from '@/lib/auth';
import { useApiMutation, useInvalidate, useLookups, useName } from '@/lib/hooks';
import { defineMessages, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import type { Branch } from '@/lib/types/api';

const m = defineMessages({
  ar: {
    eyebrow: 'الإدارة',
    title: 'الفروع',
    description: 'فروع المكتب. يتبع كل موظف ومدير فرع ودليل فرعاً واحداً، أما مدير المكتب فيرى كل الفروع.',
    add: 'فرع جديد',
    name: 'اسم الفرع',
    city: 'المدينة',
    address: 'العنوان',
    phone: 'الهاتف',
    whatsapp: 'رقم واتساب',
    whatsappHint: 'بالصيغة الدولية بدون + (مثال 963944123456). يُستخدم لزر «احجز الآن».',
    hours: 'ساعات العمل',
    staff: 'الموظفون',
    landing: 'في الصفحة العامة',
    shown: 'ظاهر',
    hidden: 'مخفي',
    active: 'فعّال',
    inactive: 'معطّل',
    lat: 'خط العرض',
    lng: 'خط الطول',
    editTitle: 'تعديل الفرع',
    newTitle: 'فرع جديد',
    formHint: 'الفروع لا تُحذف؛ يمكن تعطيلها مع الاحتفاظ بسجلها.',
    deactivate: 'تعطيل',
    activate: 'تفعيل',
    deactivateTitle: 'تعطيل الفرع؟',
    deactivateBody: 'لن يستطيع موظفو هذا الفرع تسجيل الدخول، وتبقى بياناته محفوظة. يمكن إعادة تفعيله لاحقاً.',
    activateTitle: 'تفعيل الفرع؟',
    saved: 'تم حفظ الفرع',
    status: 'الحالة',
    required: 'هذا الحقل مطلوب',
    empty: 'لا توجد فروع بعد',
    emptyBody: 'أضف أول فرع، ثم أضف الموظفين إليه.',
    search: 'ابحث بالاسم أو العنوان أو الهاتف…',
  },
  en: {
    eyebrow: 'Administration',
    title: 'Branches',
    description: 'Office branches. Every employee, branch manager and guide belongs to one branch; the office admin sees them all.',
    add: 'New branch',
    name: 'Branch name',
    city: 'City',
    address: 'Address',
    phone: 'Phone',
    whatsapp: 'WhatsApp number',
    whatsappHint: 'International format without + (e.g. 963944123456). Used by the “Book now” button.',
    hours: 'Working hours',
    staff: 'Staff',
    landing: 'On the public page',
    shown: 'Shown',
    hidden: 'Hidden',
    active: 'Active',
    inactive: 'Inactive',
    lat: 'Latitude',
    lng: 'Longitude',
    editTitle: 'Edit branch',
    newTitle: 'New branch',
    formHint: 'Branches are never deleted; deactivate them to keep their history.',
    deactivate: 'Deactivate',
    activate: 'Activate',
    deactivateTitle: 'Deactivate this branch?',
    deactivateBody: 'Its staff will not be able to sign in. Its data stays. You can activate it again later.',
    activateTitle: 'Activate this branch?',
    saved: 'Branch saved',
    status: 'Status',
    required: 'This field is required',
    empty: 'No branches yet',
    emptyBody: 'Add the first branch, then add staff to it.',
    search: 'Search by name, address or phone…',
  },
});

export function BranchesView() {
  const t = useMessages(m);
  const c = useMessages(common);
  const canManage = useCan('branches.manage');
  const [editing, setEditing] = useState<Branch | 'new' | null>(null);
  const [toggling, setToggling] = useState<Branch | null>(null);
  const invalidate = useInvalidate();
  const name = useName();

  const columns = useMemo<ResourceColumn<Branch>[]>(
    () => [
      { id: 'name', header: t.name, sortKey: 'name', cell: (b) => <span className="font-medium">{b.name}</span> },
      {
        id: 'city',
        header: t.city,
        cell: (b) => (
          <span className="inline-flex items-center gap-1.5 text-muted">
            <MapPin className="size-3.5" aria-hidden />
            {name(b.city)}
          </span>
        ),
      },
      { id: 'address', header: t.address, cell: (b) => b.address ?? '—' },
      { id: 'phone', header: t.phone, cell: (b) => <span className="ltr-nums">{b.phone ?? '—'}</span> },
      { id: 'staff', header: t.staff, align: 'end', cell: (b) => <span className="num">{b._count?.users ?? 0}</span> },
      { id: 'landing', header: t.landing, cell: (b) => <Badge tone={b.showOnLanding ? 'primary' : 'neutral'}>{b.showOnLanding ? t.shown : t.hidden}</Badge> },
      { id: 'status', header: t.status, cell: (b) => <Badge tone={b.isActive ? 'success' : 'neutral'} dot>{b.isActive ? t.active : t.inactive}</Badge> },
      ...(canManage
        ? [
            {
              id: 'actions',
              header: c.actions,
              screenOnly: true,
              align: 'end' as const,
              cell: (b: Branch) => (
                <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button size="icon-sm" variant="ghost" aria-label={`${c.edit} ${b.name}`} onClick={() => setEditing(b)}>
                    <Pencil />
                  </Button>
                  <Button size="icon-sm" variant="ghost" aria-label={`${b.isActive ? t.deactivate : t.activate} ${b.name}`} onClick={() => setToggling(b)}>
                    <Power className={b.isActive ? 'text-danger' : 'text-success'} />
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
      <ResourceTable<Branch>
        endpoint="/branches"
        columns={columns}
        exportTitle={t.title}
        searchPlaceholder={t.search}
        filterKeys={['isActive']}
        defaultSort={{ key: 'name', order: 'asc' }}
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
        onRowClick={canManage ? (b) => setEditing(b) : undefined}
        getRowId={(b) => b.id}
        empty={{ title: t.empty, description: t.emptyBody }}
      />

      {editing && <BranchDialog branch={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}

      <ConfirmDialog
        open={!!toggling}
        onOpenChange={(o) => !o && setToggling(null)}
        title={toggling?.isActive ? t.deactivateTitle : t.activateTitle}
        description={toggling?.isActive ? t.deactivateBody : undefined}
        destructive={toggling?.isActive}
        confirmLabel={toggling?.isActive ? t.deactivate : t.activate}
        onConfirm={async () => {
          if (!toggling) return;
          await api.patch(`/branches/${toggling.id}/active`, { isActive: !toggling.isActive });
          await invalidate('/branches', '/lookups');
        }}
      />
    </div>
  );
}

function BranchDialog({ branch, onClose }: { branch: Branch | null; onClose: () => void }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const lookups = useLookups();
  const name = useName();
  const invalidate = useInvalidate();

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(2, { error: t.required }),
        cityId: z.string().min(1, { error: t.required }),
        address: z.string().trim().optional(),
        phone: z.string().trim().optional(),
        whatsapp: z.string().trim().regex(/^\d{8,15}$/, { error: t.whatsappHint }).or(z.literal('')).optional(),
        workingHours: z.string().trim().optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        showOnLanding: z.boolean(),
      }),
    [t],
  );
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: branch?.name ?? '',
      cityId: branch?.cityId ?? '',
      address: branch?.address ?? '',
      phone: branch?.phone ?? '',
      whatsapp: branch?.whatsapp ?? '',
      workingHours: branch?.workingHours ?? '',
      latitude: branch?.latitude ?? '',
      longitude: branch?.longitude ?? '',
      showOnLanding: branch?.showOnLanding ?? true,
    },
  });

  const save = useApiMutation(
    (v: Values) => {
      const body = {
        ...v,
        address: v.address || undefined,
        phone: v.phone || undefined,
        whatsapp: v.whatsapp || undefined,
        workingHours: v.workingHours || undefined,
        latitude: v.latitude ? Number(v.latitude) : undefined,
        longitude: v.longitude ? Number(v.longitude) : undefined,
      };
      return branch ? api.patch(`/branches/${branch.id}`, body) : api.post('/branches', body);
    },
    {
      success: t.saved,
      onSuccess: async () => {
        await invalidate('/branches', '/lookups');
        onClose();
      },
    },
  );

  const errors = form.formState.errors;
  const syrianCities = (lookups.data?.cities ?? []).filter((x) => x.kind !== 'TOURIST_SPOT');

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{branch ? t.editTitle : t.newTitle}</DialogTitle>
          <DialogDescription>{t.formHint}</DialogDescription>
        </DialogHeader>
        <form id="branch-form" onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid gap-4 sm:grid-cols-2" noValidate>
          <FormField label={t.name} error={errors.name?.message} required>
            <Input {...form.register('name')} autoFocus />
          </FormField>
          <FormField label={t.city} error={errors.cityId?.message} required>
            <Controller
              control={form.control}
              name="cityId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {syrianCities.map((city) => (
                      <SelectItem key={city.id} value={city.id}>
                        {name(city)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label={t.address} className="sm:col-span-2">
            <Input {...form.register('address')} />
          </FormField>
          <FormField label={t.phone}>
            <Input dir="ltr" {...form.register('phone')} />
          </FormField>
          <FormField label={t.whatsapp} hint={t.whatsappHint} error={errors.whatsapp?.message}>
            <Input dir="ltr" inputMode="numeric" {...form.register('whatsapp')} />
          </FormField>
          <FormField label={t.hours}>
            <Input {...form.register('workingHours')} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t.lat}>
              <Input dir="ltr" inputMode="decimal" {...form.register('latitude')} />
            </FormField>
            <FormField label={t.lng}>
              <Input dir="ltr" inputMode="decimal" {...form.register('longitude')} />
            </FormField>
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" className="size-4 accent-[var(--primary)]" {...form.register('showOnLanding')} />
            {t.landing}
          </label>
        </form>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {c.cancel}
          </Button>
          <Button type="submit" form="branch-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />} {c.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
