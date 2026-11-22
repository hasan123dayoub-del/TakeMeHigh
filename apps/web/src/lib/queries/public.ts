'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchShowcase } from '@/components/public/api';
import type { ShowcaseFilters, ShowcaseResponse } from '@/lib/types/public';

export const publicKeys = {
  showcase: (filters: ShowcaseFilters) => ['public', 'showcase', filters] as const,
};

/**
 * Showcase pages for "load more". The first page is rendered on the server and passed in
 * as `initial`, so the hook only hits the API for page 2 onwards.
 */
export function useShowcasePages(filters: ShowcaseFilters, initial: ShowcaseResponse) {
  return useInfiniteQuery({
    queryKey: publicKeys.showcase(filters),
    queryFn: ({ pageParam }) => fetchShowcase(filters, pageParam),
    initialPageParam: 1,
    initialData: { pages: [initial], pageParams: [1] },
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
    // Seats are live: keep the server-rendered first page as-is, never refetch it in the background.
    staleTime: Infinity,
    gcTime: 0,
  });
}
