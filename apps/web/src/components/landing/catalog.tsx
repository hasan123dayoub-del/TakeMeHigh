'use client';

import { LABELS } from '@travelos/shared';
import { Compass, Loader2, RotateCcw, Tag } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fmt, useLocale, useMessages } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { landingMessages } from './messages';
import { ProductCard } from './product-card';
import type { CatalogFilters, Paged, PublicCategory, PublicOfficeInfo, PublicProduct, PublicProgram, PublicTrip } from './types';
import { bookingLink, CATALOG_PAGE_SIZE, money, nameOf, productPath } from './utils';


const API = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api').replace(/\/+$/, '');
const ALL = '__all';

export interface DestinationOption {
  id: string;
  nameAr: string;
  nameEn: string;
  country: string;
}

interface ListState<T> {
  items: T[];
  page: number;
  totalPages: number;
  total: number;
}

const fromPaged = <T,>(p: Paged<T> | null): ListState<T> => ({
  items: p?.data ?? [],
  page: p?.meta.page ?? 1,
  totalPages: p?.meta.totalPages ?? 1,
  total: p?.meta.total ?? 0,
});

const EMPTY: CatalogFilters = { kind: 'ALL', categoryId: '', scope: '', destinationCityId: '', offersOnly: false };

function query(f: CatalogFilters, page: number) {
  const q = new URLSearchParams({ page: String(page), pageSize: String(CATALOG_PAGE_SIZE) });
  if (f.categoryId) q.set('categoryId', f.categoryId);
  if (f.scope) q.set('scope', f.scope);
  if (f.destinationCityId) q.set('destinationCityId', f.destinationCityId);
  if (f.offersOnly) q.set('offersOnly', 'true');
  return q.toString();
}

async function load<T>(path: 'trips' | 'programs', f: CatalogFilters, page: number, signal?: AbortSignal) {
  const res = await fetch(`${API}/public/${path}?${query(f, page)}`, { signal, headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as Paged<T>;
}

const byDate = (a: PublicProduct, b: PublicProduct) => (a.startsAt ?? '').localeCompare(b.startsAt ?? '');

/**
 * Trips & programs with filters (LND-04) and "show more" pagination (LND-08).
 * The first page is rendered on the server (SEO); filter changes fetch in the browser.
 */
export function Catalog({
  initialTrips,
  initialPrograms,
  categories,
  destinations,
  office,
  origin,
}: {
  initialTrips: Paged<PublicTrip> | null;
  initialPrograms: Paged<PublicProgram> | null;
  categories: PublicCategory[];
  destinations: DestinationOption[];
  office: PublicOfficeInfo;
  origin: string;
}) {
  const t = useMessages(landingMessages);
  const { locale, dir } = useLocale();
  const [filters, setFilters] = useState<CatalogFilters>(EMPTY);
  const [trips, setTrips] = useState(() => fromPaged(initialTrips));
  const [programs, setPrograms] = useState(() => fromPaged(initialPrograms));
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  // The server already rendered the unfiltered first page; refetch only when the API filters change.
  // (The kind switch only changes what is shown.) Safe under StrictMode's double effects.
  const { categoryId, scope, destinationCityId, offersOnly } = filters;
  const apiKey = JSON.stringify([categoryId, scope, destinationCityId, offersOnly]);
  const loadedKey = useRef(JSON.stringify(['', '', '', false]));

  useEffect(() => {
    if (apiKey === loadedKey.current) return;
    const ctrl = new AbortController();
    const f: CatalogFilters = { kind: 'ALL', categoryId, scope, destinationCityId, offersOnly };
    setLoading(true);
    setError(false);
    Promise.all([load<PublicTrip>('trips', f, 1, ctrl.signal), load<PublicProgram>('programs', f, 1, ctrl.signal)])
      .then(([tr, pr]) => {
        loadedKey.current = apiKey;
        setTrips(fromPaged(tr));
        setPrograms(fromPaged(pr));
      })
      .catch((e: unknown) => {
        if ((e as Error).name !== 'AbortError') setError(true);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  const items = useMemo(() => {
    const list: PublicProduct[] = [];
    if (filters.kind !== 'PROGRAM') list.push(...trips.items);
    if (filters.kind !== 'TRIP') list.push(...programs.items);
    return list.sort(byDate);
  }, [trips.items, programs.items, filters.kind]);

  const total = (filters.kind !== 'PROGRAM' ? trips.total : 0) + (filters.kind !== 'TRIP' ? programs.total : 0);
  const moreTrips = filters.kind !== 'PROGRAM' && trips.page < trips.totalPages;
  const morePrograms = filters.kind !== 'TRIP' && programs.page < programs.totalPages;

  async function loadMore() {
    setLoadingMore(true);
    setError(false);
    try {
      const [tr, pr] = await Promise.all([
        moreTrips ? load<PublicTrip>('trips', filters, trips.page + 1) : null,
        morePrograms ? load<PublicProgram>('programs', filters, programs.page + 1) : null,
      ]);
      if (tr) setTrips((s) => ({ ...fromPaged(tr), items: [...s.items, ...tr.data] }));
      if (pr) setPrograms((s) => ({ ...fromPaged(pr), items: [...s.items, ...pr.data] }));
    } catch {
      setError(true);
    } finally {
      setLoadingMore(false);
    }
  }

  const set = (patch: Partial<CatalogFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const dirty = JSON.stringify(filters) !== JSON.stringify(EMPTY);

  const byCountry = useMemo(() => {
    const groups = new Map<string, DestinationOption[]>();
    for (const d of destinations) groups.set(d.country, [...(groups.get(d.country) ?? []), d]);
    return [...groups.entries()];
  }, [destinations]);

  const chip = (active: boolean) =>
    cn(
      'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[13px] font-medium whitespace-nowrap transition-colors',
      active
        ? 'border-ink bg-ink text-ink-foreground'
        : 'border-border bg-surface-raised text-muted hover:border-border-strong hover:text-foreground',
    );

  return (
    <div>
      <div className="grid gap-3 rounded-card border border-border bg-surface-raised/70 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <SegmentedControl
            aria-label={t.filterKind}
            value={filters.kind}
            onValueChange={(kind) => set({ kind })}
            size="md"
            options={[
              { value: 'ALL', label: t.kindAll },
              { value: 'TRIP', label: t.kindTrips },
              { value: 'PROGRAM', label: t.kindPrograms },
            ]}
          />
          <SegmentedControl
            aria-label={t.filterScope}
            value={filters.scope || 'ALL'}
            onValueChange={(v) => set({ scope: v === 'ALL' ? '' : v })}
            size="md"
            options={[
              { value: 'ALL', label: t.scopeAll },
              { value: 'DOMESTIC', label: LABELS.travelScope.DOMESTIC[locale] },
              { value: 'INTERNATIONAL', label: LABELS.travelScope.INTERNATIONAL[locale] },
            ]}
          />
          <div className="flex w-full flex-wrap items-center gap-2.5 sm:ms-auto sm:w-auto">
            <Select
              dir={dir}
              value={filters.destinationCityId || ALL}
              onValueChange={(v) => set({ destinationCityId: v === ALL ? '' : v })}
            >
              <SelectTrigger aria-label={t.filterDestination} className="h-10 min-w-0 flex-1 rounded-full text-start sm:w-52 sm:flex-none">
                <SelectValue placeholder={t.allDestinations} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t.allDestinations}</SelectItem>
                {byCountry.map(([country, list]) => (
                  <SelectGroup key={country}>
                    <SelectLabel>{country}</SelectLabel>
                    {list.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {nameOf(d, locale)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <button type="button" aria-pressed={filters.offersOnly} onClick={() => set({ offersOnly: !filters.offersOnly })} className={chip(filters.offersOnly)}>
              <Tag className="size-3.5" aria-hidden />
              {t.offersOnly}
            </button>
          </div>
        </div>

        <div className="-mx-3 flex gap-2 overflow-x-auto px-3 scrollbar-none sm:-mx-4 sm:px-4" role="group" aria-label={t.filterCategory}>
          <button type="button" aria-pressed={!filters.categoryId} onClick={() => set({ categoryId: '' })} className={chip(!filters.categoryId)}>
            {t.allCategories}
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={filters.categoryId === c.id}
              onClick={() => set({ categoryId: filters.categoryId === c.id ? '' : c.id })}
              className={chip(filters.categoryId === c.id)}
            >
              {nameOf(c, locale)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex min-h-8 items-center justify-between gap-3">
        <p className="text-sm text-muted" role="status" aria-live="polite">
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t.loading}
            </span>
          ) : (
            <span className="num">{fmt(t.resultsCount, { n: total })}</span>
          )}
        </p>
        {dirty && (
          <button type="button" onClick={() => setFilters(EMPTY)} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4">
            <RotateCcw className="size-3.5" aria-hidden />
            {t.resetFilters}
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-tile bg-danger/10 px-4 py-3 text-sm text-danger">
          {t.loadError}
        </p>
      )}

      {items.length > 0 ? (
        <ul className={cn('mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5', loading && 'opacity-60 transition-opacity')}>
          {items.map((item, i) => (
            <li key={`${item.type}-${item.id}`} className="flex">
              <div className="flex w-full flex-col [&>article]:flex-1">
                <ProductCard
                  item={item}
                  t={t}
                  locale={locale}
                  priority={i < 3}
                  bookHref={bookingLink(
                    office,
                    { title: item.title, code: item.code, price: money(item.finalPrice, item.currencyCode, locale), path: productPath(item) },
                    origin,
                  )}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        !loading && (
          <div className="mt-4 flex flex-col items-center rounded-card border border-dashed border-border-strong px-6 py-14 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-accent-soft text-primary">
              <Compass className="size-6" aria-hidden />
            </span>
            <p className="mt-4 font-display text-lg font-medium">{t.noResultsTitle}</p>
            <p className="mt-1 max-w-sm text-sm text-muted">{t.noResultsBody}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {dirty && (
                <button type="button" onClick={() => setFilters(EMPTY)} className={chip(false)}>
                  {t.resetFilters}
                </button>
              )}
              <Link href="/design-your-trip" className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-[13px] font-medium text-primary-foreground">
                {t.designTrip}
              </Link>
            </div>
          </div>
        )
      )}

      {(moreTrips || morePrograms) && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="inline-flex h-12 items-center gap-2 rounded-full border border-border-strong bg-surface-raised px-7 text-[15px] font-medium shadow-card transition-colors hover:border-ink/40 disabled:opacity-60"
          >
            {loadingMore && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {t.loadMore}
          </button>
        </div>
      )}
    </div>
  );
}
