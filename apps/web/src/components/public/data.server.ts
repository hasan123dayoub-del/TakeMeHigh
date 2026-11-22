import 'server-only';
import { cache } from 'react';
import { fetchOfficePage, fetchShowcase, fetchTripPage } from './api';
import type { ShowcaseFilters } from '@/lib/types/public';

/*
 * Server-side reads for the public pages. `no-store` because seats and offers are live;
 * `cache()` dedupes the request between generateMetadata and the page in one render.
 */
const live: RequestInit = { cache: 'no-store' };

export const getOfficePage = cache((slug: string) => fetchOfficePage(slug, live));
export const getTripPage = cache((slug: string, tripId: string) => fetchTripPage(slug, tripId, live));
export const getShowcase = cache((key: string) => fetchShowcase(JSON.parse(key) as ShowcaseFilters, 1, live));
