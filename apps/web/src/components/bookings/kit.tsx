'use client';

/*
 * Small building blocks shared by the bookings, customers and payments modules
 * (RTL-safe search field, localized pager, error / forbidden / loading states, key-value rows).
 */

import { ChevronLeft, ChevronRight, CloudOff, Lock, Phone, RotateCw, Search, X } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { fieldBase } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { errorMessage } from '@/lib/api';
import { common } from '@/lib/i18n/common';
import { defineMessages, fmt, useMessages } from '@/lib/i18n';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';

const m = defineMessages({
  ar: {
    showing: 'عرض {from}–{to} من {total}',
    pageOf: 'صفحة {page} من {pages}',
    clear: 'مسح البحث',
    whatsapp: 'واتساب',
    call: 'اتصال',
  },
  en: {
    showing: 'Showing {from}–{to} of {total}',
    pageOf: 'Page {page} of {pages}',
    clear: 'Clear search',
    whatsapp: 'WhatsApp',
    call: 'Call',
  },
});

/** Search box with the icon on the logical start side (mirrors in RTL). */
export function SearchField({
  value,
  onChange,
  placeholder,
  className,
  autoFocus,
  'aria-label': ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
  autoFocus?: boolean;
  'aria-label'?: string;
}) {
  const t = useMessages(m);
  return (
    <div className={cn('relative', className)}>
      <Search aria-hidden className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className={cn(fieldBase, 'h-11 ps-10 pe-10 [&::-webkit-search-cancel-button]:hidden')}
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

/** Localized pagination footer for `{ meta }` from the API (1-based pages). */
export function Pager({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  loading,
}: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  loading?: boolean;
}) {
  const t = useMessages(m);
  const c = useMessages(common);
  const f = useFormat();
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pages = Math.max(totalPages, 1);
  return (
    <nav aria-label={c.page} className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-[13px] text-muted">
      <p className="num" aria-live="polite">
        {fmt(t.showing, { from: f.number(from), to: f.number(to), total: f.number(total) })}
      </p>
      <div className="flex items-center gap-3">
        <span className="num hidden sm:inline">{fmt(t.pageOf, { page: f.number(page), pages: f.number(pages) })}</span>
        <div className="flex gap-1.5">
          <Button variant="secondary" size="icon-sm" aria-label={c.previous} disabled={loading || page <= 1} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft className="rtl-flip" />
          </Button>
          <Button variant="secondary" size="icon-sm" aria-label={c.next} disabled={loading || page >= pages} onClick={() => onPageChange(page + 1)}>
            <ChevronRight className="rtl-flip" />
          </Button>
        </div>
      </div>
    </nav>
  );
}

export function QueryError({ error, onRetry, size = 'md' }: { error: unknown; onRetry: () => void; size?: 'sm' | 'md' }) {
  const c = useMessages(common);
  const msg = errorMessage(error);
  return (
    <EmptyState
      size={size}
      icon={CloudOff}
      title={c.errorTitle}
      description={msg === 'NETWORK' ? c.networkError : msg || c.errorBody}
      action={
        <Button variant="secondary" onClick={onRetry}>
          <RotateCw /> {c.retry}
        </Button>
      }
    />
  );
}

export function Forbidden() {
  const c = useMessages(common);
  return <EmptyState icon={Lock} title={c.forbiddenTitle} description={c.forbiddenBody} />;
}

/** Generic detail-page skeleton. */
export function DetailSkeleton() {
  return (
    <div className="grid gap-6" aria-busy>
      <div className="grid gap-3">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-10 w-72 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <Skeleton className="h-44 rounded-card" />
        <Skeleton className="h-44 rounded-card" />
        <Skeleton className="h-44 rounded-card" />
      </div>
      <Skeleton className="h-64 rounded-card" />
    </div>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="grid gap-2" aria-busy>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-14 rounded-tile" style={{ opacity: 1 - i * 0.12 }} />
      ))}
    </div>
  );
}

/** Label/value line for cards. */
export function Field({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('grid gap-0.5', className)}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

/** Uppercase section title used inside the glass panel. */
export function SectionTitle({ children, aside, className }: { children: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-2', className)}>
      <h2 className="font-display text-[15px] font-normal tracking-[0.14em] text-foreground uppercase">{children}</h2>
      {aside}
    </div>
  );
}

/** Text that must stay left-to-right inside Arabic (references, phones, codes). */
export function Ltr({ className, ...props }: ComponentProps<'span'>) {
  return <span className={cn('ltr-nums', className)} {...props} />;
}

/** Money in its own currency, tabular, never wrapped. */
export function Money({ value, currency, className }: { value: string | number | null | undefined; currency: string; className?: string }) {
  const f = useFormat();
  return <span className={cn('num whitespace-nowrap', className)}>{f.money(value, currency)}</span>;
}

/** wa.me needs digits only (international format without +). */
export const whatsappHref = (phone: string) => `https://wa.me/${phone.replace(/\D/g, '')}`;
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

/** Call + WhatsApp buttons for a phone number. */
export function ContactActions({ phone, size = 'sm' }: { phone: string; size?: 'xs' | 'sm' }) {
  const t = useMessages(m);
  return (
    <div className="flex flex-wrap gap-1.5">
      <Button asChild variant="secondary" size={size}>
        <a href={telHref(phone)}>
          <Phone /> {t.call}
        </a>
      </Button>
      <Button asChild variant="secondary" size={size}>
        <a href={whatsappHref(phone)} target="_blank" rel="noreferrer">
          <WhatsAppGlyph /> {t.whatsapp}
        </a>
      </Button>
    </div>
  );
}

function WhatsAppGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="text-success">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.8-1.2.2-.6.2-1.1.1-1.2l-.4-.2Z" />
    </svg>
  );
}

/** Small "label / value" money row for money panels. */
export function MoneyRow({ label, value, currency, tone, strong }: { label: ReactNode; value: string | number; currency: string; tone?: 'danger' | 'muted'; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className={cn('text-sm', strong ? 'font-medium text-foreground' : 'text-muted')}>{label}</span>
      <Money
        value={value}
        currency={currency}
        className={cn(
          strong ? 'text-lg font-medium' : 'text-sm',
          tone === 'danger' && 'text-danger',
          tone === 'muted' && 'text-muted',
        )}
      />
    </div>
  );
}
