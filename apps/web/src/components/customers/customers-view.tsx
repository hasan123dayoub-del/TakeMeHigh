'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { FilterSelect, ResourceTable, type ResourceColumn } from '@/components/data/resource-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth, useCan } from '@/lib/auth';
import { useLookups, useName } from '@/lib/hooks';
import { defineMessages, LABELS, useLocale, useMessages } from '@/lib/i18n';
import type { Customer } from '@/lib/types/api';
import { CustomerDialog } from './customer-dialog';
import { DocChips } from './shared';

const m = defineMessages({
  ar: {
    eyebrow: 'الاستقبال',
    title: 'العملاء',
    description: 'كل من يدفع أو يسافر مع المكتب ووثائق سفره. ابحث بالاسم أو الهاتف أو رقم الوثيقة قبل إضافة عميل جديد.',
    add: 'عميل جديد',
    name: 'الاسم',
    phone: 'الهاتف',
    nationality: 'الجنسية',
    documents: 'الوثائق',
    branch: 'فرع التسجيل',
    trips: 'الرحلات',
    status: 'الحالة',
    active: 'فعّال',
    inactive: 'معطّل',
    search: 'الاسم أو الهاتف أو رقم الوثيقة…',
    empty: 'لا يوجد عملاء',
    emptyBody: 'أضف أول عميل، ثم احجز له رحلة.',
  },
  en: {
    eyebrow: 'Front desk',
    title: 'Customers',
    description: 'Everyone who pays or travels with the office, with their travel documents. Search by name, phone or document number before adding someone new.',
    add: 'New customer',
    name: 'Name',
    phone: 'Phone',
    nationality: 'Nationality',
    documents: 'Documents',
    branch: 'Registration branch',
    trips: 'Trips',
    status: 'Status',
    active: 'Active',
    inactive: 'Inactive',
    search: 'Name, phone or document number…',
    empty: 'No customers',
    emptyBody: 'Add the first customer, then book a trip for them.',
  },
});

export function CustomersView() {
  const t = useMessages(m);
  const { locale } = useLocale();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const canManage = useCan('customers.manage');
  const lookups = useLookups();
  const name = useName();
  const [creating, setCreating] = useState(false);

  const columns = useMemo<ResourceColumn<Customer>[]>(
    () => [
      { id: 'name', header: t.name, sortKey: 'fullName', cell: (c) => <span className="font-medium">{c.fullName}</span> },
      { id: 'phone', header: t.phone, cell: (c) => <span className="ltr-nums" dir="ltr">{c.phone}</span> },
      { id: 'nationality', header: t.nationality, cell: (c) => name(c.nationality) },
      {
        id: 'documents',
        header: t.documents,
        cell: (c) => <DocChips docs={c.documents} />,
        print: (c) => c.documents.map((d) => `${LABELS.documentType[d.docType][locale]} ${d.docNumber}`).join('، ') || '—',
      },
      { id: 'branch', header: t.branch, cell: (c) => c.branch.name },
      { id: 'trips', header: t.trips, align: 'end', cell: (c) => <span className="num">{c._count.travels}</span> },
      {
        id: 'status',
        header: t.status,
        cell: (c) => (
          <Badge tone={c.isActive ? 'success' : 'neutral'} dot>
            {c.isActive ? t.active : t.inactive}
          </Badge>
        ),
        print: (c) => (c.isActive ? t.active : t.inactive),
      },
    ],
    [t, name, locale],
  );

  return (
    <div className="flex flex-col gap-6">
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
      <ResourceTable<Customer>
        endpoint="/customers"
        columns={columns}
        exportTitle={t.title}
        searchPlaceholder={t.search}
        filterKeys={['nationalityCountryId', 'branchId', 'isActive']}
        defaultSort={{ key: 'createdAt', order: 'desc' }}
        filters={(f, set) => (
          <>
            <FilterSelect
              label={t.nationality}
              value={f.nationalityCountryId}
              onChange={(v) => set({ nationalityCountryId: v })}
              options={(lookups.data?.countries ?? []).map((x) => ({ value: x.id, label: name(x) }))}
            />
            {isAdmin && (
              <FilterSelect
                label={t.branch}
                value={f.branchId}
                onChange={(v) => set({ branchId: v })}
                options={(lookups.data?.branches ?? []).map((b) => ({ value: b.id, label: b.name }))}
              />
            )}
            <FilterSelect
              label={t.status}
              value={f.isActive}
              onChange={(v) => set({ isActive: v })}
              options={[
                { value: 'true', label: t.active },
                { value: 'false', label: t.inactive },
              ]}
            />
          </>
        )}
        onRowClick={(c) => router.push(`/dashboard/customers/${c.id}`)}
        getRowId={(c) => c.id}
        empty={{ title: t.empty, description: t.emptyBody }}
      />
      {creating && <CustomerDialog onClose={() => setCreating(false)} onSaved={(c) => router.push(`/dashboard/customers/${c.id}`)} />}
    </div>
  );
}
