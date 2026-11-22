'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { LABELS } from '@travelos/shared';
import type { BookingStatus, TripStatus, TripType } from '@travelos/shared';
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
        sm: 'h-5 px-2 text-[11px]',
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
  trip: { DRAFT: 'neutral', OPEN: 'primary', REGISTRATION_CLOSED: 'warning', APPROVED: 'success', COMPLETED: 'info', CANCELLED: 'danger' },
  booking: { PENDING: 'warning', CONFIRMED: 'success', WAITING_LIST: 'info', CANCELLED: 'danger' },
  tripType: { VIP: 'ink', STANDARD: 'neutral' },
} satisfies Record<string, Record<string, BadgeTone>>;

type StatusBadgeProps = Omit<BadgeProps, 'tone' | 'children'> &
  (
    | { kind: 'trip'; status: TripStatus }
    | { kind: 'booking'; status: BookingStatus }
    | { kind: 'tripType'; status: TripType }
  );

const LABEL_KEY = { trip: 'tripStatus', booking: 'bookingStatus', tripType: 'tripType' } as const;

/** <StatusBadge kind="booking" status="CONFIRMED" /> — the label follows the UI language. */
export function StatusBadge({ kind, status, dot = true, ...props }: StatusBadgeProps) {
  const { locale } = useLocale();
  const tones: Record<string, BadgeTone> = TONES[kind];
  const labels: Record<string, { ar: string; en: string }> = LABELS[LABEL_KEY[kind]];
  return (
    <Badge tone={tones[status] ?? 'neutral'} dot={kind !== 'tripType' && dot} {...props}>
      {labels[status]?.[locale] ?? status}
    </Badge>
  );
}
