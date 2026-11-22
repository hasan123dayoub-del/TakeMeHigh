'use client';

import { Armchair, BarChart3, CalendarCheck, Hourglass, ListOrdered, Plane, Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { useAuth } from '@/lib/auth';
import { greeting } from '@/lib/format';
import { fmt, useLocale, useMessages } from '@/lib/i18n';
import { useDashboard } from '@/lib/queries/dashboard';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';
import { ActivityFeed } from './activity-feed';
import { FinanceSection } from './finance-section';
import { dashboardMessages } from './messages';
import { RecentBookings } from './recent-bookings';
import { ErrorState } from './states';
import { TasksPanel } from './tasks-panel';
import { TripTimeline } from './trip-timeline';

export function DashboardView() {
  const t = useMessages(dashboardMessages);
  const f = useFormat();
  const { locale } = useLocale();
  const { user, can, scope } = useAuth();
  const q = useDashboard();
  const data = q.data;
  const loading = q.isPending;

  const firstName = user?.fullName.split(' ')[0];
  const sep = locale === 'ar' ? '، ' : ', ';

  const kpis = [
    {
      label: t.kpiTotalBookings,
      note: t.kpiTotalBookingsNote,
      value: data?.kpis.totalBookings,
      icon: CalendarCheck,
      href: can('bookings.view') ? '/dashboard/bookings' : undefined,
      featured: true,
    },
    {
      label: t.kpiUpcomingTrips,
      note: t.kpiUpcomingTripsNote,
      value: data?.kpis.upcomingTrips,
      icon: Plane,
      href: can('trips.view') ? '/dashboard/trips' : undefined,
    },
    { label: t.kpiConfirmedPassengers, note: t.kpiConfirmedPassengersNote, value: data?.kpis.confirmedPassengers, icon: Users },
    { label: t.kpiAvailableSeats, note: t.kpiAvailableSeatsNote, value: data?.kpis.availableSeats, icon: Armchair },
    {
      label: t.kpiPending,
      note: t.kpiPendingNote,
      value: data?.kpis.pendingBookings,
      icon: Hourglass,
      href: can('bookings.view') ? '/dashboard/bookings?status=PENDING' : undefined,
    },
    {
      label: t.kpiWaiting,
      note: t.kpiWaitingNote,
      value: data?.kpis.waitingList,
      icon: ListOrdered,
      href: can('bookings.view') ? '/dashboard/bookings?status=WAITING_LIST' : undefined,
    },
  ];

  const showActivity = scope === 'OFFICE';

  return (
    <div className="flex flex-col gap-3">
      <PageHeader
        size="hero"
        className="mb-5"
        title={
          <>
            {greeting(new Date(), locale)}
            {firstName && (
              <>
                {sep}
                <strong>{firstName}</strong>
              </>
            )}
          </>
        }
        description={
          data
            ? data.kpis.upcomingTrips
              ? fmt(t.summary, { trips: f.number(data.kpis.upcomingTrips), pending: f.number(data.kpis.pendingBookings) })
              : t.summaryCalm
            : undefined
        }
        actions={
          <>
            {can('reports.view') && (
              <Button asChild variant="secondary" size="lg">
                <Link href="/dashboard/reports">
                  <BarChart3 aria-hidden />
                  {t.openReports}
                </Link>
              </Button>
            )}
            {can('trips.manage') && (
              <Button asChild variant="secondary" size="lg">
                <Link href="/dashboard/trips/new">
                  <Plane aria-hidden />
                  {t.newTrip}
                </Link>
              </Button>
            )}
            {can('bookings.create') && (
              <Button asChild size="lg">
                <Link href="/dashboard/bookings/new">
                  <Plus aria-hidden />
                  {t.newBooking}
                </Link>
              </Button>
            )}
          </>
        }
      />

      {q.isError && !data ? (
        <Card>
          <ErrorState error={q.error} onRetry={() => void q.refetch()} />
        </Card>
      ) : (
        <>
          <section aria-label={t.kpiTotalBookings} className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {kpis.map((k, i) => (
              <StatCard
                key={k.label}
                label={k.label}
                value={k.value === undefined ? '—' : f.number(k.value)}
                note={k.note}
                icon={k.icon}
                href={k.href}
                featured={k.featured}
                loading={loading}
                className={cn('min-h-36 animate-rise', i > 0 && '[animation-delay:60ms]')}
              />
            ))}
          </section>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
            <div className="xl:col-span-7">
              <TripTimeline trips={data?.upcomingTrips.slice(0, 6)} loading={loading} />
            </div>
            <div className="flex flex-col gap-3 xl:col-span-5">
              <TasksPanel tasks={data?.tasks} loading={loading} />
              {showActivity && data && <ActivityFeed items={data.recentActivity.slice(0, 6)} />}
            </div>
          </div>

          {data?.finance && <FinanceSection finance={data.finance} />}

          <RecentBookings bookings={data?.recentBookings} loading={loading} />
        </>
      )}
    </div>
  );
}
