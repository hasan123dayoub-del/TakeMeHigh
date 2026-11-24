'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { LABELS } from '@travelos/shared';
import type { ComponentProps } from 'react';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/*
 * Tinted badge: 14% tone fill, 22% tone ring, text = 72% tone mixed into the
 * body text colour so it stays readable (AA) in both themes.
 */
export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 whitespace-nowrap font-medium leading-none ring-1 ring-inset',
  {
    variants: {
      tone: {
        neutral:
          'bg-neutral/12 text-[color-mix(in_srgb,var(--neutral)_60%,var(--text))] ring-neutral/20 [--dot:var(--neutral)]',
        primary:
          'bg-primary/12 text-[color-mix(in_srgb,var(--primary)_72%,var(--text))] ring-primary/22 [--dot:var(--primary)]',
        info: 'bg-info/12 text-[color-mix(in_srgb,var(--info)_72%,var(--text))] ring-info/22 [--dot:var(--info)]',
        success:
          'bg-success/14 text-[color-mix(in_srgb,var(--success)_72%,var(--text))] ring-success/22 [--dot:var(--success)]',
        warning:
          'bg-warning/14 text-[color-mix(in_srgb,var(--warning)_72%,var(--text))] ring-warning/24 [--dot:var(--warning)]',
        danger:
          'bg-danger/12 text-[color-mix(in_srgb,var(--danger)_72%,var(--text))] ring-danger/22 [--dot:var(--danger)]',
        ink: 'bg-ink text-ink-foreground ring-ink [--dot:var(--ink-foreground)]',
      },
      size: {
        sm: 'h-5 px-2 text-[12px]',
        md: 'h-6 px-2.5 text-xs',
      },
      shape: {
        pill: 'rounded-full',
        rounded: 'rounded-[6px]',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'md', shape: 'pill' },
  },
);

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>['tone']>;

export type BadgeProps = ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & {
    /** Leading status dot. */
    dot?: boolean;
  };

export function Badge({
  className,
  tone,
  size,
  shape,
  dot = false,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ tone, size, shape }), className)}
      {...props}
    >
      {dot && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-(--dot)" />}
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Domain status badges (statuses and Arabic/English labels from @travelos/shared)
// ---------------------------------------------------------------------------

const TONES = {
  product: { DRAFT: 'neutral', OPEN: 'primary', CLOSED: 'warning', CONFIRMED: 'success', COMPLETED: 'info', CANCELLED: 'danger' },
  booking: { PENDING: 'warning', CONFIRMED: 'success', WAITLIST: 'info', CANCELLED: 'danger' },
  paymentState: { UNPAID: 'danger', PARTIAL: 'warning', PAID: 'success' },
  paymentKind: { PARTIAL: 'warning', FULL: 'success', REFUND: 'danger' },
  visa: { NOT_STARTED: 'neutral', SUBMITTED: 'info', APPROVED: 'success', REJECTED: 'danger' },
  request: { NEW: 'primary', CONTACTED: 'info', CONVERTED: 'success', REJECTED: 'neutral' },
  integration: { NOT_CONFIGURED: 'neutral', ACTIVE: 'success', ERROR: 'danger', DISABLED: 'neutral' },
  offerKind: { BUNDLE: 'ink', DISCOUNT: 'primary' },
  scope: { DOMESTIC: 'neutral', INTERNATIONAL: 'info' },
} satisfies Record<string, Record<string, BadgeTone>>;

const LABEL_KEY = {
  product: 'productStatus',
  booking: 'bookingStatus',
  paymentState: 'paymentState',
  paymentKind: 'paymentKind',
  visa: 'visaStatus',
  request: 'requestStatus',
  integration: 'integrationStatus',
  offerKind: 'offerKind',
  scope: 'travelScope',
} as const;

export type StatusKind = keyof typeof TONES;

type StatusBadgeProps = Omit<BadgeProps, 'tone' | 'children'> & { kind: StatusKind; status: string };

/** <StatusBadge kind="booking" status="CONFIRMED" /> — the label follows the UI language. */
export function StatusBadge({ kind, status, dot = true, ...props }: StatusBadgeProps) {
  const { locale } = useLocale();
  const tones: Record<string, BadgeTone> = TONES[kind];
  const labels: Record<string, { ar: string; en: string }> = LABELS[LABEL_KEY[kind]];
  return (
    <Badge tone={tones[status] ?? 'neutral'} dot={kind !== 'offerKind' && kind !== 'scope' && dot} {...props}>
      {labels[status]?.[locale] ?? status}
    </Badge>
  );
}
