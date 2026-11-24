'use client';

import { defineMessages, useMessages } from '@/lib/i18n';

const m = defineMessages({ ar: { from: 'من', to: 'إلى' }, en: { from: 'From', to: 'To' } });

/**
 * From / to date filter for list toolbars. `to` is stored as the end of that day so the API's
 * `lte` keeps the whole day.
 */
export function DateRange({ from, to, onChange }: { from?: string; to?: string; onChange: (patch: { from?: string; to?: string }) => void }) {
  const t = useMessages(m);
  const cls =
    'h-10 rounded-full border border-border bg-surface-raised px-3 text-[13px] text-foreground shadow-card outline-none hover:border-border-strong focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/20';
  return (
    <div className="flex items-center gap-1.5">
      <label className="flex items-center gap-1.5 text-[13px] text-subtle">
        {t.from}
        <input type="date" dir="ltr" className={cls} value={from?.slice(0, 10) ?? ''} onChange={(e) => onChange({ from: e.target.value || undefined })} aria-label={t.from} />
      </label>
      <label className="flex items-center gap-1.5 text-[13px] text-subtle">
        {t.to}
        <input
          type="date"
          dir="ltr"
          className={cls}
          value={to?.slice(0, 10) ?? ''}
          onChange={(e) => onChange({ to: e.target.value ? `${e.target.value}T23:59:59` : undefined })}
          aria-label={t.to}
        />
      </label>
    </div>
  );
}
