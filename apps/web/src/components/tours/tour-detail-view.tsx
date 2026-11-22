'use client';

import { BedDouble, Bus, CalendarPlus, CalendarRange, Check, ChevronRight, FileText, MapPin, MoreHorizontal, Pencil, Power, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { BackLink } from '@/components/trips/kit/controls';
import { ConfirmDialog } from '@/components/trips/kit/dialogs';
import { DetailSkeleton, Forbidden, QueryError, useErrorText } from '@/components/trips/kit/states';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PageHeader } from '@/components/ui/page-header';
import { Tooltip } from '@/components/ui/tooltip';
import { useAuth } from '@/lib/auth';
import { common, fmt, useLocale, useMessages } from '@/lib/i18n';
import { useDeleteTour, useToggleTourActive, useTour } from '@/lib/queries/tours';
import { useBranches } from '@/lib/queries/trips';
import type { TourDetail } from '@/lib/types/tours';
import { useFormat } from '@/lib/use-format';
import { toursMessages } from './messages';
import { TourFormDialog } from './tour-form-dialog';
import { TourCover } from './tours-list-view';

export function TourDetailView({ id }: { id: string }) {
  const { can } = useAuth();
  const allowed = can('tours.view');
  const tour = useTour(allowed ? id : undefined);
  if (!allowed) return <Forbidden />;
  if (tour.isLoading) return <DetailSkeleton />;
  if (tour.isError || !tour.data)
    return (
      <Card>
        <QueryError error={tour.error} onRetry={() => tour.refetch()} />
      </Card>
    );
  return <TourDetailContent tour={tour.data} />;
}

function TourDetailContent({ tour }: { tour: TourDetail }) {
  const t = useMessages(toursMessages);
  const c = useMessages(common);
  const { can } = useAuth();
  const { locale } = useLocale();
  const f = useFormat();
  const router = useRouter();
  const errorText = useErrorText();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const toggle = useToggleTourActive();
  const del = useDeleteTour();
  const canManage = can('tours.manage');
  const canSchedule = can('trips.manage');
  const category = tour.category ? (locale === 'ar' ? (tour.category.nameAr ?? tour.category.name) : tour.category.name) : null;
  const duration = tour.nights > 0 ? fmt(t.daysNights, { d: f.number(tour.days), n: f.number(tour.nights) }) : fmt(t.daysOnly, { d: f.number(tour.days) });

  const toggleActive = async () => {
    try {
      await toggle.mutateAsync({ id: tour.id, isActive: !tour.isActive });
      toast.success(tour.isActive ? t.deactivated : t.activated);
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  const schedule = canSchedule && (
    tour.isActive ? (
      <Button asChild>
        <Link href={`/dashboard/trips/new?tourId=${tour.id}`}>
          <CalendarPlus /> {t.scheduleTrip}
        </Link>
      </Button>
    ) : (
      <Tooltip content={t.scheduleInactive}>
        <span tabIndex={0} className="rounded-full">
          <Button disabled>
            <CalendarPlus /> {t.scheduleTrip}
          </Button>
        </span>
      </Tooltip>
    )
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4">
        <BackLink href="/dashboard/tours">{t.backToTours}</BackLink>
        <PageHeader
          eyebrow={
            <span className="inline-flex flex-wrap items-center gap-2">
              <MapPin className="size-3.5" aria-hidden /> {tour.destination}
              {category && <span aria-hidden>·</span>}
              {category}
            </span>
          }
          title={tour.name}
          description={
            <span className="flex flex-wrap items-center gap-2">
              <Badge tone="primary" className="num">
                <CalendarRange className="size-3.5" aria-hidden /> {duration}
              </Badge>
              <Badge tone={tour.isActive ? 'success' : 'warning'} dot>
                {tour.isActive ? t.active : t.inactive}
              </Badge>
            </span>
          }
          actions={
            <>
              {schedule}
              {canManage && (
                <>
                  <Button variant="secondary" onClick={() => setEditOpen(true)}>
                    <Pencil /> {c.edit}
                  </Button>
                  <DropdownMenu dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="icon" aria-label={t.more}>
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={toggleActive} disabled={toggle.isPending}>
                        <Power /> {tour.isActive ? t.deactivate : t.activate}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="danger"
                        onSelect={() => {
                          setDeleteError(tour.trips.length ? t.deleteBlocked : null);
                          setDeleteOpen(true);
                        }}
                      >
                        <Trash2 /> {t.deleteTour}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </>
          }
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-3">
          {tour.description && (
            <Card>
              <CardContent className="text-[15px] leading-relaxed text-pretty text-foreground">{tour.description}</CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>{t.itinerary}</CardTitle>
            </CardHeader>
            <CardContent>
              {tour.itinerary.length ? <ItineraryTimeline days={tour.itinerary} /> : <p className="text-sm text-muted">{t.noItinerary}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t.gallery}</CardTitle>
            </CardHeader>
            <CardContent>
              {tour.images.length ? (
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {tour.images.map((img, i) => (
                    <li key={img.id ?? i} className="overflow-hidden rounded-tile border border-border">
                      <TourCover url={img.url} className="aspect-[4/3]" />
                      {img.caption && <p className="truncate px-3 py-2 text-xs text-muted">{img.caption}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">{t.noImages}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid content-start gap-3">
          <Card className="overflow-hidden">
            <TourCover url={tour.coverImageUrl} className="h-40" />
            <CardContent className="grid gap-4">
              <InfoBlock icon={BedDouble} title={t.accommodation} body={tour.accommodationInfo} empty={t.notSet} />
              <InfoBlock icon={Bus} title={t.transport} body={tour.transportationInfo} empty={t.notSet} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t.terms}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <InfoBlock icon={FileText} title={t.bookingTerms} body={tour.bookingTerms} empty={t.notSet} />
              <InfoBlock icon={FileText} title={t.cancellationTerms} body={tour.cancellationTerms} empty={t.notSet} />
            </CardContent>
          </Card>
          <TourTrips tour={tour} action={schedule} />
        </div>
      </div>

      <TourFormDialog open={editOpen} onOpenChange={setEditOpen} tour={tour} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t.deleteTourTitle}
        description={fmt(t.deleteTourBody, { name: tour.name })}
        confirmLabel={t.deleteTour}
        loading={del.isPending}
        error={deleteError}
        onConfirm={async () => {
          setDeleteError(null);
          try {
            await del.mutateAsync(tour.id);
            toast.success(t.deleted);
            router.push('/dashboard/tours');
          } catch (err) {
            setDeleteError(errorText(err));
          }
        }}
      />
    </div>
  );
}

/** Vertical day-by-day timeline with Cirrus sky check circles. */
export function ItineraryTimeline({ days }: { days: TourDetail['itinerary'] }) {
  const t = useMessages(toursMessages);
  return (
    <ol className="relative grid gap-6">
      {days.map((d, i) => (
        <li key={d.id ?? d.dayNumber} className="relative flex gap-4">
          {i < days.length - 1 && (
            <span aria-hidden className="absolute start-[15px] top-9 -bottom-6 w-px bg-gradient-to-b from-sky-300 to-sky-200 dark:from-sky-700 dark:to-sky-800" />
          )}
          <span className="relative grid size-8 shrink-0 place-items-center rounded-full bg-sky-100 text-sky-700 ring-4 ring-sky-50 dark:bg-sky-800 dark:text-sky-100 dark:ring-sky-950">
            <Check className="size-4" strokeWidth={2.5} aria-hidden />
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="num text-[11px] font-medium tracking-[0.16em] text-primary uppercase">{fmt(t.day, { n: d.dayNumber })}</p>
            <h4 className="mt-0.5 text-[15px] font-medium text-foreground">{d.title}</h4>
            {d.location && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                <MapPin className="size-3" aria-hidden /> {d.location}
              </p>
            )}
            {d.description && <p className="mt-2 text-sm leading-relaxed text-pretty text-muted">{d.description}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function InfoBlock({ icon: Icon, title, body, empty }: { icon: typeof Bus; title: string; body: string | null; empty: string }) {
  return (
    <div className="flex gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-primary">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium tracking-[0.14em] text-muted uppercase">{title}</p>
        <p className={body ? 'mt-1 text-sm leading-relaxed whitespace-pre-line text-foreground' : 'mt-1 text-sm text-subtle'}>{body || empty}</p>
      </div>
    </div>
  );
}

function TourTrips({ tour, action }: { tour: TourDetail; action: ReactNode }) {
  const t = useMessages(toursMessages);
  const f = useFormat();
  const { scope } = useAuth();
  const branches = useBranches(scope === 'OFFICE');
  const branchName = (id: string) => branches.data?.find((b) => b.id === id)?.name;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.trips}</CardTitle>
        <span className="num text-xs text-muted">{f.number(tour.trips.length)}</span>
      </CardHeader>
      <CardContent>
        {tour.trips.length === 0 ? (
          <div className="grid justify-items-start gap-3">
            <p className="text-sm text-muted">{t.tripsEmpty}</p>
            {action}
          </div>
        ) : (
          <ul className="-mx-2 grid">
            {tour.trips.map((trip) => (
              <li key={trip.id}>
                <Link
                  href={`/dashboard/trips/${trip.id}`}
                  className="flex items-center gap-3 rounded-tile px-2 py-2.5 transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <span className="ltr-nums">{trip.code}</span>
                      <StatusBadge kind="tripType" status={trip.tripType} size="sm" />
                    </p>
                    <p className="num mt-0.5 text-xs text-muted">
                      {f.date(trip.departureDate)}
                      {scope === 'OFFICE' && branchName(trip.branchId) ? ` · ${branchName(trip.branchId)}` : ''}
                    </p>
                  </div>
                  <StatusBadge kind="trip" status={trip.status} size="sm" />
                  <ChevronRight className="rtl-flip size-4 text-subtle" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
