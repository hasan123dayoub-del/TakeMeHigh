'use client';

import { LABELS, TRANSPORT_MODES } from '@travelos/shared';
import { MapPin, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/data/confirm-dialog';
import { FilterSelect, ResourceTable, type ResourceColumn } from '@/components/data/resource-table';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { api, errorMessage } from '@/lib/api';
import { useCan } from '@/lib/auth';
import { useInvalidate, useLookups, useName, useResource } from '@/lib/hooks';
import { defineMessages, useLocale, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import type { Company, Service } from '@/lib/types/api';
import { CompanyDialog } from './company-dialog';
import { ActiveBadge, supplierMessages } from './shared';

const m = defineMessages({
  ar: {
    eyebrow: 'الموردون',
    title: 'الشركات',
    description: 'الفنادق وشركات النقل والمطاعم التي يتعامل معها المكتب، مع بنودها وأسعار كلفتها. الشركات المرتبطة بالتكامل تُحدَّث كلفها تلقائياً.',
    add: 'شركة جديدة',
    name: 'الشركة',
    service: 'الخدمة',
    mode: 'نوع النقل',
    place: 'الدولة / المدينة',
    country: 'الدولة',
    contact: 'التواصل',
    integration: 'التكامل',
    items: 'البنود',
    status: 'الحالة',
    search: 'ابحث بالاسم أو المسؤول أو الهاتف…',
    empty: 'لا توجد شركات',
    emptyBody: 'أضف أول فندق أو شركة نقل أو مطعم، ثم أضف بنودها وكلفها.',
    deactivate: 'تعطيل',
    activate: 'تفعيل',
    deactivateTitle: 'تعطيل الشركة؟',
    deactivateBody: 'تختفي الشركة وبنودها من قوائم الاختيار عند بناء الرحلات والعروض، وتحتفظ الرحلات الحالية بكلفها المحفوظة (SUP-07).',
    activateTitle: 'تفعيل الشركة؟',
    deleteTitle: 'حذف الشركة؟',
    deleteBody: 'تُحذف الشركة وكل بنودها نهائياً. لا يمكن حذف شركة استُخدمت في رحلات أو عروض أو طلبات؛ عطّلها بدلاً من ذلك.',
    activated: 'تم تفعيل الشركة',
    deactivated: 'تم تعطيل الشركة',
    deleted: 'تم حذف الشركة',
  },
  en: {
    eyebrow: 'Suppliers',
    title: 'Companies',
    description: 'Hotels, transport companies and restaurants the office works with, with their items and costs. Integrated companies get their costs updated automatically.',
    add: 'New company',
    name: 'Company',
    service: 'Service',
    mode: 'Transport mode',
    place: 'Country / city',
    country: 'Country',
    contact: 'Contact',
    integration: 'Integration',
    items: 'Items',
    status: 'Status',
    search: 'Search by name, contact or phone…',
    empty: 'No companies',
    emptyBody: 'Add the first hotel, transport company or restaurant, then its items and costs.',
    deactivate: 'Deactivate',
    activate: 'Activate',
    deactivateTitle: 'Deactivate this company?',
    deactivateBody: 'The company and its items disappear from the pickers used to build trips and offers. Existing trips keep their saved costs (SUP-07).',
    activateTitle: 'Activate this company?',
    deleteTitle: 'Delete this company?',
    deleteBody: 'The company and all its items are deleted for good. A company used by trips, offers or requests cannot be deleted; deactivate it instead.',
    activated: 'Company activated',
    deactivated: 'Company deactivated',
    deleted: 'Company deleted',
  },
});

export function CompaniesView() {
  const t = useMessages(m);
  const s = useMessages(supplierMessages);
  const c = useMessages(common);
  const { locale } = useLocale();
  const canManage = useCan('companies.manage');
  const router = useRouter();
  const name = useName();
  const lookups = useLookups();
  const services = useResource<Service[]>('/services');
  const invalidate = useInvalidate();
  const [editing, setEditing] = useState<Company | 'new' | null>(null);
  const [toggling, setToggling] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState<Company | null>(null);

  const columns = useMemo<ResourceColumn<Company>[]>(
    () => [
      {
        id: 'name',
        header: t.name,
        sortKey: 'name',
        cell: (x) => (
          <Link href={`/dashboard/companies/${x.id}`} className="font-medium hover:text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
            {x.name}
          </Link>
        ),
        print: (x) => x.name,
      },
      {
        id: 'service',
        header: t.service,
        cell: (x) => (
          <span className="flex flex-col">
            <span>{name(x.service)}</span>
            {x.service.kind === 'OTHER' && <span className="text-xs text-muted">{LABELS.serviceKind.OTHER[locale]}</span>}
          </span>
        ),
        print: (x) => name(x.service),
      },
      { id: 'mode', header: t.mode, cell: (x) => (x.transportMode ? <Badge tone="info">{LABELS.transportMode[x.transportMode][locale]}</Badge> : '—'), print: (x) => (x.transportMode ? LABELS.transportMode[x.transportMode][locale] : '—') },
      {
        id: 'place',
        header: t.place,
        cell: (x) => (
          <span className="inline-flex items-center gap-1.5 text-muted">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            {name(x.country)}
            {x.city ? ` / ${name(x.city)}` : ''}
          </span>
        ),
        print: (x) => `${name(x.country)}${x.city ? ` / ${name(x.city)}` : ''}`,
      },
      {
        id: 'contact',
        header: t.contact,
        cell: (x) =>
          x.contactName || x.phone ? (
            <span className="flex flex-col">
              <span>{x.contactName ?? '—'}</span>
              {x.phone && <span className="ltr-nums text-xs text-muted">{x.phone}</span>}
            </span>
          ) : (
            '—'
          ),
        print: (x) => [x.contactName, x.phone].filter(Boolean).join(' · ') || '—',
      },
      {
        id: 'integration',
        header: t.integration,
        cell: (x) => (x.integration ? <StatusBadge kind="integration" status={x.integration.status} /> : <Badge>{s.manual}</Badge>),
        print: (x) => (x.integration ? LABELS.integrationStatus[x.integration.status][locale] : s.manual),
      },
      { id: 'items', header: t.items, align: 'end', cell: (x) => <span className="num">{x._count?.items ?? 0}</span> },
      { id: 'status', header: t.status, cell: (x) => <ActiveBadge active={x.isActive} feminine />, print: (x) => (x.isActive ? s.activeF : s.inactiveF) },
      ...(canManage
        ? [
            {
              id: 'actions',
              header: c.actions,
              screenOnly: true,
              align: 'end' as const,
              cell: (x: Company) => (
                <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button size="icon-sm" variant="ghost" aria-label={`${c.edit} ${x.name}`} onClick={() => setEditing(x)}>
                    <Pencil />
                  </Button>
                  <Button size="icon-sm" variant="ghost" aria-label={`${x.isActive ? t.deactivate : t.activate} ${x.name}`} onClick={() => setToggling(x)}>
                    <Power className={x.isActive ? 'text-danger' : 'text-success'} />
                  </Button>
                  <Button size="icon-sm" variant="ghost" aria-label={`${c.delete} ${x.name}`} onClick={() => setDeleting(x)}>
                    <Trash2 className="text-danger" />
                  </Button>
                </div>
              ),
            },
          ]
        : []),
    ],
    [t, s, c, canManage, name, locale],
  );

  const serviceList = services.data ?? [];

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
      <ResourceTable<Company>
        endpoint="/companies"
        columns={columns}
        exportTitle={t.title}
        searchPlaceholder={t.search}
        filterKeys={['serviceId', 'serviceKind', 'transportMode', 'countryId', 'isActive']}
        defaultSort={{ key: 'name', order: 'asc' }}
        minWidth={980}
        filters={(f, set) => {
          const chosen = serviceList.find((x) => x.id === f.serviceId);
          const showMode = !chosen || chosen.kind === 'TRANSPORT';
          return (
            <>
              <FilterSelect
                label={t.service}
                value={f.serviceId}
                onChange={(v) => {
                  const kind = serviceList.find((x) => x.id === v)?.kind;
                  set({ serviceId: v, serviceKind: undefined, transportMode: kind && kind !== 'TRANSPORT' ? undefined : f.transportMode });
                }}
                options={serviceList.map((x) => ({ value: x.id, label: name(x) }))}
              />
              {showMode && (
                <FilterSelect
                  label={t.mode}
                  value={f.transportMode}
                  onChange={(v) => set({ transportMode: v })}
                  options={TRANSPORT_MODES.map((mode) => ({ value: mode, label: LABELS.transportMode[mode][locale] }))}
                />
              )}
              <FilterSelect label={t.country} value={f.countryId} onChange={(v) => set({ countryId: v })} options={(lookups.data?.countries ?? []).map((x) => ({ value: x.id, label: name(x) }))} />
              <FilterSelect
                label={t.status}
                value={f.isActive}
                onChange={(v) => set({ isActive: v })}
                options={[
                  { value: 'true', label: s.activeF },
                  { value: 'false', label: s.inactiveF },
                ]}
              />
            </>
          );
        }}
        onRowClick={(x) => router.push(`/dashboard/companies/${x.id}`)}
        getRowId={(x) => x.id}
        empty={{ title: t.empty, description: t.emptyBody }}
      />

      {editing && <CompanyDialog company={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}

      <ConfirmDialog
        open={!!toggling}
        onOpenChange={(o) => !o && setToggling(null)}
        title={toggling?.isActive ? t.deactivateTitle : t.activateTitle}
        description={toggling?.isActive ? t.deactivateBody : undefined}
        destructive={toggling?.isActive}
        confirmLabel={toggling?.isActive ? t.deactivate : t.activate}
        onConfirm={async () => {
          if (!toggling) return;
          try {
            await api.patch(`/companies/${toggling.id}/active`, { isActive: !toggling.isActive });
            toast.success(toggling.isActive ? t.deactivated : t.activated);
            await invalidate('/companies', '/integrations', '/catalog');
          } catch (e) {
            toast.error(errorMessage(e));
            throw e;
          }
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t.deleteTitle}
        description={t.deleteBody}
        destructive
        confirmLabel={c.delete}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await api.delete(`/companies/${deleting.id}`);
            toast.success(t.deleted);
            await invalidate('/companies', '/integrations', '/catalog');
          } catch (e) {
            toast.error(errorMessage(e));
            throw e;
          }
        }}
      />
    </div>
  );
}
