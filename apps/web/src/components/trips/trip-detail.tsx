'use client';

import { LABELS } from '@travelos/shared';
import { ArrowLeft, CalendarRange, CircleDollarSign, Clock, Eye, EyeOff, Lock, TriangleAlert, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { QueryState } from '@/components/data/states';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { useName, useResource } from '@/lib/hooks';
import { defineMessages, fmt, useLocale, useMessages } from '@/lib/i18n';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';
import { PassengersTab } from './passengers-tab';
import { RouteBuilder } from './route-builder';
import { DeadlineCell, RouteText, SeatsBar } from './trip-bits';
import { TripActions } from './trip-actions';
import { tripWords } from './trip-messages';
import { GuidesTab, HistoryTab, MediaTab, PickupPointsTab } from './trip-side-tabs';
import type { TripFull } from './trip-utils';

const m = defineMessages({
  ar: {
    services: 'الخدمات والمسار',
    overview: 'نظرة عامة',
    pickup: 'نقاط الانطلاق',
    guides: 'الأدلة',
    passengers: 'الركاب',
    media: 'الصور والشروط',
    history: 'السجل',
    closure: 'إجمالي الركاب عند الإغلاق: {n} — بتاريخ {d}',
    closureReason: 'سبب الإغلاق',
    min: 'الحد الأدنى {n}',
    pending: 'بانتظار التأكيد {n}',
    waitlist: 'قائمة الانتظار {n}',
    cancelled: 'سبب الإلغاء',
    warnings: 'تنبيهات تحتاج انتباهك',
    nights: '{n} ليالٍ',
  },
  en: {
    services: 'Services & route',
    overview: 'Overview',
    pickup: 'Boarding points',
    guides: 'Guides',
    passengers: 'Passengers',
    media: 'Images & terms',
    history: 'History',
    closure: 'Passengers at closing: {n} — on {d}',
    closureReason: 'Closure reason',
    min: 'Minimum {n}',
    pending: '{n} pending',
    waitlist: '{n} on waitlist',
    cancelled: 'Cancellation reason',
    warnings: 'Warnings that need your attention',
    nights: '{n} nights',
  },
});

const TABS = ['services', 'pickup', 'guides', 'passengers', 'media', 'history'] as const;
type Tab = (typeof TABS)[number];

export function TripDetailView({ id }: { id: string }) {
  const trip = useResource<TripFull>(`/trips/${id}`);
  return (
    <QueryState isLoading={trip.isLoading} error={trip.error} onRetry={() => trip.refetch()}>
      {trip.data && <TripDetailBody trip={trip.data} />}
    </QueryState>
  );
}

function TripDetailBody({ trip }: { trip: TripFull }) {
  const t = useMessages(m);
  const w = useMessages(tripWords);
  const { locale } = useLocale();
  const { scope, can, isAdmin, user } = useAuth();
  const f = useFormat();
  const name = useName();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const guide = scope === 'ASSIGNED';
  const ownsIt = isAdmin || (!!trip.branchId && trip.branchId === user?.branch?.id);
  const editable = !guide && can('trips.manage') && ownsIt && trip.status !== 'CANCELLED' && trip.status !== 'COMPLETED';
  const visibleTabs: Tab[] = guide ? ['services', 'passengers'] : TABS.filter((x) => x !== 'passengers' || can('trips.passengers'));
  const requested = search.get('tab') as Tab | null;
  const tab: Tab = requested && visibleTabs.includes(requested) ? requested : 'services';
  const setTab = (v: string) => {
    const next = new URLSearchParams(search.toString());
    if (v === 'services') next.delete('tab');
    else next.set('tab', v);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const showClosure = (trip.status === 'CLOSED' || trip.status === 'CONFIRMED' || trip.status === 'COMPLETED') && trip.finalPassengerCount !== null;
  const tabLabel: Record<Tab, string> = {
    services: guide ? t.overview : t.services,
    pickup: t.pickup,
    guides: t.guides,
    passengers: t.passengers,
    media: t.media,
    history: t.history,
  };
  const days = Math.max(1, Math.round((new Date(trip.endsAt).getTime() - new Date(trip.startsAt).getTime()) / 86_400_000));

  return (
    <div className="flex flex-col gap-5">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 animate-rise">
          <Link href="/dashboard/trips" className="eyebrow inline-flex items-center gap-1.5 hover:text-foreground">
            <ArrowLeft className="rtl-flip size-3.5" aria-hidden />
            {w.trips}
            <span className="num ltr-nums">· {trip.code}</span>
          </Link>
          <h1 className="heading-display mt-2 text-[28px] leading-[1.1] text-balance sm:text-[36px]">{trip.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <StatusBadge kind="product" status={trip.status} />
            <StatusBadge kind="scope" status={trip.scope} />
            <Badge tone="neutral">{name(trip.category)}</Badge>
            <Badge tone="neutral">{trip.branch?.name ?? w.allBranches}</Badge>
            {!guide && (
              <Badge tone={trip.isPublic ? 'primary' : 'neutral'}>
                {trip.isPublic ? <Eye className="size-3" aria-hidden /> : <EyeOff className="size-3" aria-hidden />}
                {trip.isPublic ? w.public : w.private}
              </Badge>
            )}
            <RouteText from={name(trip.originCity)} to={name(trip.destinationCity)} className="ms-1 text-muted" />
          </div>
        </div>
        {!guide && <TripActions trip={trip} />}
      </div>

      {/* closure (CLS-04) */}
      {showClosure && (
        <Card tone="altitude" className="flex flex-wrap items-center gap-4 p-5">
          <span className="grid size-11 place-items-center rounded-full bg-white/15">
            <Lock className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-display text-lg sm:text-xl">
              {fmt(t.closure, { n: trip.finalPassengerCount ?? 0, d: f.date(trip.closedAt, 'dateTime') })}
            </div>
            {trip.closureReason && (
              <div className="mt-0.5 text-sm opacity-80">
                {t.closureReason}: {LABELS.closureReason[trip.closureReason][locale]} · {fmt(t.min, { n: trip.minPassengers })}
              </div>
            )}
          </div>
        </Card>
      )}
      {trip.status === 'CANCELLED' && trip.cancelReason && (
        <div className="rounded-card border border-danger/30 bg-danger/8 px-5 py-4 text-sm">
          <span className="font-medium text-danger">{t.cancelled}:</span> {trip.cancelReason}
        </div>
      )}

      {/* warnings */}
      {!guide && trip.warnings.length > 0 && (
        <div role="status" className="rounded-card border border-warning/35 bg-warning/10 px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-medium text-[color-mix(in_srgb,var(--warning)_75%,var(--text))]">
            <TriangleAlert className="size-4" aria-hidden /> {t.warnings}
          </div>
          <ul className="mt-2 grid gap-1.5 ps-6 text-sm">
            {trip.warnings.map((code) => (
              <li key={code} className="list-disc">
                {(w as Record<string, string>)[`w_${code}`] ?? code}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* key figures */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Figure icon={CalendarRange} label={w.dates}>
          <div className="num text-[15px] font-medium">{f.date(trip.startsAt, 'dateTime')}</div>
          <div className="num text-xs text-muted">
            {f.date(trip.endsAt, 'dateTime')} · {fmt(t.nights, { n: days })}
          </div>
        </Figure>
        <Figure icon={Clock} label={w.deadline}>
          <DeadlineCell iso={trip.registrationDeadline} open={trip.status === 'OPEN'} />
        </Figure>
        <Figure icon={Users} label={w.seats}>
          <SeatsBar confirmed={trip.confirmedSeats} max={trip.maxPassengers} />
          <div className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] text-muted">
            <span>{fmt(t.min, { n: trip.minPassengers })}</span>
            {trip.passengers.pending > 0 && <span>{fmt(t.pending, { n: trip.passengers.pending })}</span>}
            {trip.passengers.waitlist > 0 && <span>{fmt(t.waitlist, { n: trip.passengers.waitlist })}</span>}
          </div>
        </Figure>
        <Figure icon={CircleDollarSign} label={w.price} featured>
          <div className="num font-display text-2xl">{f.money(trip.pricePerPerson, trip.currencyCode)}</div>
          {trip.costPerPerson !== undefined && (
            <div className="num mt-0.5 text-xs opacity-85">
              {w.cost} {f.money(trip.costPerPerson, trip.currencyCode)} · {w.profit} {f.money(Number(trip.pricePerPerson) - Number(trip.costPerPerson), trip.currencyCode)}
            </div>
          )}
        </Figure>
      </div>

      {/* tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {visibleTabs.map((x) => (
            <TabsTrigger key={x} value={x}>
              {tabLabel[x]}
              {x === 'services' && <span className="num opacity-60">{trip.lines.length}</span>}
              {x === 'pickup' && <span className="num opacity-60">{trip.pickupPoints.length + 1}</span>}
              {x === 'guides' && <span className="num opacity-60">{trip.guides.length}</span>}
              {x === 'passengers' && <span className="num opacity-60">{trip.passengers.confirmed}</span>}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="services">
          <div className="flex flex-col gap-5">
            {guide && trip.description && <Card className="p-5 text-sm leading-relaxed">{trip.description}</Card>}
            <RouteBuilder trip={trip} editable={editable} canProfit={can('pricing.set_profit')} />
            {guide && <PickupPointsTab trip={trip} editable={false} />}
          </div>
        </TabsContent>
        {!guide && (
          <>
            <TabsContent value="pickup">
              <PickupPointsTab trip={trip} editable={editable} />
            </TabsContent>
            <TabsContent value="guides">
              <GuidesTab trip={trip} editable={editable} />
            </TabsContent>
            <TabsContent value="media">
              <MediaTab key={trip.images.map((i) => i.id).join()} trip={trip} editable={editable} />
            </TabsContent>
            <TabsContent value="history">
              <HistoryTab trip={trip} />
            </TabsContent>
          </>
        )}
        {visibleTabs.includes('passengers') && (
          <TabsContent value="passengers">
            <PassengersTab trip={trip} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function Figure({ icon: Icon, label, children, featured }: { icon: typeof Clock; label: string; children: ReactNode; featured?: boolean }) {
  return (
    <Card tone={featured ? 'altitude' : 'surface'} className="p-4 sm:p-5">
      <div className={cn('mb-2 flex items-center gap-2 text-xs', featured ? 'opacity-85' : 'text-muted')}>
        <Icon className="size-3.5" aria-hidden />
        {label}
      </div>
      {children}
    </Card>
  );
}
