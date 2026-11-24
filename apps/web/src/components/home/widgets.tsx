'use client';

import {
  AlertTriangle,
  ArrowUpRight,
  BellRing,
  CalendarClock,
  ChevronLeft,
  CircleAlert,
  Coins,
  Gavel,
  Info,
  MessageSquarePlus,
  Plug,
  Stamp,
  Ticket,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useResource } from '@/lib/hooks';
import { defineMessages, fmt, useLocale, useMessages } from '@/lib/i18n';
import type { DashboardData, Notifications } from '@/lib/types/api';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';

export const homeMessages = defineMessages({
  ar: {
    upcoming: 'رحلات الأسبوعين القادمين',
    upcomingHint: 'المقاعد المؤكدة من السعة، والخط يمثّل الحد الأدنى',
    noUpcoming: 'لا رحلات خلال 14 يوماً',
    noUpcomingBody: 'ستظهر هنا الرحلات المفتوحة والمغلقة والمؤكدة التي تبدأ قريباً.',
    recent: 'أحدث الحجوزات',
    recentHint: 'آخر ما سُجّل في النظام',
    noRecent: 'لا حجوزات بعد',
    seats: '{n} / {max} مقعد',
    min: 'الحد الأدنى {n}',
    viewAll: 'عرض الكل',
    alerts: 'تنبيهات',
    alertsHint: 'ما يحتاج متابعة الآن',
    allClear: 'لا شيء يحتاج انتباهك',
    allClearBody: 'كل الأمور تحت السيطرة. ستظهر هنا الطلبات الجديدة والمواعيد القريبة والتأشيرات الناقصة.',
    NEW_REQUESTS: 'طلبات رحلات جديدة بانتظار التواصل',
    DEADLINES_SOON: 'رحلات يقترب إغلاق تسجيلها',
    AWAITING_DECISION: 'رحلات وبرامج مغلقة بانتظار القرار',
    COSTS_CHANGED: 'رحلات تغيّرت تكاليف خدماتها',
    INTEGRATION_ERRORS: 'أخطاء في الربط مع الموردين',
    VISAS_MISSING: 'تأشيرات غير مكتملة لرحلات قريبة',
    startsIn: 'تبدأ {when}',
  },
  en: {
    upcoming: 'Next two weeks',
    upcomingHint: 'Confirmed seats of capacity; the tick marks the minimum',
    noUpcoming: 'No trips in the next 14 days',
    noUpcomingBody: 'Open, closed and confirmed trips starting soon appear here.',
    recent: 'Recent bookings',
    recentHint: 'The latest entries',
    noRecent: 'No bookings yet',
    seats: '{n} / {max} seats',
    min: 'Minimum {n}',
    viewAll: 'View all',
    alerts: 'Alerts',
    alertsHint: 'What needs attention now',
    allClear: 'Nothing needs your attention',
    allClearBody: 'All clear. New requests, close deadlines and missing visas show up here.',
    NEW_REQUESTS: 'New trip requests waiting for a call',
    DEADLINES_SOON: 'Trips whose registration closes soon',
    AWAITING_DECISION: 'Closed trips and programs awaiting a decision',
    COSTS_CHANGED: 'Trips whose supplier costs changed',
    INTEGRATION_ERRORS: 'Supplier integration errors',
    VISAS_MISSING: 'Incomplete visas for trips starting soon',
    startsIn: 'Starts {when}',
  },
});

/** Card with an uppercase title, a hint and an optional "view all" link. */
export function SectionCard({
  title,
  description,
  href,
  linkLabel,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  href?: string;
  linkLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {href && (
          <Link href={href} className="inline-flex items-center gap-1 text-[14px] font-medium text-primary hover:underline">
            {linkLabel}
            <ChevronLeft className="size-3.5 rtl-flip ltr:rotate-180" aria-hidden />
          </Link>
        )}
      </CardHeader>
      <div className="flex-1 p-3 sm:p-4">{children}</div>
    </Card>
  );
}

export function UpcomingTrips({ trips, loading, className }: { trips: DashboardData['upcomingTrips']; loading?: boolean; className?: string }) {
  const t = useMessages(homeMessages);
  const f = useFormat();
  return (
    <SectionCard className={className} title={t.upcoming} description={t.upcomingHint} href="/dashboard/trips" linkLabel={t.viewAll}>
      {loading ? (
        <ListSkeleton />
      ) : !trips?.length ? (
        <EmptyState size="sm" icon={CalendarClock} title={t.noUpcoming} description={t.noUpcomingBody} />
      ) : (
        <ul className="grid gap-1">
          {trips.map((trip) => {
            const pct = trip.maxPassengers ? Math.min(100, (trip.confirmedSeats / trip.maxPassengers) * 100) : 0;
            const minPct = trip.maxPassengers ? Math.min(100, (trip.minPassengers / trip.maxPassengers) * 100) : 0;
            const belowMin = trip.confirmedSeats < trip.minPassengers;
            return (
              <li key={trip.id}>
                <Link
                  href={`/dashboard/trips/${trip.id}`}
                  className="group grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 rounded-tile px-2.5 py-2.5 transition-colors hover:bg-surface-raised"
                >
                  <DateChip iso={trip.startsAt} />
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{trip.title}</span>
                      <StatusBadge kind="product" status={trip.status} size="sm" />
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted">
                      <span className="num" dir="ltr">
                        {trip.code}
                      </span>
                      <span>{fmt(t.startsIn, { when: f.relative(trip.startsAt) })}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div
                        className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={trip.maxPassengers}
                        aria-valuenow={trip.confirmedSeats}
                        aria-label={fmt(t.seats, { n: trip.confirmedSeats, max: trip.maxPassengers })}
                      >
                        <div className={cn('absolute inset-y-0 start-0 rounded-full', belowMin ? 'bg-warning' : 'bg-primary')} style={{ width: `${pct}%` }} />
                        <span aria-hidden title={fmt(t.min, { n: trip.minPassengers })} className="absolute inset-y-0 w-0.5 bg-ink/50" style={{ insetInlineStart: `${minPct}%` }} />
                      </div>
                      <span className="num shrink-0 text-xs text-muted">{fmt(t.seats, { n: trip.confirmedSeats, max: trip.maxPassengers })}</span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

/** Day + month tile (calendar style). */
export function DateChip({ iso, className }: { iso: string; className?: string }) {
  const { intl } = useLocale();
  const d = new Date(iso);
  const month = new Intl.DateTimeFormat(intl, { month: 'short' }).format(d);
  return (
    <span className={cn('grid size-12 shrink-0 place-items-center rounded-tile bg-surface-raised text-center leading-none shadow-card', className)}>
      <span>
        <span className="num block text-lg font-medium">{d.getDate()}</span>
        <span className="mt-0.5 block text-[11px] tracking-wide text-muted uppercase">{month}</span>
      </span>
    </span>
  );
}

export function RecentBookings({ bookings, loading, className }: { bookings: DashboardData['recentBookings']; loading?: boolean; className?: string }) {
  const t = useMessages(homeMessages);
  const f = useFormat();
  return (
    <SectionCard className={className} title={t.recent} description={t.recentHint} href="/dashboard/bookings" linkLabel={t.viewAll}>
      {loading ? (
        <ListSkeleton />
      ) : !bookings?.length ? (
        <EmptyState size="sm" icon={Ticket} title={t.noRecent} />
      ) : (
        <ul className="grid gap-1">
          {bookings.map((b) => (
            <li key={b.id}>
              <Link href={`/dashboard/bookings/${b.id}`} className="flex items-center gap-3 rounded-tile px-2.5 py-2.5 transition-colors hover:bg-surface-raised">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-medium text-accent-foreground" aria-hidden>
                  {b.payer.trim().charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{b.payer}</span>
                    <span className="num shrink-0 text-sm font-medium">{f.money(b.totalAmount, b.currencyCode)}</span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted">
                    <span className="truncate">
                      <span className="num" dir="ltr">
                        {b.bookingNo}
                      </span>
                      {' · '}
                      {b.target}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="hidden sm:inline">{f.relative(b.createdAt)}</span>
                      <StatusBadge kind="booking" status={b.status} size="sm" />
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

const ALERT_ICON: Record<Notifications['items'][number]['type'], LucideIcon> = {
  NEW_REQUESTS: MessageSquarePlus,
  DEADLINES_SOON: CalendarClock,
  AWAITING_DECISION: Gavel,
  COSTS_CHANGED: Coins,
  INTEGRATION_ERRORS: Plug,
  VISAS_MISSING: Stamp,
};

const SEVERITY = {
  info: { tone: 'info', icon: Info, ring: 'bg-info/12 text-info' },
  warning: { tone: 'warning', icon: AlertTriangle, ring: 'bg-warning/14 text-warning' },
  danger: { tone: 'danger', icon: CircleAlert, ring: 'bg-danger/12 text-danger' },
} as const;

/** Live alerts for the signed-in role (GET /notifications). */
export function AlertsPanel({ className }: { className?: string }) {
  const t = useMessages(homeMessages);
  const q = useResource<Notifications>('/notifications', undefined, { refetchInterval: 60_000 });
  const items = q.data?.items ?? [];
  return (
    <SectionCard
      className={className}
      title={
        <span className="inline-flex items-center gap-2">
          {t.alerts}
          {!!q.data?.total && (
            <Badge tone="danger" size="sm" className="num">
              {q.data.total}
            </Badge>
          )}
        </span>
      }
      description={t.alertsHint}
    >
      {q.isLoading ? (
        <ListSkeleton rows={3} />
      ) : !items.length ? (
        <EmptyState size="sm" icon={BellRing} title={t.allClear} description={t.allClearBody} />
      ) : (
        <ul className="grid gap-1.5">
          {items.map((a) => {
            const Icon = ALERT_ICON[a.type] ?? SEVERITY[a.severity].icon;
            return (
              <li key={a.type}>
                <Link href={a.link} className="group flex items-center gap-3 rounded-tile border border-transparent bg-surface-raised/60 px-3 py-2.5 transition-colors hover:border-border hover:bg-surface-raised">
                  <span className={cn('grid size-9 shrink-0 place-items-center rounded-full', SEVERITY[a.severity].ring)} aria-hidden>
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 text-sm leading-snug">{t[a.type] ?? a.type}</span>
                  <Badge tone={SEVERITY[a.severity].tone} className="num">
                    {a.count}
                  </Badge>
                  <ArrowUpRight className="size-4 text-subtle transition-transform group-hover:rotate-45 rtl:-scale-x-100" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

/** Tile with a count that links to a filtered list ("بانتظار القرار", "طلبات جديدة"). */
export function CountTile({
  icon: Icon,
  label,
  value,
  href,
  tone = 'neutral',
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: number | undefined;
  href: string;
  tone?: 'neutral' | 'warning' | 'info' | 'danger';
  hint?: string;
}) {
  const f = useFormat();
  const active = (value ?? 0) > 0;
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-tile bg-surface-raised px-3.5 py-3 shadow-card transition-colors hover:bg-surface-raised/70 focus-visible:outline-2 focus-visible:outline-ring"
    >
      <span
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-full',
          !active && 'bg-surface-sunken text-muted',
          active && tone === 'warning' && 'bg-warning/14 text-warning',
          active && tone === 'info' && 'bg-info/12 text-info',
          active && tone === 'danger' && 'bg-danger/12 text-danger',
          active && tone === 'neutral' && 'bg-accent-soft text-primary',
        )}
        aria-hidden
      >
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{label}</span>
        {hint && <span className="block truncate text-xs text-muted">{hint}</span>}
      </span>
      <span className="num text-2xl font-medium tracking-tight">{value === undefined ? '—' : f.number(value)}</span>
      <ArrowUpRight className="size-4 text-subtle transition-transform group-hover:rotate-45 rtl:-scale-x-100" aria-hidden />
    </Link>
  );
}

/** Quick action button card. */
export function Shortcut({ icon: Icon, label, hint, href }: { icon: LucideIcon; label: string; hint: string; href: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-card bg-surface p-4 transition-colors hover:bg-surface-raised hover:shadow-card focus-visible:outline-2 focus-visible:outline-ring dark:border dark:border-border/80"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-ink-foreground transition-transform group-hover:scale-105" aria-hidden>
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block truncate text-xs text-muted">{hint}</span>
      </span>
    </Link>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="grid gap-2 p-1" aria-busy>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-11 rounded-tile" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
