'use client';

import { LABELS, REQUEST_STATUSES } from '@travelos/shared';
import { useMemo, useState } from 'react';
import { FilterSelect, ResourceTable, type ResourceColumn } from '@/components/data/resource-table';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/lib/auth';
import { useLookups, useName } from '@/lib/hooks';
import { defineMessages, useLocale, useMessages } from '@/lib/i18n';
import type { CustomRequest } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';
import { RequestSheet } from './request-sheet';

const m = defineMessages({
  ar: {
    eyebrow: 'الصفحة العامة',
    title: 'طلبات الرحلات',
    description: 'طلبات «صمّم رحلتك» من الصفحة العامة. تواصل مع صاحب الطلب، ثم أنشئ له مسودة رحلة أو اربطه بحجز.',
    requestNo: 'رقم الطلب',
    date: 'التاريخ',
    contact: 'صاحب الطلب',
    route: 'المسار',
    dates: 'الفترة',
    people: 'الأشخاص',
    services: 'الخدمات المطلوبة',
    branch: 'الفرع',
    status: 'الحالة',
    unassigned: 'غير مسندة',
    other: 'أخرى: {text}',
    search: 'رقم الطلب أو الاسم أو الهاتف…',
    empty: 'لا توجد طلبات',
    emptyBody: 'تصل الطلبات من نموذج «صمّم رحلتك» في الصفحة العامة.',
    assignment: 'الإسناد',
    onlyUnassigned: 'غير المسندة فقط',
  },
  en: {
    eyebrow: 'Public site',
    title: 'Trip requests',
    description: '“Design your trip” requests from the public site. Contact the requester, then create a draft trip or link a booking.',
    requestNo: 'Request no.',
    date: 'Date',
    contact: 'Requester',
    route: 'Route',
    dates: 'Dates',
    people: 'People',
    services: 'Requested services',
    branch: 'Branch',
    status: 'Status',
    unassigned: 'Unassigned',
    other: 'Other: {text}',
    search: 'Request no., name or phone…',
    empty: 'No requests',
    emptyBody: 'Requests arrive from the “Design your trip” form on the public site.',
    assignment: 'Assignment',
    onlyUnassigned: 'Unassigned only',
  },
});

export function RequestServices({ r }: { r: CustomRequest }) {
  const t = useMessages(m);
  const { locale } = useLocale();
  return (
    <span className="flex flex-wrap gap-1">
      {r.items.map((i) => (
        <Badge key={i.id} size="sm" shape="rounded" tone={i.company ? 'neutral' : 'warning'}>
          <span className="text-subtle">{i.service.nameAr}:</span> {i.company ? i.company.name : t.other.replace('{text}', i.otherText ?? '')}
          {i.transportMode && <span className="text-subtle">· {LABELS.transportMode[i.transportMode][locale]}</span>}
        </Badge>
      ))}
    </span>
  );
}

export function RequestsView() {
  const t = useMessages(m);
  const { locale } = useLocale();
  const f = useFormat();
  const name = useName();
  const { isAdmin } = useAuth();
  const lookups = useLookups();
  const [openId, setOpenId] = useState<string | null>(null);

  const columns = useMemo<ResourceColumn<CustomRequest>[]>(
    () => [
      { id: 'requestNo', header: t.requestNo, cell: (r) => <span className="num font-medium whitespace-nowrap">{r.requestNo}</span> },
      { id: 'date', header: t.date, cell: (r) => <span className="num">{f.date(r.createdAt, 'short')}</span> },
      {
        id: 'contact',
        header: t.contact,
        cell: (r) => (
          <div className="flex flex-col">
            <span className="font-medium">{r.contactName}</span>
            <span className="ltr-nums text-xs text-muted" dir="ltr">
              {r.contactPhone}
            </span>
          </div>
        ),
        print: (r) => `${r.contactName} — ${r.contactPhone}`,
      },
      { id: 'route', header: t.route, cell: (r) => `${name(r.originCity)} ${locale === 'ar' ? '←' : '→'} ${name(r.destinationCity)}` },
      {
        id: 'dates',
        header: t.dates,
        cell: (r) => (
          <span className="num text-xs">
            {f.date(r.desiredFrom, 'medium')} – {f.date(r.desiredTo, 'medium')}
          </span>
        ),
      },
      { id: 'people', header: t.people, align: 'end', cell: (r) => <span className="num">{r.passengersCount}</span> },
      {
        id: 'services',
        header: t.services,
        cell: (r) => <RequestServices r={r} />,
        print: (r) => r.items.map((i) => `${i.service.nameAr}: ${i.company?.name ?? t.other.replace('{text}', i.otherText ?? '')}`).join(' | '),
      },
      {
        id: 'branch',
        header: t.branch,
        cell: (r) =>
          r.assignedBranch ? (
            <span className="text-muted">{r.assignedBranch.name}</span>
          ) : (
            <Badge tone="warning" size="sm" dot>
              {t.unassigned}
            </Badge>
          ),
        print: (r) => r.assignedBranch?.name ?? t.unassigned,
      },
      { id: 'status', header: t.status, cell: (r) => <StatusBadge kind="request" status={r.status} />, print: (r) => LABELS.requestStatus[r.status][locale] },
    ],
    [t, f, name, locale],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <ResourceTable<CustomRequest>
        endpoint="/requests"
        columns={columns}
        exportTitle={t.title}
        searchPlaceholder={t.search}
        filterKeys={['status', 'branchId', 'unassigned']}
        minWidth={1150}
        filters={(fl, set) => (
          <>
            <FilterSelect label={t.status} value={fl.status} onChange={(v) => set({ status: v })} options={REQUEST_STATUSES.map((s) => ({ value: s, label: LABELS.requestStatus[s][locale] }))} />
            {isAdmin && (
              <FilterSelect
                label={t.assignment}
                value={fl.unassigned === 'true' ? '__unassigned' : fl.branchId}
                onChange={(v) => set(v === '__unassigned' ? { unassigned: 'true', branchId: undefined } : { branchId: v, unassigned: undefined })}
                options={[{ value: '__unassigned', label: t.onlyUnassigned }, ...(lookups.data?.branches ?? []).map((b) => ({ value: b.id, label: b.name }))]}
              />
            )}
          </>
        )}
        onRowClick={(r) => setOpenId(r.id)}
        getRowId={(r) => r.id}
        empty={{ title: t.empty, description: t.emptyBody }}
      />
      <RequestSheet id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
