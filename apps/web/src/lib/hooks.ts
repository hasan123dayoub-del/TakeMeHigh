'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import type { Paginated } from '@travelos/shared';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { api, errorMessage } from './api';
import { useLocale } from './i18n';
import type { Lookups } from './types/api';

export type Params = Record<string, string | number | boolean | null | undefined>;

/** A paginated list from the API (RPT-03). Keeps the previous page visible while the next loads. */
export function useList<T>(path: string, params: Params = {}, opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: [path, params],
    queryFn: () => api.get<Paginated<T>>(path, { query: params }),
    placeholderData: keepPreviousData,
    enabled: opts.enabled ?? true,
  });
}

/** Any GET resource. `useResource<TripDetail>(\`/trips/${id}\`)` */
export function useResource<T>(path: string | null, params?: Params, opts: { enabled?: boolean; refetchInterval?: number } = {}) {
  return useQuery({
    queryKey: [path, params ?? {}],
    queryFn: () => api.get<T>(path!, { query: params }),
    enabled: !!path && (opts.enabled ?? true),
    refetchInterval: opts.refetchInterval,
  });
}

/** Active options for every select (REF-03: disabled items never appear). */
export function useLookups() {
  return useQuery({ queryKey: ['/lookups'], queryFn: () => api.get<Lookups>('/lookups'), staleTime: 5 * 60_000 });
}

/** Picks nameAr / nameEn for the current language. */
export function useName() {
  const { locale } = useLocale();
  return useCallback((x: { nameAr: string; nameEn?: string | null } | null | undefined) => (x ? (locale === 'en' && x.nameEn ? x.nameEn : x.nameAr) : '—'), [locale]);
}

/**
 * List state kept in the URL (?page=2&status=OPEN), so notification links and the back button
 * restore filters exactly.
 */
export function useUrlState<T extends Record<string, string | undefined>>(defaults: T) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const state = useMemo(() => {
    const out: Record<string, string | undefined> = { ...defaults };
    for (const key of Object.keys(defaults)) {
      const v = search.get(key);
      if (v !== null) out[key] = v;
    }
    // filters not declared in defaults are kept too (e.g. links from notifications)
    search.forEach((v, k) => {
      if (!(k in out)) out[k] = v;
    });
    return out as T & Record<string, string | undefined>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const set = useCallback(
    (patch: Partial<Record<string, string | number | undefined | null>>, resetPage = true) => {
      const next = new URLSearchParams(search.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === null || v === '' || String(v) === defaults[k]) next.delete(k);
        else next.set(k, String(v));
      }
      if (resetPage && !('page' in patch)) next.delete('page');
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [search, router, pathname, defaults],
  );
  return [state, set] as const;
}

/**
 * Mutation with toasts and cache invalidation.
 * `const save = useApiMutation((body) => api.post('/branches', body), { success: 'Saved', invalidate: ['/branches'] })`
 */
export function useApiMutation<TBody, TResult = unknown>(
  fn: (body: TBody) => Promise<TResult>,
  opts: { success?: string | ((r: TResult) => string); invalidate?: (string | QueryKey)[]; onSuccess?: (r: TResult) => void; silent?: boolean } = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (r) => {
      for (const key of opts.invalidate ?? []) await qc.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
      if (opts.success) toast.success(typeof opts.success === 'function' ? opts.success(r) : opts.success);
      opts.onSuccess?.(r);
    },
    onError: (e) => {
      if (!opts.silent) toast.error(errorMessage(e));
    },
  });
}

/** Invalidates every cached query whose key starts with one of these API paths. */
export function useInvalidate() {
  const qc = useQueryClient();
  return useCallback(
    (...paths: string[]) =>
      Promise.all(
        paths.map((p) =>
          qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === 'string' && (q.queryKey[0] as string).startsWith(p) }),
        ),
      ),
    [qc],
  );
}
