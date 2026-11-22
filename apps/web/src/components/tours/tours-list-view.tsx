'use client';

import { CalendarRange, MapPin, Mountain, Plus, Route, Tags } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Pager, SearchField, useDebounced } from '@/components/trips/kit/controls';
import { Forbidden, QueryError } from '@/components/trips/kit/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth';
import { fmt, useLocale, useMessages } from '@/lib/i18n';
import { useTourCategories, useTours } from '@/lib/queries/tours';
import type { TourListItem } from '@/lib/types/tours';
import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';
import { CategoryManagerDialog } from './category-manager-dialog';
import { toursMessages } from './messages';
import { TourFormDialog } from './tour-form-dialog';

const ALL = '__all';
const PAGE_SIZE = 12;

export function ToursListView() {
  const t = useMessages(toursMessages);
  const { can } = useAuth();
  const { locale } = useLocale();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState(ALL);
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const debounced = useDebounced(search.trim());
  const allowed = can('tours.view');
  const canManage = can('tours.manage');

  const query = {
    page,
    pageSize: PAGE_SIZE,
    search: debounced || undefined,
    categoryId: categoryId === ALL ? undefined : categoryId,
  };
  const tours = useTours(query, allowed);
  const categories = useTourCategories(allowed);
  const filtered = !!debounced || categoryId !== ALL;

  if (!allowed) return <Forbidden />;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
        actions={
          canManage && (
            <>
              <Button variant="secondary" onClick={() => setCatsOpen(true)}>
                <Tags /> {t.categories}
              </Button>
              <Button onClick={() => setFormOpen(true)}>
                <Plus /> {t.newTour}
              </Button>
            </>
          )
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchField
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder={t.searchPlaceholder}
          label={t.searchLabel}
        />
        <Select
          value={categoryId}
          onValueChange={(v) => {
            setCategoryId(v);
            setPage(1);
          }}
          dir={locale === 'ar' ? 'rtl' : 'ltr'}
        >
          <SelectTrigger className="h-10 w-full text-start sm:w-56" aria-label={t.categoryFilter}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t.allCategories}</SelectItem>
            {categories.data?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {locale === 'ar' ? (c.nameAr ?? c.name) : c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {tours.isError ? (
        <Card>
          <QueryError error={tours.error} onRetry={() => tours.refetch()} />
        </Card>
      ) : tours.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-36 rounded-none" />
              <div className="grid gap-3 p-5">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </Card>
          ))}
        </div>
      ) : !tours.data?.data.length ? (
        <Card>
          {filtered ? (
            <EmptyState icon={Route} title={t.noResultsTitle} description={t.noResultsBody} />
          ) : (
            <EmptyState
              icon={Route}
              title={t.emptyTitle}
              description={t.emptyBody}
              action={
                canManage && (
                  <Button onClick={() => setFormOpen(true)}>
                    <Plus /> {t.newTour}
                  </Button>
                )
              }
            />
          )}
        </Card>
      ) : (
        <div className={cn('flex flex-col gap-4 transition-opacity', tours.isFetching && tours.isPlaceholderData && 'opacity-60')}>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {tours.data.data.map((tour) => (
              <li key={tour.id}>
                <TourCard tour={tour} />
              </li>
            ))}
          </ul>
          <Pager meta={tours.data.meta} onPage={setPage} loading={tours.isFetching} />
        </div>
      )}

      <TourFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={(tour) => router.push(`/dashboard/tours/${tour.id}`)} />
      <CategoryManagerDialog open={catsOpen} onOpenChange={setCatsOpen} />
    </div>
  );
}

function TourCard({ tour }: { tour: TourListItem }) {
  const t = useMessages(toursMessages);
  const { locale } = useLocale();
  const f = useFormat();
  const category = tour.category ? (locale === 'ar' ? (tour.category.nameAr ?? tour.category.name) : tour.category.name) : null;
  return (
    <Link
      href={`/dashboard/tours/${tour.id}`}
      className="group block h-full rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Card className="flex h-full flex-col overflow-hidden transition-[transform,box-shadow] duration-300 ease-out-soft group-hover:-translate-y-0.5 group-hover:shadow-pop">
        <TourCover url={tour.coverImageUrl} className="h-36">
          <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
            {category ? (
              <Badge tone="neutral" className="bg-surface-raised/90 backdrop-blur">
                {category}
              </Badge>
            ) : (
              <span />
            )}
            {!tour.isActive && <Badge tone="warning">{t.inactive}</Badge>}
          </div>
        </TourCover>
        <div className="flex flex-1 flex-col gap-3 p-5">
          <div>
            <h3 className="line-clamp-2 text-[15px] font-medium leading-snug text-foreground">{tour.name}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{tour.destination}</span>
            </p>
          </div>
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted">
            <span className="num inline-flex items-center gap-1.5">
              <CalendarRange className="size-3.5" aria-hidden />
              {tour.nights > 0 ? fmt(t.daysNights, { d: f.number(tour.days), n: f.number(tour.nights) }) : fmt(t.daysOnly, { d: f.number(tour.days) })}
            </span>
            <span className={cn('num font-medium', tour._count.trips ? 'text-foreground' : 'text-subtle')}>
              {tour._count.trips ? fmt(t.tripsCount, { n: f.number(tour._count.trips) }) : t.noTrips}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

/** Cover image, or a Cirrus sky placeholder when there is none / it fails. */
export function TourCover({ url, className, children }: { url: string | null; className?: string; children?: ReactNode }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn('relative overflow-hidden bg-powder', className)}>
      {url && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary office URLs
        <img src={url} alt="" loading="lazy" className="size-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <div aria-hidden className="absolute inset-0 grid place-items-center">
          <span className="absolute -bottom-10 -start-6 size-36 rounded-full bg-white/25" />
          <span className="absolute -top-8 end-10 size-24 rounded-full bg-white/20" />
          <Mountain className="relative size-9 text-white/85" strokeWidth={1.25} />
        </div>
      )}
      {children}
    </div>
  );
}
