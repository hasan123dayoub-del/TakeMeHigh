import 'server-only';
import { headers } from 'next/headers';
import { cache } from 'react';
import type {
  Paged,
  PublicOffer,
  PublicPolicy,
  PublicProgram,
  PublicProgramDetail,
  PublicSite,
  PublicTrip,
  PublicTripDetail,
  RequestOptions,
} from './types';

export const PUBLIC_API = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api').replace(/\/+$/, '');

export class PublicApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * GET a public endpoint on the server (SEO, LND-01). Always fresh: seats and prices are live.
 * Returns `null` on 404 so pages can call `notFound()`; other failures throw.
 */
export async function publicGet<T>(path: string): Promise<T | null> {
  const res = await fetch(`${PUBLIC_API}${path}`, { cache: 'no-store', headers: { accept: 'application/json' } });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new PublicApiError(res.status, `GET ${path} failed with ${res.status}`);
  return (await res.json()) as T;
}

/** Deduplicated per request: the layout, the page and generateMetadata all share one call. */
export const getSite = cache(() => publicGet<PublicSite>('/public/site'));
export const getOffers = cache(async () => (await publicGet<PublicOffer[]>('/public/offers')) ?? []);
export const getTrips = cache(async (query: string) => publicGet<Paged<PublicTrip>>(`/public/trips?${query}`));
export const getPrograms = cache(async (query: string) => publicGet<Paged<PublicProgram>>(`/public/programs?${query}`));
export const getTrip = cache((id: string) => (isUuid(id) ? publicGet<PublicTripDetail>(`/public/trips/${id}`) : Promise.resolve(null)));
export const getProgram = cache((id: string) =>
  isUuid(id) ? publicGet<PublicProgramDetail>(`/public/programs/${id}`) : Promise.resolve(null),
);
export const getPolicy = cache((slug: string) =>
  /^[a-z0-9-]{1,80}$/i.test(slug) ? publicGet<PublicPolicy>(`/public/policies/${encodeURIComponent(slug)}`) : Promise.resolve(null),
);
export const getRequestOptions = cache(() => publicGet<RequestOptions>('/public/request-options'));

const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/** Absolute origin of this site, for the links inside WhatsApp messages and Open Graph. */
export async function getOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '');
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https');
  return `${proto}://${host}`;
}
