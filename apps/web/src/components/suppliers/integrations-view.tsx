'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { LABELS } from '@travelos/shared';
import { Activity, FlaskConical, KeyRound, Loader2, Plug, Power, RefreshCw, ScrollText, Settings2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { ConfirmDialog } from '@/components/data/confirm-dialog';
import { ResourceTable, type ResourceColumn } from '@/components/data/resource-table';
import { Field, QueryState } from '@/components/data/states';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { API_URL, api, errorMessage } from '@/lib/api';
import { useApiMutation, useInvalidate, useResource } from '@/lib/hooks';
import { defineMessages, fmt, useLocale, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import type { IntegrationRow, SyncLog } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';
import { supplierMessages, type Adapter, type SyncResult, type TestResult } from './shared';

const m = defineMessages({
  ar: {
    eyebrow: 'الموردون',
    title: 'التكامل مع الموردين',
    description: 'ربط الفنادق وشركات النقل والمطاعم بمنصاتها لسحب الكلف تلقائياً.',
    how: 'كيف يعمل التكامل؟',
    how1: 'تُسحب الكلف والتوفر من منصة كل مورّد تلقائياً كل N ساعة، ويمكن طلب «مزامنة الآن» في أي وقت (INT-01، INT-04).',
    how2: 'بيانات الدخول (مفتاح API) تُخزَّن مشفّرة ولا تُعرض أبداً؛ اترك الحقل فارغاً للإبقاء على المفتاح الحالي (INT-03).',
    how3: 'إذا فشلت المزامنة تبقى آخر كلف معروفة، وتُعلَّم «قديمة» بعد 24 ساعة، وتُعاد المحاولة تلقائياً (INT-06).',
    how4: 'الرحلات المفتوحة التي تغيّرت كلف بنودها تُعلَّم ليقبل المدير الكلف الجديدة؛ الحجوزات المؤكدة لا تتغيّر (INT-07).',
    sandbox: 'حالياً يُستخدم «المورّد التجريبي» المدمج في النظام إلى أن تصل وثائق واجهات المورّدين الحقيقية (TBD-02).',
    adapter: 'المحوّل',
    baseUrl: 'عنوان المنصة',
    interval: 'المزامنة كل',
    hours: 'ساعة',
    lastSync: 'آخر مزامنة',
    lastSuccess: 'آخر نجاح',
    failures: 'محاولات فاشلة متتالية',
    lastError: 'آخر خطأ',
    itemsSynced: 'بنود من التكامل',
    notConfigured: 'لم يُعدّ الربط بعد. البنود تُدخل يدوياً.',
    keySaved: 'مفتاح محفوظ',
    noKey: 'بدون مفتاح',
    configure: 'إعداد',
    test: 'اختبار الاتصال',
    sync: 'مزامنة الآن',
    logs: 'السجل',
    enable: 'تفعيل',
    disable: 'تعطيل',
    disableTitle: 'تعطيل التكامل؟',
    disableBody: 'تتوقف المزامنة التلقائية واليدوية. تبقى البنود وكلفها الأخيرة كما هي.',
    enableTitle: 'تفعيل التكامل؟',
    enableBody: 'تعود المزامنة التلقائية حسب الفاصل الزمني المحدد.',
    enabled: 'تم تفعيل التكامل',
    disabled: 'تم تعطيل التكامل',
    testOk: 'الاتصال يعمل',
    testFailed: 'فشل الاتصال',
    syncOk: 'تمت المزامنة: {created} جديد، {updated} محدَّث، {changes} تغيّر في الكلفة',
    syncProblems: 'ملاحظات المزامنة',
    syncFailed: 'فشلت المزامنة',
    configTitle: 'إعداد الربط',
    configHint: 'اختر المحوّل المناسب لنوع الشركة وعنوان منصتها. المفتاح يُشفَّر ولا يُعرض بعد الحفظ.',
    apiKey: 'مفتاح API',
    apiKeyHint: 'اتركه فارغاً للإبقاء على المفتاح الحالي.',
    apiKeyNew: 'مطلوب للمنصات التي تتطلب مصادقة.',
    sandboxHint: 'للمورّد التجريبي: {url}',
    intervalHint: 'من 1 إلى 168 ساعة (أسبوع).',
    required: 'هذا الحقل مطلوب',
    urlInvalid: 'أدخل عنواناً يبدأ بـ http:// أو https://',
    intervalInvalid: 'من 1 إلى 168',
    keyShort: '4 أحرف على الأقل',
    saved: 'تم حفظ إعداد الربط',
    logsTitle: 'سجل المزامنة',
    time: 'الوقت',
    trigger: 'المصدر',
    scheduled: 'تلقائية',
    manual: 'يدوية',
    result: 'النتيجة',
    success: 'نجحت',
    failed: 'فشلت',
    created: 'جديد',
    updated: 'محدَّث',
    costChanges: 'تغيّر الكلفة',
    error: 'الخطأ / الملاحظات',
    emptyLogs: 'لا توجد مزامنات بعد',
    empty: 'لا توجد شركات فنادق أو نقل أو مطاعم',
    emptyBody: 'أضف الشركات أولاً من صفحة الشركات.',
    openCompany: 'فتح الشركة',
  },
  en: {
    eyebrow: 'Suppliers',
    title: 'Supplier integrations',
    description: 'Connect hotels, transport companies and restaurants to their platforms to pull costs automatically.',
    how: 'How integration works',
    how1: 'Costs and availability are pulled from each supplier platform automatically every N hours, and you can “Sync now” at any time (INT-01, INT-04).',
    how2: 'Credentials (API key) are stored encrypted and never shown; leave the field empty to keep the current key (INT-03).',
    how3: 'If a sync fails, the last known costs stay, are flagged outdated after 24 hours, and the sync is retried automatically (INT-06).',
    how4: 'Open trips whose item costs changed are flagged for the Admin to accept the new costs; confirmed bookings never change (INT-07).',
    sandbox: 'For now the built-in sandbox supplier is used until the real supplier API documentation arrives (TBD-02).',
    adapter: 'Adapter',
    baseUrl: 'Platform URL',
    interval: 'Sync every',
    hours: 'hours',
    lastSync: 'Last sync',
    lastSuccess: 'Last success',
    failures: 'Consecutive failures',
    lastError: 'Last error',
    itemsSynced: 'Integration items',
    notConfigured: 'Not connected yet. Items are entered by hand.',
    keySaved: 'Key saved',
    noKey: 'No key',
    configure: 'Configure',
    test: 'Test connection',
    sync: 'Sync now',
    logs: 'Logs',
    enable: 'Enable',
    disable: 'Disable',
    disableTitle: 'Disable this integration?',
    disableBody: 'Automatic and manual syncs stop. Items keep their last costs.',
    enableTitle: 'Enable this integration?',
    enableBody: 'Automatic syncs resume at the configured interval.',
    enabled: 'Integration enabled',
    disabled: 'Integration disabled',
    testOk: 'Connection works',
    testFailed: 'Connection failed',
    syncOk: 'Synced: {created} new, {updated} updated, {changes} cost changes',
    syncProblems: 'Sync notes',
    syncFailed: 'Sync failed',
    configTitle: 'Configure connection',
    configHint: 'Pick the adapter for the company type and its platform URL. The key is encrypted and never shown after saving.',
    apiKey: 'API key',
    apiKeyHint: 'Leave empty to keep the current key.',
    apiKeyNew: 'Needed for platforms that require authentication.',
    sandboxHint: 'Sandbox supplier: {url}',
    intervalHint: '1 to 168 hours (one week).',
    required: 'This field is required',
    urlInvalid: 'Enter a URL starting with http:// or https://',
    intervalInvalid: '1 to 168',
    keyShort: 'At least 4 characters',
    saved: 'Connection saved',
    logsTitle: 'Sync log',
    time: 'Time',
    trigger: 'Trigger',
    scheduled: 'Scheduled',
    manual: 'Manual',
    result: 'Result',
    success: 'Success',
    failed: 'Failed',
    created: 'New',
    updated: 'Updated',
    costChanges: 'Cost changes',
    error: 'Error / notes',
    emptyLogs: 'No syncs yet',
    empty: 'No hotel, transport or restaurant companies',
    emptyBody: 'Add companies first on the Companies page.',
    openCompany: 'Open company',
  },
});

export function IntegrationsView() {
  const t = useMessages(m);
  const list = useResource<IntegrationRow[]>('/integrations');
  const adapters = useResource<Adapter[]>('/integrations/adapters');
  const [configuring, setConfiguring] = useState<IntegrationRow | null>(null);
  const [logsOf, setLogsOf] = useState<IntegrationRow | null>(null);
  const [toggling, setToggling] = useState<IntegrationRow | null>(null);
  const invalidate = useInvalidate();

  const rows = list.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />

      <Card tone="raised">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" aria-hidden /> {t.how}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <ul className="grid gap-2 text-sm text-muted sm:grid-cols-2">
            {[t.how1, t.how2, t.how3, t.how4].map((x) => (
              <li key={x} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                {x}
              </li>
            ))}
          </ul>
          <p className="flex items-start gap-2 rounded-field bg-info/10 p-3 text-sm">
            <FlaskConical className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
            {t.sandbox}
          </p>
        </CardContent>
      </Card>

      <QueryState isLoading={list.isLoading} error={list.error} onRetry={() => list.refetch()}>
        {rows.length === 0 ? (
          <EmptyState icon={Plug} title={t.empty} description={t.emptyBody} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {rows.map((row) => (
              <IntegrationCard key={row.id} row={row} onConfigure={() => setConfiguring(row)} onLogs={() => setLogsOf(row)} onToggle={() => setToggling(row)} />
            ))}
          </div>
        )}
      </QueryState>

      {configuring && <ConfigureDialog row={configuring} adapters={adapters.data ?? []} onClose={() => setConfiguring(null)} />}
      {logsOf && <LogsDialog row={logsOf} onClose={() => setLogsOf(null)} />}

      <ConfirmDialog
        open={!!toggling}
        onOpenChange={(o) => !o && setToggling(null)}
        title={toggling?.integration?.status === 'DISABLED' ? t.enableTitle : t.disableTitle}
        description={toggling?.integration?.status === 'DISABLED' ? t.enableBody : t.disableBody}
        destructive={toggling?.integration?.status !== 'DISABLED'}
        confirmLabel={toggling?.integration?.status === 'DISABLED' ? t.enable : t.disable}
        onConfirm={async () => {
          if (!toggling) return;
          const enable = toggling.integration?.status === 'DISABLED';
          try {
            await api.post(`/integrations/${toggling.id}/enabled`, { enabled: enable });
            toast.success(enable ? t.enabled : t.disabled);
            await invalidate('/integrations', '/companies');
          } catch (e) {
            toast.error(errorMessage(e));
            throw e;
          }
        }}
      />
    </div>
  );
}

function IntegrationCard({ row, onConfigure, onLogs, onToggle }: { row: IntegrationRow; onConfigure: () => void; onLogs: () => void; onToggle: () => void }) {
  const t = useMessages(m);
  const s = useMessages(supplierMessages);
  const { locale } = useLocale();
  const f = useFormat();
  const invalidate = useInvalidate();
  const conn = row.integration;
  const disabled = conn?.status === 'DISABLED';

  const test = useApiMutation(() => api.post<TestResult>(`/integrations/${row.id}/test`), {
    onSuccess: async (r) => {
      if (r.ok) toast.success(t.testOk);
      else toast.error(t.testFailed, { description: r.error });
      await invalidate('/integrations', '/companies');
    },
  });
  const sync = useApiMutation(() => api.post<SyncResult>(`/integrations/${row.id}/sync`), {
    onSuccess: async (r) => {
      if (r.ok) {
        const msg = fmt(t.syncOk, { created: r.created, updated: r.updated, changes: r.costChanges });
        if (r.problems.length) toast.warning(msg, { description: `${t.syncProblems}: ${r.problems.join(' · ')}` });
        else toast.success(msg);
      } else {
        toast.error(t.syncFailed, { description: r.error });
      }
      await invalidate('/integrations', '/companies', '/catalog');
    },
  });

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle className="truncate normal-case">
            <Link href={`/dashboard/companies/${row.id}`} className="hover:text-primary hover:underline">
              {row.name}
            </Link>
          </CardTitle>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
            {LABELS.serviceKind[row.service.kind][locale]}
            {row.transportMode && <Badge size="sm" tone="info">{LABELS.transportMode[row.transportMode][locale]}</Badge>}
            {!row.isActive && <Badge size="sm">{s.inactiveF}</Badge>}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {conn?.hasCredentials && (
            <Badge tone="primary" size="sm">
              <KeyRound className="size-3" aria-hidden /> {t.keySaved}
            </Badge>
          )}
          <StatusBadge kind="integration" status={conn?.status ?? 'NOT_CONFIGURED'} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {conn ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            <Field label={t.adapter}>
              <span className="num text-xs" dir="ltr">
                {conn.adapterKey}
              </span>
            </Field>
            <Field label={t.baseUrl} className="col-span-2">
              <span className="block truncate text-xs font-normal text-muted" dir="ltr" title={conn.baseUrl}>
                {conn.baseUrl}
              </span>
            </Field>
            <Field label={t.interval}>
              <span className="num">{conn.syncIntervalHours}</span> {t.hours}
            </Field>
            <Field label={t.lastSync}>
              <span title={conn.lastSyncAt ? f.date(conn.lastSyncAt, 'dateTime') : undefined}>{conn.lastSyncAt ? f.relative(conn.lastSyncAt) : '—'}</span>
            </Field>
            <Field label={t.lastSuccess}>
              <span title={conn.lastSuccessAt ? f.date(conn.lastSuccessAt, 'dateTime') : undefined}>{conn.lastSuccessAt ? f.relative(conn.lastSuccessAt) : '—'}</span>
            </Field>
            <Field label={t.failures}>
              <span className={`num ${conn.consecutiveFailures ? 'text-danger' : ''}`}>{conn.consecutiveFailures}</span>
            </Field>
            <Field label={t.itemsSynced}>
              <span className="num">{row._count.items}</span>
            </Field>
            {conn.lastError && (
              <Field label={t.lastError} className="col-span-full">
                <span className="font-normal text-danger">{conn.lastError}</span>
              </Field>
            )}
          </dl>
        ) : (
          <p className="text-sm text-muted">{t.notConfigured}</p>
        )}
        <div className="mt-auto flex flex-wrap gap-2 border-t border-border pt-4">
          <Button size="sm" variant="secondary" onClick={onConfigure}>
            <Settings2 /> {t.configure}
          </Button>
          {conn && (
            <>
              <Button size="sm" variant="secondary" onClick={() => test.mutate(undefined)} disabled={test.isPending}>
                {test.isPending ? <Loader2 className="animate-spin" /> : <Activity />} {t.test}
              </Button>
              <Button size="sm" onClick={() => sync.mutate(undefined)} disabled={sync.isPending || disabled}>
                {sync.isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />} {t.sync}
              </Button>
              <Button size="sm" variant="ghost" onClick={onLogs}>
                <ScrollText /> {t.logs}
              </Button>
              <Button size="sm" variant="ghost" onClick={onToggle} className="ms-auto">
                <Power className={disabled ? 'text-success' : 'text-danger'} /> {disabled ? t.enable : t.disable}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ConfigureDialog({ row, adapters, onClose }: { row: IntegrationRow; adapters: Adapter[]; onClose: () => void }) {
  const t = useMessages(m);
  const c = useMessages(common);
  const invalidate = useInvalidate();
  const conn = row.integration;
  const options = adapters.filter((a) => a.kind === row.service.kind);
  const sandboxUrl = `${API_URL}/sandbox/suppliers/${row.service.kind.toLowerCase()}`;

  const schema = useMemo(
    () =>
      z.object({
        adapterKey: z.string().min(1, { error: t.required }),
        baseUrl: z.string().trim().regex(/^https?:\/\/\S+$/, { error: t.urlInvalid }),
        apiKey: z.string().refine((v) => v === '' || v.length >= 4, { error: t.keyShort }),
        syncIntervalHours: z.string().regex(/^\d+$/, { error: t.intervalInvalid }).refine((v) => Number(v) >= 1 && Number(v) <= 168, { error: t.intervalInvalid }),
      }),
    [t],
  );
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      adapterKey: conn?.adapterKey ?? options[0]?.key ?? '',
      baseUrl: conn?.baseUrl ?? '',
      apiKey: '',
      syncIntervalHours: String(conn?.syncIntervalHours ?? 6),
    },
  });
  const save = useApiMutation(
    (v: Values) =>
      api.put(`/integrations/${row.id}`, {
        adapterKey: v.adapterKey,
        baseUrl: v.baseUrl,
        apiKey: v.apiKey || undefined,
        syncIntervalHours: Number(v.syncIntervalHours),
      }),
    {
      success: t.saved,
      onSuccess: async () => {
        await invalidate('/integrations', '/companies');
        onClose();
      },
    },
  );
  const errors = form.formState.errors;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t.configTitle} — {row.name}
          </DialogTitle>
          <DialogDescription>{t.configHint}</DialogDescription>
        </DialogHeader>
        <form id="integration-form" onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid gap-4" noValidate>
          <FormField label={t.adapter} error={errors.adapterKey?.message} required>
            <Controller
              control={form.control}
              name="adapterKey"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((a) => (
                      <SelectItem key={a.key} value={a.key}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField
            label={t.baseUrl}
            error={errors.baseUrl?.message}
            required
            hint={
              <button type="button" className="ltr-nums text-start text-primary hover:underline" onClick={() => form.setValue('baseUrl', sandboxUrl, { shouldValidate: true })}>
                {fmt(t.sandboxHint, { url: sandboxUrl })}
              </button>
            }
          >
            <Input dir="ltr" type="url" placeholder="https://" {...form.register('baseUrl')} autoFocus />
          </FormField>
          <FormField
            label={t.apiKey}
            error={errors.apiKey?.message}
            hint={conn?.hasCredentials ? t.apiKeyHint : t.apiKeyNew}
            labelAside={
              conn?.hasCredentials ? (
                <Badge tone="primary" size="sm">
                  <KeyRound className="size-3" aria-hidden /> {t.keySaved}
                </Badge>
              ) : undefined
            }
          >
            <Input dir="ltr" type="password" autoComplete="new-password" placeholder={conn?.hasCredentials ? '••••••••' : ''} {...form.register('apiKey')} />
          </FormField>
          <FormField label={`${t.interval} (${t.hours})`} error={errors.syncIntervalHours?.message} hint={t.intervalHint} required>
            <Input dir="ltr" type="number" min={1} max={168} className="num" {...form.register('syncIntervalHours')} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {c.cancel}
          </Button>
          <Button type="submit" form="integration-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />} {c.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LogsDialog({ row, onClose }: { row: IntegrationRow; onClose: () => void }) {
  const t = useMessages(m);
  const f = useFormat();
  const columns = useMemo<ResourceColumn<SyncLog>[]>(
    () => [
      { id: 'time', header: t.time, cell: (x) => <span className="num whitespace-nowrap">{f.date(x.startedAt, 'dateTime')}</span>, print: (x) => f.date(x.startedAt, 'dateTime') },
      { id: 'trigger', header: t.trigger, cell: (x) => (x.trigger === 'MANUAL' ? t.manual : t.scheduled) },
      {
        id: 'result',
        header: t.result,
        cell: (x) => (
          <Badge tone={x.result === 'SUCCESS' ? 'success' : 'danger'} dot>
            {x.result === 'SUCCESS' ? t.success : t.failed}
          </Badge>
        ),
        print: (x) => (x.result === 'SUCCESS' ? t.success : t.failed),
      },
      { id: 'created', header: t.created, align: 'end', cell: (x) => <span className="num">{x.itemsCreated}</span> },
      { id: 'updated', header: t.updated, align: 'end', cell: (x) => <span className="num">{x.itemsUpdated}</span> },
      { id: 'costChanges', header: t.costChanges, align: 'end', cell: (x) => <span className={`num ${x.costChanges ? 'font-semibold text-warning' : ''}`}>{x.costChanges}</span> },
      {
        id: 'error',
        header: t.error,
        cell: (x) => (x.error ? <span className={`line-clamp-2 text-xs ${x.result === 'FAILED' ? 'text-danger' : 'text-muted'}`} title={x.error}>{x.error}</span> : '—'),
        print: (x) => x.error ?? '—',
      },
    ],
    [t, f],
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            {t.logsTitle} — {row.name}
          </DialogTitle>
        </DialogHeader>

          <ResourceTable<SyncLog>
            endpoint={`/integrations/${row.id}/logs`}
            columns={columns}
            exportTitle={`${t.logsTitle} — ${row.name}`}
            urlState={false}
            noSearch
            minWidth={820}
            getRowId={(x) => x.id}
            empty={{ title: t.emptyLogs }}
            className="p-0 sm:p-0"
          />
      </DialogContent>
    </Dialog>
  );
}
