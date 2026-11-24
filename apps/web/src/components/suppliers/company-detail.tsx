'use client';

import { LABELS } from '@travelos/shared';
import { ArrowLeft, ArrowRight, Pencil, Plus, Power, Star, Trash2, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/data/confirm-dialog';
import { FilterSelect, ResourceTable, type ResourceColumn } from '@/components/data/resource-table';
import { Field, QueryState } from '@/components/data/states';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useInvalidate, useLookups, useName, useResource } from '@/lib/hooks';
import { defineMessages, useLocale, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import type { Company, CompanyItem } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';
import { CompanyDialog } from './company-dialog';
import { ItemDialog } from './item-dialog';
import { ActiveBadge, supplierMessages } from './shared';

const m = defineMessages({
  ar: {
    back: 'كل الشركات',
    contactCard: 'بيانات التواصل',
    contactName: 'المسؤول',
    phone: 'الهاتف',
    email: 'البريد الإلكتروني',
    address: 'العنوان',
    place: 'الدولة / المدينة',
    rating: 'التصنيف',
    description: 'الوصف',
    service: 'الخدمة',
    mode: 'نوع النقل',
    integration: 'التكامل',
    lastSuccess: 'آخر مزامنة ناجحة',
    lastError: 'آخر خطأ',
    items: 'البنود',
    itemsBody: 'ما تقدّمه الشركة مع كلفته للشخص. البنود المعطّلة لا تظهر عند بناء الرحلات.',
    addItem: 'بند جديد',
    name: 'البند',
    route: 'من ← إلى',
    city: 'المدينة',
    cost: 'الكلفة للشخص',
    currency: 'العملة',
    source: 'المصدر',
    lastSync: 'آخر مزامنة',
    stale: 'كلفة قديمة',
    staleHint: 'فشلت المزامنة ولم تُحدَّث الكلفة منذ أكثر من 24 ساعة (INT-06)',
    availability: 'التوفر',
    available: 'متوفر',
    unavailable: 'غير متوفر',
    unknown: 'غير معروف',
    status: 'الحالة',
    search: 'ابحث في البنود…',
    empty: 'لا توجد بنود',
    emptyBody: 'أضف بنداً يدوياً، أو اربط الشركة بمنصتها من صفحة التكامل.',
    profitRules: 'قواعد الربح الافتراضية لهذه الشركة',
    profitRulesBody: 'تتقدّم قاعدة الشركة على قاعدة الخدمة (PRC-02). تُعدَّل من صفحة الخدمات والأرباح.',
    manageRules: 'إدارة قواعد الربح',
    edit: 'تعديل الشركة',
    deactivate: 'تعطيل',
    activate: 'تفعيل',
    deactivateTitle: 'تعطيل الشركة؟',
    deactivateBody: 'تختفي الشركة وبنودها من قوائم الاختيار، وتحتفظ الرحلات الحالية بكلفها المحفوظة (SUP-07).',
    activateTitle: 'تفعيل الشركة؟',
    deleteTitle: 'حذف الشركة؟',
    deleteBody: 'تُحذف الشركة وكل بنودها نهائياً. لا يمكن حذف شركة مستخدمة؛ عطّلها بدلاً من ذلك.',
    itemDeactivateTitle: 'تعطيل البند؟',
    itemDeactivateBody: 'لن يظهر البند عند بناء رحلات أو عروض جديدة، وتبقى الرحلات الحالية كما هي.',
    itemActivateTitle: 'تفعيل البند؟',
    itemDeleteTitle: 'حذف البند؟',
    itemDeleteBody: 'يُحذف البند نهائياً. لا يمكن حذف بند استُخدم في رحلة أو عرض؛ عطّله بدلاً من ذلك.',
    companyActivated: 'تم تفعيل الشركة',
    companyDeactivated: 'تم تعطيل الشركة',
    companyDeleted: 'تم حذف الشركة',
    itemActivated: 'تم تفعيل البند',
    itemDeactivated: 'تم تعطيل البند',
    itemDeleted: 'تم حذف البند',
  },
  en: {
    back: 'All companies',
    contactCard: 'Contact details',
    contactName: 'Contact person',
    phone: 'Phone',
    email: 'Email',
    address: 'Address',
    place: 'Country / city',
    rating: 'Rating',
    description: 'Description',
    service: 'Service',
    mode: 'Transport mode',
    integration: 'Integration',
    lastSuccess: 'Last successful sync',
    lastError: 'Last error',
    items: 'Items',
    itemsBody: 'What the company provides, with its cost per person. Inactive items do not appear when building trips.',
    addItem: 'New item',
    name: 'Item',
    route: 'From → to',
    city: 'City',
    cost: 'Cost per person',
    currency: 'Currency',
    source: 'Source',
    lastSync: 'Last sync',
    stale: 'Outdated cost',
    staleHint: 'Sync failed and the cost has not been refreshed for over 24 hours (INT-06)',
    availability: 'Availability',
    available: 'Available',
    unavailable: 'Unavailable',
    unknown: 'Unknown',
    status: 'Status',
    search: 'Search items…',
    empty: 'No items',
    emptyBody: 'Add an item by hand, or connect the company to its platform on the Integrations page.',
    profitRules: 'Default profit rules for this company',
    profitRulesBody: 'A company rule takes precedence over the service rule (PRC-02). Edit them on Services & profit.',
    manageRules: 'Manage profit rules',
    edit: 'Edit company',
    deactivate: 'Deactivate',
    activate: 'Activate',
    deactivateTitle: 'Deactivate this company?',
    deactivateBody: 'The company and its items disappear from the pickers. Existing trips keep their saved costs (SUP-07).',
    activateTitle: 'Activate this company?',
    deleteTitle: 'Delete this company?',
    deleteBody: 'The company and all its items are deleted for good. A company in use cannot be deleted; deactivate it instead.',
    itemDeactivateTitle: 'Deactivate this item?',
    itemDeactivateBody: 'It will not appear when building new trips or offers. Existing trips stay as they are.',
    itemActivateTitle: 'Activate this item?',
    itemDeleteTitle: 'Delete this item?',
    itemDeleteBody: 'The item is deleted for good. An item used by a trip or offer cannot be deleted; deactivate it instead.',
    companyActivated: 'Company activated',
    companyDeactivated: 'Company deactivated',
    companyDeleted: 'Company deleted',
    itemActivated: 'Item activated',
    itemDeactivated: 'Item deactivated',
    itemDeleted: 'Item deleted',
  },
});

export function CompanyDetail({ id }: { id: string }) {
  const t = useMessages(m);
  const s = useMessages(supplierMessages);
  const c = useMessages(common);
  const { locale } = useLocale();
  const { can, canAny } = useAuth();
  const canManage = can('companies.manage');
  const canSeeCost = can('pricing.view_breakdown');
  const canSeeRules = canAny('pricing.set_profit', 'pricing.view_breakdown');
  const name = useName();
  const f = useFormat();
  const router = useRouter();
  const lookups = useLookups();
  const invalidate = useInvalidate();
  const company = useResource<Company>(`/companies/${id}`);
  const [editingCompany, setEditingCompany] = useState(false);
  const [togglingCompany, setTogglingCompany] = useState(false);
  const [deletingCompany, setDeletingCompany] = useState(false);
  const [editingItem, setEditingItem] = useState<CompanyItem | 'new' | null>(null);
  const [togglingItem, setTogglingItem] = useState<CompanyItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<CompanyItem | null>(null);

  const data = company.data;
  const isTransport = data?.service.kind === 'TRANSPORT';

  const columns = useMemo<ResourceColumn<CompanyItem>[]>(
    () => [
      {
        id: 'name',
        header: t.name,
        sortKey: 'name',
        cell: (x) => (
          <span className="flex flex-col">
            <span className="font-medium">{x.name}</span>
            {x.description && <span className="line-clamp-1 text-xs text-muted">{x.description}</span>}
          </span>
        ),
        print: (x) => x.name,
      },
      {
        id: 'route',
        header: isTransport ? t.route : t.city,
        cell: (x) =>
          isTransport ? (
            <span className="inline-flex items-center gap-1.5">
              {name(x.fromCity)}
              <ArrowRight className="rtl-flip size-3.5 text-subtle" aria-hidden />
              {name(x.toCity)}
            </span>
          ) : (
            name(x.toCity)
          ),
        print: (x) => (isTransport ? `${name(x.fromCity)} → ${name(x.toCity)}` : name(x.toCity)),
      },
      ...(canSeeCost
        ? [
            {
              id: 'cost',
              header: t.cost,
              sortKey: 'costPerPerson',
              align: 'end' as const,
              cell: (x: CompanyItem) => (x.costPerPerson !== null ? <span className="num font-medium">{f.money(x.costPerPerson, x.currencyCode)}</span> : '—'),
            },
          ]
        : []),
      { id: 'currency', header: t.currency, cell: (x) => <span className="num">{x.currencyCode}</span> },
      {
        id: 'source',
        header: t.source,
        cell: (x) => <Badge tone={x.source === 'INTEGRATION' ? 'primary' : 'neutral'}>{LABELS.itemSource[x.source][locale]}</Badge>,
        print: (x) => LABELS.itemSource[x.source][locale],
      },
      {
        id: 'lastSync',
        header: t.lastSync,
        cell: (x) => (
          <span className="flex flex-col items-start gap-1">
            <span className="text-muted">{x.lastSyncedAt ? f.date(x.lastSyncedAt, 'dateTime') : '—'}</span>
            {x.isStale && (
              <Badge tone="warning" title={t.staleHint}>
                <TriangleAlert className="size-3" aria-hidden /> {t.stale}
              </Badge>
            )}
          </span>
        ),
        print: (x) => `${x.lastSyncedAt ? f.date(x.lastSyncedAt, 'dateTime') : '—'}${x.isStale ? ` (${t.stale})` : ''}`,
      },
      {
        id: 'available',
        header: t.availability,
        cell: (x) =>
          x.available === null ? <span className="text-muted">{t.unknown}</span> : <Badge tone={x.available ? 'success' : 'danger'}>{x.available ? t.available : t.unavailable}</Badge>,
        print: (x) => (x.available === null ? t.unknown : x.available ? t.available : t.unavailable),
      },
      { id: 'status', header: t.status, cell: (x) => <ActiveBadge active={x.isActive} />, print: (x) => (x.isActive ? s.active : s.inactive) },
      ...(canManage
        ? [
            {
              id: 'actions',
              header: c.actions,
              screenOnly: true,
              align: 'end' as const,
              cell: (x: CompanyItem) => (
                <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button size="icon-sm" variant="ghost" aria-label={`${c.edit} ${x.name}`} onClick={() => setEditingItem(x)}>
                    <Pencil />
                  </Button>
                  <Button size="icon-sm" variant="ghost" aria-label={`${x.isActive ? t.deactivate : t.activate} ${x.name}`} onClick={() => setTogglingItem(x)}>
                    <Power className={x.isActive ? 'text-danger' : 'text-success'} />
                  </Button>
                  <Button size="icon-sm" variant="ghost" aria-label={`${c.delete} ${x.name}`} onClick={() => setDeletingItem(x)}>
                    <Trash2 className="text-danger" />
                  </Button>
                </div>
              ),
            },
          ]
        : []),
    ],
    [t, s, c, canManage, canSeeCost, isTransport, name, f, locale],
  );

  const run = async (fn: () => Promise<unknown>, success: string) => {
    try {
      await fn();
      toast.success(success);
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    }
  };

  return (
    <QueryState isLoading={company.isLoading} error={company.error} onRetry={() => company.refetch()}>
      {data && (
        <div className="flex flex-col gap-6">
          <Link href="/dashboard/companies" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-foreground">
            <ArrowLeft className="rtl-flip size-4" aria-hidden /> {t.back}
          </Link>
          <PageHeader
            eyebrow={name(data.service)}
            title={data.name}
            description={
              <span className="flex flex-wrap items-center gap-2">
                {data.transportMode && <Badge tone="info">{LABELS.transportMode[data.transportMode][locale]}</Badge>}
                <Badge>
                  {name(data.country)}
                  {data.city ? ` / ${name(data.city)}` : ''}
                </Badge>
                {data.integration ? <StatusBadge kind="integration" status={data.integration.status} /> : <Badge>{s.manual}</Badge>}
                <ActiveBadge active={data.isActive} feminine />
              </span>
            }
            actions={
              canManage && (
                <>
                  <Button variant="secondary" onClick={() => setEditingCompany(true)}>
                    <Pencil /> {t.edit}
                  </Button>
                  <Button variant="secondary" onClick={() => setTogglingCompany(true)}>
                    <Power className={data.isActive ? 'text-danger' : 'text-success'} /> {data.isActive ? t.deactivate : t.activate}
                  </Button>
                  <Button variant="ghost" onClick={() => setDeletingCompany(true)} aria-label={c.delete}>
                    <Trash2 className="text-danger" /> {c.delete}
                  </Button>
                </>
              )
            }
          />

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t.contactCard}</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 sm:grid-cols-3">
                  <Field label={t.contactName}>{data.contactName ?? '—'}</Field>
                  <Field label={t.phone}>
                    <span className="ltr-nums">{data.phone ?? '—'}</span>
                  </Field>
                  <Field label={t.email}>
                    {data.email ? (
                      <a href={`mailto:${data.email}`} className="ltr-nums text-primary hover:underline">
                        {data.email}
                      </a>
                    ) : (
                      '—'
                    )}
                  </Field>
                  <Field label={t.address}>{data.address ?? '—'}</Field>
                  <Field label={t.place}>
                    {name(data.country)}
                    {data.city ? ` / ${name(data.city)}` : ''}
                  </Field>
                  {data.service.kind === 'HOTEL' && (
                    <Field label={t.rating}>
                      {data.rating ? (
                        <span className="inline-flex items-center gap-0.5 text-warning" aria-label={`${data.rating}/5`}>
                          {Array.from({ length: data.rating }, (_, i) => (
                            <Star key={i} className="size-4 fill-current" aria-hidden />
                          ))}
                        </span>
                      ) : (
                        '—'
                      )}
                    </Field>
                  )}
                  {data.description && (
                    <Field label={t.description} className="sm:col-span-3">
                      <span className="font-normal whitespace-pre-line text-muted">{data.description}</span>
                    </Field>
                  )}
                </dl>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t.integration}</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4">
                  <Field label={c.status}>{data.integration ? <StatusBadge kind="integration" status={data.integration.status} /> : <Badge>{s.manual}</Badge>}</Field>
                  {data.integration && (
                    <>
                      <Field label={t.lastSuccess}>{data.integration.lastSuccessAt ? f.date(data.integration.lastSuccessAt, 'dateTime') : '—'}</Field>
                      {data.integration.lastError && (
                        <Field label={t.lastError}>
                          <span className="font-normal text-danger">{data.integration.lastError}</span>
                        </Field>
                      )}
                    </>
                  )}
                </dl>
              </CardContent>
            </Card>
          </div>

          {canSeeRules && !!data.profitRules?.length && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>{t.profitRules}</CardTitle>
                  <CardDescription>{t.profitRulesBody}</CardDescription>
                </div>
                <Button asChild variant="link" size="sm">
                  <Link href="/dashboard/services">{t.manageRules}</Link>
                </Button>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {data.profitRules.map((r) => (
                  <Badge key={r.id} tone="primary" size="md">
                    {LABELS.profitMode[r.mode][locale]}:{' '}
                    <span className="num">{r.mode === 'PERCENT' ? `${f.number(r.value)}%` : f.number(r.value)}</span>
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}

          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="heading-display text-xl">{t.items}</h2>
                <p className="mt-1 text-sm text-muted">{t.itemsBody}</p>
              </div>
              {canManage && (
                <Button onClick={() => setEditingItem('new')}>
                  <Plus /> {t.addItem}
                </Button>
              )}
            </div>
            <ResourceTable<CompanyItem>
              endpoint={`/companies/${id}/items`}
              columns={columns}
              exportTitle={`${t.items} — ${data.name}`}
              searchPlaceholder={t.search}
              filterKeys={['isActive', 'currencyCode']}
              defaultSort={{ key: 'name', order: 'asc' }}
              minWidth={960}
              filters={(fl, set) => (
                <>
                  <FilterSelect
                    label={t.status}
                    value={fl.isActive}
                    onChange={(v) => set({ isActive: v })}
                    options={[
                      { value: 'true', label: s.active },
                      { value: 'false', label: s.inactive },
                    ]}
                  />
                  <FilterSelect label={t.currency} value={fl.currencyCode} onChange={(v) => set({ currencyCode: v })} options={(lookups.data?.currencies ?? []).map((x) => ({ value: x.code, label: x.code }))} />
                </>
              )}
              onRowClick={canManage ? (x) => setEditingItem(x) : undefined}
              getRowId={(x) => x.id}
              empty={{ title: t.empty, description: t.emptyBody }}
            />
          </section>

          {editingCompany && <CompanyDialog company={data} onClose={() => setEditingCompany(false)} />}
          {editingItem && <ItemDialog company={data} item={editingItem === 'new' ? null : editingItem} onClose={() => setEditingItem(null)} />}

          <ConfirmDialog
            open={togglingCompany}
            onOpenChange={setTogglingCompany}
            title={data.isActive ? t.deactivateTitle : t.activateTitle}
            description={data.isActive ? t.deactivateBody : undefined}
            destructive={data.isActive}
            confirmLabel={data.isActive ? t.deactivate : t.activate}
            onConfirm={() =>
              run(async () => {
                await api.patch(`/companies/${id}/active`, { isActive: !data.isActive });
                await invalidate('/companies', '/integrations', '/catalog');
              }, data.isActive ? t.companyDeactivated : t.companyActivated)
            }
          />
          <ConfirmDialog
            open={deletingCompany}
            onOpenChange={setDeletingCompany}
            title={t.deleteTitle}
            description={t.deleteBody}
            destructive
            confirmLabel={c.delete}
            onConfirm={() =>
              run(async () => {
                await api.delete(`/companies/${id}`);
                router.push('/dashboard/companies');
                await invalidate('/companies', '/integrations', '/catalog');
              }, t.companyDeleted)
            }
          />
          <ConfirmDialog
            open={!!togglingItem}
            onOpenChange={(o) => !o && setTogglingItem(null)}
            title={togglingItem?.isActive ? t.itemDeactivateTitle : t.itemActivateTitle}
            description={togglingItem?.isActive ? t.itemDeactivateBody : undefined}
            destructive={togglingItem?.isActive}
            confirmLabel={togglingItem?.isActive ? t.deactivate : t.activate}
            onConfirm={() =>
              togglingItem &&
              run(async () => {
                await api.patch(`/items/${togglingItem.id}/active`, { isActive: !togglingItem.isActive });
                await invalidate(`/companies/${id}`, '/catalog');
              }, togglingItem.isActive ? t.itemDeactivated : t.itemActivated)
            }
          />
          <ConfirmDialog
            open={!!deletingItem}
            onOpenChange={(o) => !o && setDeletingItem(null)}
            title={t.itemDeleteTitle}
            description={t.itemDeleteBody}
            destructive
            confirmLabel={c.delete}
            onConfirm={() =>
              deletingItem &&
              run(async () => {
                await api.delete(`/items/${deletingItem.id}`);
                await invalidate(`/companies/${id}`, '/catalog');
              }, t.itemDeleted)
            }
          />
        </div>
      )}
    </QueryState>
  );
}
