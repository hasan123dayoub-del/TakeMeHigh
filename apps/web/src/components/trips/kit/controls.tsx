'use client';

import { ArrowLeft, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { fieldBase } from '@/components/ui/input';
import { common, defineMessages, fmt, useMessages } from '@/lib/i18n';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';

const m = defineMessages({
  ar: { showing: '{from}–{to} من {total}', clear: 'مسح البحث' },
  en: { showing: '{from}–{to} of {total}', clear: 'Clear search' },
});

/** Debounced copy of a value (search boxes). */
export function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/** Search box with the icon on the start side (mirrors in Arabic). */
export function SearchField({
  value,
  onChange,
  placeholder,
  className,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  label: string;
}) {
  const t = useMessages(m);
  return (
    <div className={cn('relative w-full sm:w-72', className)}>
      <Search aria-hidden className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className={cn(fieldBase, 'h-10 ps-10 pe-9 [&::-webkit-search-cancel-button]:hidden')}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={t.clear}
          className="absolute end-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-surface hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

/** Localised pagination footer for `{ meta: { page, pageSize, total, totalPages } }`. */
export function Pager({
  meta,
  onPage,
  loading,
}: {
  meta: { page: number; pageSize: number; total: number; totalPages: number } | undefined;
  onPage: (page: number) => void;
  loading?: boolean;
}) {
  const t = useMessages(m);
  const c = useMessages(common);
  const f = useFormat();
  if (!meta || meta.total === 0) return null;
  const from = (meta.page - 1) * meta.pageSize + 1;
  const to = Math.min(meta.page * meta.pageSize, meta.total);
  const pages = Math.max(meta.totalPages, 1);
  return (
    <nav aria-label={c.page} className="flex items-center justify-between gap-3 border-t border-border pt-4 text-[13px] text-muted">
      <p className="num" aria-live="polite">
        {fmt(t.showing, { from: f.number(from), to: f.number(to), total: f.number(meta.total) })}
      </p>
      <div className="flex items-center gap-3">
        <span className="num hidden sm:inline">
          {c.page} {f.number(meta.page)} {c.of} {f.number(pages)}
        </span>
        <div className="flex gap-1.5">
          <Button variant="secondary" size="icon-sm" aria-label={c.previous} disabled={loading || meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
            <ChevronLeft className="rtl-flip" />
          </Button>
          <Button variant="secondary" size="icon-sm" aria-label={c.next} disabled={loading || meta.page >= pages} onClick={() => onPage(meta.page + 1)}>
            <ChevronRight className="rtl-flip" />
          </Button>
        </div>
      </div>
    </nav>
  );
}

/** Accessible on/off switch (role="switch"); the knob travels toward the end side. */
export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled,
  id,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50',
        checked ? 'border-primary bg-primary' : 'border-border-strong bg-surface-sunken',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute top-0.5 size-[18px] rounded-full bg-white shadow-card transition-[inset-inline-start] duration-200 ease-out-soft',
          checked ? 'start-[22px]' : 'start-0.5',
        )}
      />
    </button>
  );
}

/** "← Trips" link above a detail page title. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-full text-xs font-medium tracking-[0.16em] text-muted uppercase transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
    >
      <ArrowLeft className="rtl-flip size-3.5" aria-hidden />
      {children}
    </Link>
  );
}

/** Label/value pair for detail headers and summaries. */
export function MetaItem({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-[11px] font-medium tracking-[0.14em] text-muted uppercase">{label}</dt>
      <dd className="mt-1 truncate text-sm text-foreground">{children}</dd>
    </div>
  );
}
