/**
 * Plain fetchers for the public (no-login) API. Shared by server components
 * (`data.server.ts`, no-store for live seats) and the client "load more" query.
 */
import type { OfficePageResponse, ShowcaseFilters, ShowcaseResponse, TripDetails } from '@/lib/types/public';

export const PUBLIC_API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api').replace(/\/+$/, '');

/** The page or trip does not exist, or the office disabled its public page (the API answers 404 for both). */
export class PublicNotFoundError extends Error {
  constructor() {
    super('Not found');
    this.name = 'PublicNotFoundError';
  }
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${PUBLIC_API_URL}${path}`, { headers: { Accept: 'application/json' }, ...init });
  // 400 = malformed id in the URL; for a visitor it is the same as a missing page.
  if (res.status === 404 || res.status === 400) throw new PublicNotFoundError();
  if (!res.ok) throw new Error(`Public API ${res.status} on ${path}`);
  return (await res.json()) as T;
}

/** URLSearchParams for the showcase endpoint (also used for the page URL). */
export function showcaseParams(filters: ShowcaseFilters, extra: Record<string, string | number> = {}) {
  const p = new URLSearchParams();
  if (filters.search) p.set('search', filters.search);
  if (filters.destination) p.set('destination', filters.destination);
  if (filters.category) p.set('category', filters.category);
  if (filters.tripType) p.set('tripType', filters.tripType);
  if (filters.from) p.set('from', filters.from);
  if (filters.to) p.set('to', filters.to);
  if (filters.offersOnly) p.set('offersOnly', 'true');
  for (const [k, v] of Object.entries(extra)) p.set(k, String(v));
  return p;
}

export const SHOWCASE_PAGE_SIZE = 9;

export function fetchShowcase(filters: ShowcaseFilters, page = 1, init?: RequestInit) {
  const qs = showcaseParams(filters, { page, pageSize: SHOWCASE_PAGE_SIZE }).toString();
  return getJson<ShowcaseResponse>(`/public/showcase?${qs}`, init);
}

export function fetchOfficePage(slug: string, init?: RequestInit) {
  return getJson<OfficePageResponse>(`/public/offices/${encodeURIComponent(slug)}`, init);
}

export function fetchTripPage(slug: string, tripId: string, init?: RequestInit) {
  return getJson<TripDetails>(
    `/public/offices/${encodeURIComponent(slug)}/trips/${encodeURIComponent(tripId)}`,
    init,
  );
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

/** Reads (and sanitises) the showcase filters from the page's search params. */
export function parseShowcaseFilters(sp: Record<string, string | string[] | undefined>): ShowcaseFilters {
  const tripType = one(sp.tripType);
  const from = one(sp.from);
  const to = one(sp.to);
  return {
    search: one(sp.search)?.slice(0, 80),
    destination: one(sp.destination)?.slice(0, 80),
    category: one(sp.category)?.slice(0, 80),
    tripType: tripType === 'VIP' || tripType === 'STANDARD' ? tripType : undefined,
    from: from && ISO_DAY.test(from) ? from : undefined,
    to: to && ISO_DAY.test(to) ? to : undefined,
    offersOnly: one(sp.offersOnly) === 'true' || undefined,
  };
}
