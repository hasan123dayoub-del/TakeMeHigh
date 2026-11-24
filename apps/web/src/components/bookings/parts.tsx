'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';

/** Link to whatever a booking is for (trip / program / offer pages are built elsewhere). */
export function targetHref(b: { trip?: { id: string } | null; program?: { id: string } | null; offer?: { id: string } | null }) {
  if (b.trip) return `/dashboard/trips/${b.trip.id}`;
  if (b.program) return `/dashboard/programs/${b.program.id}`;
  if (b.offer) return `/dashboard/offers/${b.offer.id}`;
  return null;
}

export function TargetLink({
  b,
  className,
}: {
  b: { trip?: { id: string; code: string; title: string } | null; program?: { id: string; code: string; title: string } | null; offer?: { id: string; title: string } | null };
  className?: string;
}) {
  const href = targetHref(b);
  const code = b.trip?.code ?? b.program?.code;
  const title = b.trip?.title ?? b.program?.title ?? b.offer?.title ?? '—';
  const body = (
    <>
      {code && <span className="num me-1.5 text-xs text-muted">{code}</span>}
      {title}
    </>
  );
  if (!href) return <span className={className}>{body}</span>;
  return (
    <Link href={href} onClick={(e) => e.stopPropagation()} className={cn('hover:text-primary hover:underline', className)}>
      {body}
    </Link>
  );
}

/** Remaining balance: amber/red while something is owed, green when settled, blue for a credit. */
export function BalanceText({ value, currency, className }: { value: string | number; currency: string; className?: string }) {
  const f = useFormat();
  const n = Number(value);
  return (
    <span
      className={cn(
        'num font-medium whitespace-nowrap',
        n > 0 ? 'text-[color-mix(in_srgb,var(--danger)_80%,var(--text))]' : n < 0 ? 'text-info' : 'text-[color-mix(in_srgb,var(--success)_80%,var(--text))]',
        className,
      )}
    >
      {f.money(value, currency)}
    </span>
  );
}

/** A titled card section used across the detail pages. */
export function Section({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </CardHeader>
      <div className={cn('p-5 pt-4 sm:p-6 sm:pt-4', bodyClassName)}>{children}</div>
    </Card>
  );
}

/** Label: value row for money cards. */
export function MoneyRow({ label, children, strong, className }: { label: ReactNode; children: ReactNode; strong?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3 py-1.5 text-sm', strong && 'border-t border-border pt-3 text-base font-medium', className)}>
      <span className={strong ? '' : 'text-muted'}>{label}</span>
      <span className="num text-end">{children}</span>
    </div>
  );
}

/** Small empty line inside a section. */
export function Muted({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted">{children}</p>;
}
