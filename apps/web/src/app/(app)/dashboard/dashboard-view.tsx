'use client';

import { ArrowUpRight, CalendarCheck, Gauge, Map, Plus } from 'lucide-react';
import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { NAV_ITEMS } from '@/components/app-shell/nav-items';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/lib/auth';
import { greeting } from '@/lib/format';

const noopSubscribe = () => () => {};

export function DashboardView() {
  const { user, agency, can } = useAuth();
  const hello = useSyncExternalStore(noopSubscribe, () => greeting(), () => 'Welcome');
  const firstName = user?.fullName.split(' ')[0] ?? '';
  const modules = NAV_ITEMS.filter((i) => i.href !== '/dashboard' && (!i.permission || can(i.permission)));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        size="hero"
        title={
          <>
            {hello}, <strong>{firstName}</strong>
          </>
        }
        description={
          agency
            ? `Everything ${agency.name} needs to run today's departures, bookings and payments.`
            : 'Everything you need to run departures, bookings and payments.'
        }
        actions={
          <>
            {can('trips.read') && (
              <Button asChild variant="secondary" size="lg">
                <Link href="/trips">
                  <Map /> View trips
                </Link>
              </Button>
            )}
            {can('bookings.write') && (
              <Button asChild size="lg">
                <Link href="/bookings">
                  <Plus /> New booking
                </Link>
              </Button>
            )}
          </>
        }
      />

      <section aria-labelledby="modules-heading" className="grid gap-3">
        <h2 id="modules-heading" className="sr-only">
          Modules
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {modules.map((m, i) => {
            const Icon = m.icon;
            const featured = i === 0;
            return (
              <Link
                key={m.href}
                href={m.href}
                className="group rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Card
                  tone={featured ? 'altitude' : 'surface'}
                  className="flex h-full min-h-36 flex-col justify-between gap-6 p-5 transition-transform duration-300 ease-out-soft group-hover:-translate-y-0.5"
                >
                  {featured && (
                    <span aria-hidden className="pointer-events-none absolute -top-16 -right-12 size-48 rounded-full bg-white/10" />
                  )}
                  <div className="relative flex items-center justify-between">
                    <span
                      className={
                        featured
                          ? 'grid size-10 place-items-center rounded-full bg-white/18'
                          : 'grid size-10 place-items-center rounded-full bg-surface-raised text-primary'
                      }
                    >
                      <Icon className="size-[18px]" aria-hidden />
                    </span>
                    <span
                      className={
                        featured
                          ? 'grid size-8 place-items-center rounded-full bg-white/18 transition-transform group-hover:rotate-45'
                          : 'grid size-8 place-items-center rounded-full bg-surface-raised transition-transform group-hover:rotate-45'
                      }
                    >
                      <ArrowUpRight className="size-4" aria-hidden />
                    </span>
                  </div>
                  <div className="relative">
                    <div className="text-xs font-medium tracking-[0.16em] uppercase opacity-85">{m.label}</div>
                    <div className={featured ? 'mt-1 text-[15px]' : 'mt-1 text-[15px] text-foreground'}>
                      {m.description}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-3 xl:grid-cols-12">
        <Card className="xl:col-span-8">
          <CardHeader>
            <div>
              <CardTitle>Operations overview</CardTitle>
              <CardDescription>Revenue, bookings, seats sold and outstanding balances.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <EmptyState
              size="sm"
              icon={Gauge}
              title="Your numbers will appear here"
              description="As soon as trips are published and bookings are recorded, this panel tracks revenue, seats sold and outstanding balances in real time."
            />
          </CardContent>
        </Card>
        <Card className="xl:col-span-4">
          <CardHeader>
            <div>
              <CardTitle>Upcoming departures</CardTitle>
              <CardDescription>Next 60 days</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <EmptyState
              size="sm"
              icon={CalendarCheck}
              title="No departures scheduled"
              description="Published trips appear here in date order with seats sold and readiness."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
