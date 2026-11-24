'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { LABELS, PROFIT_MODES, type ProfitMode } from '@travelos/shared';
import { Calculator, Loader2, Lock, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { ConfirmDialog } from '@/components/data/confirm-dialog';
import type { ResourceColumn } from '@/components/data/resource-table';
import { QueryState } from '@/components/data/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useApiMutation, useInvalidate, useList, useName, useResource } from '@/lib/hooks';
import { defineMessages, useLocale, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import type { Company, ProfitRule, Service } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';
import { ActiveBadge, ArrayTable, sellingPrice, supplierMessages } from './shared';

const SERVICE_RULE = '__service__';

const m = defineMessages({
  ar: {
    eyebrow: 'الموردون',
    title: 'الخدمات والأرباح',
    description: 'أنواع الخدمات التي يقدّمها الموردون، وقواعد الربح الافتراضية التي تُطبَّق عند إضافة بند إلى رحلة أو عرض.',
    services: 'الخدمات',
    servicesBody: 'الفندق والنقل والمطعم خدمات أساسية لا تُعطَّل. يمكن إضافة خدمات أخرى (مثل المرشد أو التأمين).',
    addService: 'خدمة جديدة',
    code: 'الرمز',
    nameAr: 'الاسم بالعربية',
    nameEn: 'الاسم بالإنجليزية',
    kind: 'النوع',
    companies: 'الشركات',
    system: 'أساسية',
    custom: 'مخصّصة',
    type: 'الفئة',
    status: 'الحالة',
    newService: 'خدمة جديدة',
    editService: 'تعديل الخدمة',
    serviceHint: 'الخدمات الجديدة من نوع «أخرى». الرمز بأحرف إنجليزية كبيرة وشرطة سفلية، ولا يتغيّر بعد الإنشاء.',
    codeHint: 'مثال: TOUR_GUIDE (3–40 حرفاً، يبدأ بحرف)',
    codeInvalid: 'استخدم أحرفاً إنجليزية كبيرة وأرقاماً و _ ويبدأ بحرف (3–40)',
    minTwo: 'حرفان على الأقل',
    serviceSaved: 'تم حفظ الخدمة',
    enable: 'تفعيل',
    disable: 'تعطيل',
    disableTitle: 'تعطيل الخدمة؟',
    disableBody: 'لن تظهر الخدمة عند إضافة شركات أو بناء رحلات جديدة. تبقى البيانات الحالية كما هي.',
    enableTitle: 'تفعيل الخدمة؟',
    serviceEnabled: 'تم تفعيل الخدمة',
    serviceDisabled: 'تم تعطيل الخدمة',
    systemLocked: 'خدمة أساسية: لا تُعطَّل',
    emptyServices: 'لا توجد خدمات',
    rules: 'قواعد الربح الافتراضية',
    rulesBody: 'لكل خدمة قاعدة عامة، ويمكن تخصيص قاعدة لشركة بعينها.',
    explainTitle: 'كيف يُحسب سعر البيع؟',
    explain: 'سعر البيع = الكلفة + الربح. قاعدة الشركة تتقدّم على قاعدة الخدمة، وإن لم توجد قاعدة فالربح 0%. يستطيع المدير تعديل الربح لكل سطر داخل الرحلة (PRC-02).',
    addRule: 'قاعدة جديدة',
    service: 'الخدمة',
    company: 'الشركة',
    allCompanies: 'كل شركات الخدمة',
    mode: 'طريقة الربح',
    value: 'القيمة',
    newRule: 'قاعدة ربح جديدة',
    editRule: 'تعديل قاعدة الربح',
    ruleHint: 'إن وُجدت قاعدة لنفس الخدمة والشركة فستُستبدل.',
    valueInvalid: 'أدخل رقماً موجباً بخانتين عشريتين كحد أقصى',
    required: 'هذا الحقل مطلوب',
    ruleSaved: 'تم حفظ قاعدة الربح',
    deleteRuleTitle: 'حذف قاعدة الربح؟',
    deleteRuleBody: 'تعود البنود إلى قاعدة الخدمة، أو إلى 0% إن لم توجد. الرحلات الحالية لا تتغيّر.',
    ruleDeleted: 'تم حذف قاعدة الربح',
    emptyRules: 'لا توجد قواعد ربح',
    emptyRulesBody: 'بدون قواعد يكون الربح الافتراضي 0% ويحدّده المدير لكل سطر.',
    calculator: 'حاسبة سريعة',
    calculatorBody: 'جرّب قاعدة على كلفة لترى سعر البيع.',
    cost: 'الكلفة للشخص',
    useRule: 'تطبيق قاعدة',
    customRule: 'قيمة يدوية',
    profit: 'الربح',
    price: 'سعر البيع',
    forbiddenRules: 'قواعد الربح متاحة لمدير المكتب فقط (pricing.set_profit).',
  },
  en: {
    eyebrow: 'Suppliers',
    title: 'Services & profit',
    description: 'The kinds of service suppliers provide, and the default profit rules applied when an item is added to a trip or offer.',
    services: 'Services',
    servicesBody: 'Hotel, transport and restaurant are core services and cannot be disabled. You can add others (e.g. guide or insurance).',
    addService: 'New service',
    code: 'Code',
    nameAr: 'Arabic name',
    nameEn: 'English name',
    kind: 'Kind',
    companies: 'Companies',
    system: 'Core',
    custom: 'Custom',
    type: 'Type',
    status: 'Status',
    newService: 'New service',
    editService: 'Edit service',
    serviceHint: 'New services are of kind “Other”. The code uses capital letters and underscores and cannot change later.',
    codeHint: 'e.g. TOUR_GUIDE (3–40 characters, starts with a letter)',
    codeInvalid: 'Use capital letters, digits and _, starting with a letter (3–40)',
    minTwo: 'At least 2 characters',
    serviceSaved: 'Service saved',
    enable: 'Enable',
    disable: 'Disable',
    disableTitle: 'Disable this service?',
    disableBody: 'It will not be offered when adding companies or building new trips. Existing data stays.',
    enableTitle: 'Enable this service?',
    serviceEnabled: 'Service enabled',
    serviceDisabled: 'Service disabled',
    systemLocked: 'Core service: always active',
    emptyServices: 'No services',
    rules: 'Default profit rules',
    rulesBody: 'Each service has a general rule; a company can have its own.',
    explainTitle: 'How is the selling price computed?',
    explain: 'Selling price = cost + profit. A company rule takes precedence over the service rule; with no rule the profit is 0%. The Admin can change the profit of each line inside the trip (PRC-02).',
    addRule: 'New rule',
    service: 'Service',
    company: 'Company',
    allCompanies: 'All companies of the service',
    mode: 'Profit mode',
    value: 'Value',
    newRule: 'New profit rule',
    editRule: 'Edit profit rule',
    ruleHint: 'A rule for the same service and company is replaced.',
    valueInvalid: 'Enter a positive number with up to 2 decimals',
    required: 'This field is required',
    ruleSaved: 'Profit rule saved',
    deleteRuleTitle: 'Delete this profit rule?',
    deleteRuleBody: 'Items fall back to the service rule, or 0% if there is none. Existing trips do not change.',
    ruleDeleted: 'Profit rule deleted',
    emptyRules: 'No profit rules',
    emptyRulesBody: 'Without rules the default profit is 0% and the Admin sets it per line.',
    calculator: 'Quick calculator',
    calculatorBody: 'Try a rule on a cost to see the selling price.',
    cost: 'Cost per person',
    useRule: 'Apply a rule',
    customRule: 'Manual value',
    profit: 'Profit',
    price: 'Selling price',
    forbiddenRules: 'Profit rules are for the office Admin only (pricing.set_profit).',
  },
});

export function ServicesView() {
  const t = useMessages(m);
  const s = useMessages(supplierMessages);
  const c = useMessages(common);
  const { locale } = useLocale();
  const { can } = useAuth();
  const canManage = can('services.manage');
  const canProfit = can('pricing.set_profit');
  const name = useName();
  const invalidate = useInvalidate();
  const services = useResource<Service[]>('/services');
  const [editing, setEditing] = useState<Service | 'new' | null>(null);
  const [toggling, setToggling] = useState<Service | null>(null);

  const columns = useMemo<ResourceColumn<Service>[]>(
    () => [
      { id: 'code', header: t.code, cell: (x) => <span className="num font-medium" dir="ltr">{x.code}</span> },
      { id: 'nameAr', header: t.nameAr, cell: (x) => x.nameAr },
      { id: 'nameEn', header: t.nameEn, cell: (x) => <span dir="ltr">{x.nameEn}</span> },
      { id: 'kind', header: t.kind, cell: (x) => LABELS.serviceKind[x.kind][locale] },
      {
        id: 'type',
        header: t.type,
        cell: (x) => (x.isSystem ? <Badge tone="ink">{t.system}</Badge> : <Badge tone="primary">{t.custom}</Badge>),
        print: (x) => (x.isSystem ? t.system : t.custom),
      },
      { id: 'companies', header: t.companies, align: 'end', cell: (x) => <span className="num">{x._count?.companies ?? 0}</span> },
      { id: 'status', header: t.status, cell: (x) => <ActiveBadge active={x.isActive} feminine />, print: (x) => (x.isActive ? s.activeF : s.inactiveF) },
      ...(canManage
        ? [
            {
              id: 'actions',
              header: c.actions,
              screenOnly: true,
              align: 'end' as const,
              cell: (x: Service) => (
                <div className="flex justify-end gap-1">
                  <Button size="icon-sm" variant="ghost" aria-label={`${c.edit} ${name(x)}`} onClick={() => setEditing(x)}>
                    <Pencil />
                  </Button>
                  {x.isSystem ? (
                    <span className="grid size-8 place-items-center text-subtle" title={t.systemLocked} aria-label={t.systemLocked}>
                      <Lock className="size-4" />
                    </span>
                  ) : (
                    <Button size="icon-sm" variant="ghost" aria-label={`${x.isActive ? t.disable : t.enable} ${name(x)}`} onClick={() => setToggling(x)}>
                      <Power className={x.isActive ? 'text-danger' : 'text-success'} />
                    </Button>
                  )}
                </div>
              ),
            },
          ]
        : []),
    ],
    [t, s, c, canManage, name, locale],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />

      <Card className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="heading-display text-xl">{t.services}</h2>
            <p className="mt-1 text-sm text-muted">{t.servicesBody}</p>
          </div>
          {canManage && (
            <Button onClick={() => setEditing('new')}>
              <Plus /> {t.addService}
            </Button>
          )}
        </div>
        <QueryState isLoading={false} error={services.error} onRetry={() => services.refetch()}>
          <ArrayTable<Service>
            rows={services.data ?? []}
            loading={services.isLoading}
            columns={columns}
            exportTitle={t.services}
            getRowId={(x) => x.id}
            empty={{ title: t.emptyServices }}
            minWidth={820}
          />
        </QueryState>
      </Card>

      {canProfit ? <ProfitRulesSection services={services.data ?? []} /> : null}

      {editing && <ServiceDialog service={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}

      <ConfirmDialog
        open={!!toggling}
        onOpenChange={(o) => !o && setToggling(null)}
        title={toggling?.isActive ? t.disableTitle : t.enableTitle}
        description={toggling?.isActive ? t.disableBody : undefined}
        destructive={toggling?.isActive}
        confirmLabel={toggling?.isActive ? t.disable : t.enable}
        onConfirm={async () => {
          if (!toggling) return;
          try {
            await api.patch(`/services/${toggling.id}/active`, { isActive: !toggling.isActive });
            toast.success(toggling.isActive ? t.serviceDisabled : t.serviceEnabled);
            await invalidate('/services', '/lookups');
          } catch (e) {
            toast.error(errorMessage(e));
            throw e;
          }
        }}
      />
    </div>
  );
}

function ServiceDialog({ service, onClose }: { service: Service | null; onClose: () => void }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const invalidate = useInvalidate();
  const schema = useMemo(
    () =>
      z.object({
        code: z.string().trim(),
        nameAr: z.string().trim().min(2, { error: t.minTwo }).max(80),
        nameEn: z.string().trim().min(2, { error: t.minTwo }).max(80),
      }),
    [t],
  );
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { code: service?.code ?? '', nameAr: service?.nameAr ?? '', nameEn: service?.nameEn ?? '' },
  });
  const save = useApiMutation(
    (v: Values) =>
      service
        ? api.patch<Service>(`/services/${service.id}`, { nameAr: v.nameAr, nameEn: v.nameEn })
        : api.post<Service>('/services', { code: v.code.toUpperCase(), kind: 'OTHER', nameAr: v.nameAr, nameEn: v.nameEn }),
    {
      success: t.serviceSaved,
      onSuccess: async () => {
        await invalidate('/services', '/lookups', '/companies');
        onClose();
      },
    },
  );
  const submit = form.handleSubmit((v) => {
    if (!service && !/^[A-Z][A-Z0-9_]{2,39}$/.test(v.code.toUpperCase())) {
      form.setError('code', { message: t.codeInvalid });
      return;
    }
    save.mutate(v);
  });
  const errors = form.formState.errors;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{service ? t.editService : t.newService}</DialogTitle>
          <DialogDescription>{t.serviceHint}</DialogDescription>
        </DialogHeader>
        <form id="service-form" onSubmit={submit} className="grid gap-4" noValidate>
          <FormField label={t.code} error={errors.code?.message} hint={service ? undefined : t.codeHint} required={!service}>
            <Input
              dir="ltr"
              className="num uppercase"
              disabled={!!service}
              autoFocus={!service}
              {...form.register('code', { onChange: (e: { target: { value: string } }) => form.setValue('code', e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '')) })}
            />
          </FormField>
          <FormField label={t.nameAr} error={errors.nameAr?.message} required>
            <Input {...form.register('nameAr')} autoFocus={!!service} />
          </FormField>
          <FormField label={t.nameEn} error={errors.nameEn?.message} required>
            <Input dir="ltr" {...form.register('nameEn')} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {c.cancel}
          </Button>
          <Button type="submit" form="service-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />} {c.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------ profit rules (PRC-02)

function ProfitRulesSection({ services }: { services: Service[] }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const { locale } = useLocale();
  const name = useName();
  const f = useFormat();
  const invalidate = useInvalidate();
  const rules = useResource<ProfitRule[]>('/profit-rules');
  const [editing, setEditing] = useState<ProfitRule | 'new' | null>(null);
  const [deleting, setDeleting] = useState<ProfitRule | null>(null);

  const ruleValue = (r: { mode: ProfitMode; value: string }) => (r.mode === 'PERCENT' ? `${f.number(r.value)}%` : f.number(r.value));

  const columns = useMemo<ResourceColumn<ProfitRule>[]>(
    () => [
      { id: 'service', header: t.service, cell: (r) => <span className="font-medium">{r.service ? name(r.service) : '—'}</span>, print: (r) => (r.service ? name(r.service) : '—') },
      {
        id: 'company',
        header: t.company,
        cell: (r) => (r.company ? r.company.name : <span className="text-muted">{t.allCompanies}</span>),
        print: (r) => r.company?.name ?? t.allCompanies,
      },
      { id: 'mode', header: t.mode, cell: (r) => LABELS.profitMode[r.mode][locale] },
      { id: 'value', header: t.value, align: 'end', cell: (r) => <span className="num font-medium">{ruleValue(r)}</span>, print: (r) => ruleValue(r) },
      {
        id: 'actions',
        header: c.actions,
        screenOnly: true,
        align: 'end',
        cell: (r) => (
          <div className="flex justify-end gap-1">
            <Button size="icon-sm" variant="ghost" aria-label={c.edit} onClick={() => setEditing(r)}>
              <Pencil />
            </Button>
            <Button size="icon-sm" variant="ghost" aria-label={c.delete} onClick={() => setDeleting(r)}>
              <Trash2 className="text-danger" />
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, c, name, locale, f],
  );

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card className="flex flex-col gap-4 p-4 sm:p-5 xl:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="heading-display text-xl">{t.rules}</h2>
            <p className="mt-1 text-sm text-muted">{t.rulesBody}</p>
          </div>
          <Button onClick={() => setEditing('new')}>
            <Plus /> {t.addRule}
          </Button>
        </div>
        <QueryState isLoading={false} error={rules.error} onRetry={() => rules.refetch()}>
          <ArrayTable<ProfitRule>
            rows={rules.data ?? []}
            loading={rules.isLoading}
            columns={columns}
            exportTitle={t.rules}
            getRowId={(r) => r.id}
            empty={{ title: t.emptyRules, description: t.emptyRulesBody }}
            minWidth={560}
          />
        </QueryState>
      </Card>
      <div className="flex flex-col gap-4">
        <Card tone="altitude" className="text-white">
          <CardHeader>
            <CardTitle>{t.explainTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-white/90">{t.explain}</p>
          </CardContent>
        </Card>
        <ProfitCalculator rules={rules.data ?? []} />
      </div>

      {editing && <RuleDialog rule={editing === 'new' ? null : editing} services={services} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t.deleteRuleTitle}
        description={t.deleteRuleBody}
        destructive
        confirmLabel={c.delete}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await api.delete(`/profit-rules/${deleting.id}`);
            toast.success(t.ruleDeleted);
            await invalidate('/profit-rules', '/companies');
          } catch (e) {
            toast.error(errorMessage(e));
            throw e;
          }
        }}
      />
    </div>
  );
}

function ProfitCalculator({ rules }: { rules: ProfitRule[] }) {
  const t = useMessages(m);
  const { locale } = useLocale();
  const name = useName();
  const f = useFormat();
  const [cost, setCost] = useState('');
  const [ruleId, setRuleId] = useState(SERVICE_RULE);
  const [mode, setMode] = useState<ProfitMode>('PERCENT');
  const [value, setValue] = useState('');

  const rule = rules.find((r) => r.id === ruleId);
  const effMode = rule?.mode ?? mode;
  const effValue = rule ? Number(rule.value) : value === '' ? 15 : Number(value);
  const effCost = cost === '' ? 200000 : Number(cost);
  const result = sellingPrice(effCost, effMode, effValue);
  const isExample = cost === '' && !rule && value === '';

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="size-4 text-primary" aria-hidden /> {t.calculator}
          </CardTitle>
          <CardDescription>{t.calculatorBody}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        <FormField label={t.cost}>
          <Input dir="ltr" inputMode="decimal" className="num" placeholder="200000" value={cost} onChange={(e) => setCost(e.target.value.replace(/[^\d.]/g, ''))} />
        </FormField>
        <FormField label={t.useRule}>
          <Select value={ruleId} onValueChange={setRuleId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SERVICE_RULE}>{t.customRule}</SelectItem>
              {rules.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.service ? name(r.service) : ''}
                  {r.company ? ` · ${r.company.name}` : ''} — {r.mode === 'PERCENT' ? `${r.value}%` : r.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        {!rule && (
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t.mode}>
              <Select value={mode} onValueChange={(v) => setMode(v as ProfitMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROFIT_MODES.map((x) => (
                    <SelectItem key={x} value={x}>
                      {LABELS.profitMode[x][locale]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label={t.value}>
              <Input dir="ltr" inputMode="decimal" className="num" placeholder="15" value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ''))} />
            </FormField>
          </div>
        )}
        <dl className={`grid grid-cols-2 gap-3 rounded-field bg-surface-raised p-3 ${isExample ? 'opacity-70' : ''}`} aria-live="polite">
          <div>
            <dt className="text-xs text-muted">{t.profit}</dt>
            <dd className="num mt-1 font-medium">{result ? f.number(result.profit, { maximumFractionDigits: 2 }) : '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{t.price}</dt>
            <dd className="num mt-1 text-lg font-semibold text-primary">{result ? f.number(result.price, { maximumFractionDigits: 2 }) : '—'}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function RuleDialog({ rule, services, onClose }: { rule: ProfitRule | null; services: Service[]; onClose: () => void }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const { locale } = useLocale();
  const name = useName();
  const invalidate = useInvalidate();
  const schema = useMemo(
    () =>
      z.object({
        serviceId: z.string().min(1, { error: t.required }),
        companyId: z.string(),
        mode: z.enum(PROFIT_MODES),
        value: z.string().trim().regex(/^\d{1,10}(\.\d{1,2})?$/, { error: t.valueInvalid }),
      }),
    [t],
  );
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      serviceId: rule?.serviceId ?? '',
      companyId: rule?.companyId ?? SERVICE_RULE,
      mode: rule?.mode ?? 'PERCENT',
      value: rule ? String(Number(rule.value)) : '',
    },
  });
  const serviceId = useWatch({ control: form.control, name: 'serviceId' });
  const mode = useWatch({ control: form.control, name: 'mode' });
  const companies = useList<Company>('/companies', { serviceId, pageSize: 100, sort: 'name', order: 'asc' }, { enabled: !!serviceId });

  const save = useApiMutation(
    (v: Values) =>
      api.put<ProfitRule>('/profit-rules', {
        serviceId: v.serviceId,
        companyId: v.companyId === SERVICE_RULE ? undefined : v.companyId,
        mode: v.mode,
        value: Number(v.value),
      }),
    {
      success: t.ruleSaved,
      onSuccess: async () => {
        await invalidate('/profit-rules', '/companies');
        onClose();
      },
    },
  );
  const errors = form.formState.errors;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{rule ? t.editRule : t.newRule}</DialogTitle>
          <DialogDescription>{t.ruleHint}</DialogDescription>
        </DialogHeader>
        <form id="rule-form" onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid gap-4 sm:grid-cols-2" noValidate>
          <FormField label={t.service} error={errors.serviceId?.message} required>
            <Controller
              control={form.control}
              name="serviceId"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  disabled={!!rule}
                  onValueChange={(v) => {
                    field.onChange(v);
                    form.setValue('companyId', SERVICE_RULE);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {services
                      .filter((x) => x.isActive || x.id === rule?.serviceId)
                      .map((x) => (
                        <SelectItem key={x.id} value={x.id}>
                          {name(x)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label={t.company}>
            <Controller
              control={form.control}
              name="companyId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!!rule || !serviceId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SERVICE_RULE}>{t.allCompanies}</SelectItem>
                    {(companies.data?.data ?? []).map((x) => (
                      <SelectItem key={x.id} value={x.id}>
                        {x.name}
                      </SelectItem>
                    ))}
                    {rule?.company && !companies.data?.data.some((x) => x.id === rule.company?.id) && <SelectItem value={rule.company.id}>{rule.company.name}</SelectItem>}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label={t.mode} required>
            <Controller
              control={form.control}
              name="mode"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROFIT_MODES.map((x) => (
                      <SelectItem key={x} value={x}>
                        {LABELS.profitMode[x][locale]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label={`${t.value}${mode === 'PERCENT' ? ' (%)' : ''}`} error={errors.value?.message} required>
            <Input dir="ltr" inputMode="decimal" className="num" {...form.register('value')} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {c.cancel}
          </Button>
          <Button type="submit" form="rule-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />} {c.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
