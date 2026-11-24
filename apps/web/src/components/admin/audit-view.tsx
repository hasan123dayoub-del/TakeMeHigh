'use client';

/*
 * Audit log (AUD-03): the append-only trail of who did what and when. Rows open a dialog with
 * the recorded before/after changes and the IP address.
 */
import { useMemo, useState } from 'react';
import { FilterSelect, ResourceTable, type ResourceColumn } from '@/components/data/resource-table';
import { Field } from '@/components/data/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { defineMessages, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import type { AuditEntry } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';

const ACTION_PREFIXES = ['auth.', 'booking.', 'payment.', 'trip.', 'program.', 'offer.', 'user.', 'role.', 'integration.', 'settings.'] as const;
const ENTITY_TYPES = [
  'user',
  'role',
  'branch',
  'country',
  'city',
  'category',
  'service',
  'company',
  'company_item',
  'profit_rule',
  'integration',
  'trip',
  'program',
  'offer',
  'customer',
  'booking',
  'payment',
  'visa',
  'request',
  'slide',
  'achievement',
  'policy',
  'settings',
] as const;

const m = defineMessages({
  ar: {
    eyebrow: 'الإدارة',
    title: 'سجل التدقيق',
    description: 'سجل لا يُعدَّل ولا يُحذف لكل عملية حساسة: من فعلها ومتى ومن أي عنوان. اضغط على أي سطر لعرض التغييرات قبل وبعد.',
    time: 'الوقت',
    user: 'المستخدم',
    system: 'النظام',
    action: 'العملية',
    entity: 'الكيان',
    summary: 'الوصف',
    actionFilter: 'العملية',
    entityFilter: 'الكيان',
    from: 'من',
    to: 'إلى',
    search: 'ابحث في الوصف أو العملية أو اسم المستخدم…',
    empty: 'لا توجد عمليات مطابقة',
    emptyBody: 'غيّر عوامل التصفية أو مدة البحث.',
    detailsTitle: 'تفاصيل العملية',
    ip: 'عنوان IP',
    entityId: 'معرّف الكيان',
    changes: 'التغييرات',
    before: 'قبل',
    after: 'بعد',
    noChanges: 'لم تُسجَّل تغييرات تفصيلية لهذه العملية.',
  },
  en: {
    eyebrow: 'Administration',
    title: 'Audit log',
    description: 'An append-only record of every sensitive operation: who did it, when and from where. Click a row to see the changes before and after.',
    time: 'Time',
    user: 'User',
    system: 'System',
    action: 'Action',
    entity: 'Entity',
    summary: 'Summary',
    actionFilter: 'Action',
    entityFilter: 'Entity',
    from: 'From',
    to: 'To',
    search: 'Search summary, action or user name…',
    empty: 'No matching operations',
    emptyBody: 'Change the filters or the date range.',
    detailsTitle: 'Operation details',
    ip: 'IP address',
    entityId: 'Entity id',
    changes: 'Changes',
    before: 'Before',
    after: 'After',
    noChanges: 'No detailed changes were recorded for this operation.',
  },
});

/** `changes` is either { before, after } or any JSON value. */
function splitChanges(changes: unknown): { before?: unknown; after?: unknown; other?: unknown } | null {
  if (changes === null || changes === undefined) return null;
  if (typeof changes === 'object' && !Array.isArray(changes) && ('before' in changes || 'after' in changes)) {
    const c = changes as { before?: unknown; after?: unknown };
    return { before: c.before, after: c.after };
  }
  return { other: changes };
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      <pre dir="ltr" className="max-h-72 overflow-auto rounded-[12px] border border-border bg-surface p-3 text-start font-mono text-[12px] leading-relaxed whitespace-pre-wrap break-all">
        {value === undefined ? '—' : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

export function AuditView() {
  const t = useMessages(m);
  const c = useMessages(common);
  const f = useFormat();
  const [open, setOpen] = useState<AuditEntry | null>(null);

  const columns = useMemo<ResourceColumn<AuditEntry>[]>(
    () => [
      { id: 'time', header: t.time, sortKey: 'createdAt', cell: (r) => <span className="num text-[13px] whitespace-nowrap">{f.date(r.createdAt, 'dateTime')}</span>, print: (r) => f.date(r.createdAt, 'dateTime') },
      {
        id: 'user',
        header: t.user,
        cell: (r) => (r.user ? <span className="font-medium">{r.user.fullName}</span> : <span className="text-muted">{t.system}</span>),
        print: (r) => r.user?.fullName ?? t.system,
      },
      {
        id: 'action',
        header: t.action,
        cell: (r) => (
          <code dir="ltr" className="font-mono text-[12px] text-muted">
            {r.action}
          </code>
        ),
        print: (r) => r.action,
      },
      {
        id: 'entity',
        header: t.entity,
        cell: (r) => (
          <Badge size="sm" shape="rounded" className="font-mono">
            {r.entityType}
          </Badge>
        ),
        print: (r) => r.entityType,
      },
      { id: 'summary', header: t.summary, className: 'max-w-[420px]', cell: (r) => <span className="line-clamp-2 text-[13px]">{r.summary}</span>, print: (r) => r.summary },
    ],
    [t, f],
  );

  const parts = open ? splitChanges(open.changes) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <ResourceTable<AuditEntry>
        endpoint="/audit-logs"
        columns={columns}
        exportTitle={t.title}
        searchPlaceholder={t.search}
        filterKeys={['action', 'entityType', 'from', 'to']}
        defaultSort={{ key: 'createdAt', order: 'desc' }}
        filters={(fl, set) => (
          <>
            <FilterSelect label={t.actionFilter} value={fl.action} onChange={(v) => set({ action: v })} options={ACTION_PREFIXES.map((p) => ({ value: p, label: `${p}*` }))} />
            <FilterSelect label={t.entityFilter} value={fl.entityType} onChange={(v) => set({ entityType: v })} options={ENTITY_TYPES.map((e) => ({ value: e, label: e }))} />
            <label className="flex items-center gap-1.5 text-[13px] text-subtle">
              {t.from}
              <Input
                type="date"
                dir="ltr"
                aria-label={t.from}
                className="h-10 w-[150px] rounded-full"
                value={fl.from?.slice(0, 10) ?? ''}
                max={fl.to?.slice(0, 10)}
                // the day starts at local midnight
                onChange={(e) => set({ from: e.target.value ? `${e.target.value}T00:00:00` : undefined })}
              />
            </label>
            <label className="flex items-center gap-1.5 text-[13px] text-subtle">
              {t.to}
              <Input
                type="date"
                dir="ltr"
                aria-label={t.to}
                className="h-10 w-[150px] rounded-full"
                value={fl.to?.slice(0, 10) ?? ''}
                min={fl.from?.slice(0, 10)}
                // include the whole last day
                onChange={(e) => set({ to: e.target.value ? `${e.target.value}T23:59:59.999` : undefined })}
              />
            </label>
          </>
        )}
        onRowClick={setOpen}
        getRowId={(r) => r.id}
        empty={{ title: t.empty, description: t.emptyBody }}
        minWidth={900}
      />

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t.detailsTitle}</DialogTitle>
            <DialogDescription>{open?.summary}</DialogDescription>
          </DialogHeader>
          {open && (
            <div className="flex flex-col gap-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label={t.time}>
                  <span className="num">{f.date(open.createdAt, 'dateTime')}</span>
                </Field>
                <Field label={t.user}>{open.user ? `${open.user.fullName}` : t.system}</Field>
                <Field label={t.ip}>
                  <span className="ltr-nums" dir="ltr">
                    {open.ip ?? '—'}
                  </span>
                </Field>
                <Field label={t.action}>
                  <code dir="ltr" className="font-mono text-[13px]">
                    {open.action}
                  </code>
                </Field>
                <Field label={t.entity}>
                  <code dir="ltr" className="font-mono text-[13px]">
                    {open.entityType}
                  </code>
                </Field>
                <Field label={t.entityId}>
                  <code dir="ltr" className="font-mono text-[11px] break-all text-muted">
                    {open.entityId ?? '—'}
                  </code>
                </Field>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">{t.changes}</span>
                {!parts ? (
                  <p className="text-sm text-muted">{t.noChanges}</p>
                ) : parts.other !== undefined ? (
                  <JsonBlock label={t.changes} value={parts.other} />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <JsonBlock label={t.before} value={parts.before} />
                    <JsonBlock label={t.after} value={parts.after} />
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(null)}>
              {c.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
