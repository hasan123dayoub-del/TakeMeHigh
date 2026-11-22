'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Paginated } from '@travelos/shared';
import { api } from '@/lib/api';
import type { TourCategory, TourDetail, TourImage, TourInput, TourListItem, TourQuery } from '@/lib/types/tours';

export const tourKeys = {
  all: ['tours'] as const,
  list: (q: TourQuery) => ['tours', 'list', q] as const,
  detail: (id: string) => ['tours', 'detail', id] as const,
  categories: ['tour-categories'] as const,
};

export function useTours(q: TourQuery, enabled = true) {
  return useQuery({
    queryKey: tourKeys.list(q),
    queryFn: () => api.get<Paginated<TourListItem>>('/tours', { query: { ...q } }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useTour(id: string | undefined) {
  return useQuery({
    queryKey: tourKeys.detail(id ?? ''),
    queryFn: () => api.get<TourDetail>(`/tours/${id}`),
    enabled: !!id,
  });
}

export function useTourCategories(enabled = true) {
  return useQuery({
    queryKey: tourKeys.categories,
    queryFn: () => api.get<TourCategory[]>('/tour-categories'),
    enabled,
  });
}

function useInvalidateTours() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: tourKeys.all });
    void qc.invalidateQueries({ queryKey: tourKeys.categories });
  };
}

export function useSaveTour() {
  const invalidate = useInvalidateTours();
  return useMutation({
    mutationFn: ({ id, input, images }: { id?: string; input: TourInput; images?: Pick<TourImage, 'url' | 'caption'>[] }) =>
      (id ? api.patch<TourDetail>(`/tours/${id}`, input) : api.post<TourDetail>('/tours', input)).then((tour) =>
        images
          ? api.put<TourDetail>(`/tours/${tour.id}/images`, {
              images: images.map((i) => ({ url: i.url, ...(i.caption ? { caption: i.caption } : {}) })),
            })
          : tour,
      ),
    onSuccess: invalidate,
  });
}

export function useToggleTourActive() {
  const invalidate = useInvalidateTours();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.patch<TourDetail>(`/tours/${id}`, { isActive }),
    onSuccess: invalidate,
  });
}

export function useDeleteTour() {
  const invalidate = useInvalidateTours();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ deleted: boolean }>(`/tours/${id}`),
    onSuccess: invalidate,
  });
}

export function useSaveCategory() {
  const invalidate = useInvalidateTours();
  return useMutation({
    mutationFn: ({ id, name, nameAr }: { id?: string; name: string; nameAr?: string }) => {
      const body = { name, ...(nameAr ? { nameAr } : {}) };
      return id ? api.patch<TourCategory>(`/tour-categories/${id}`, body) : api.post<TourCategory>('/tour-categories', body);
    },
    onSuccess: invalidate,
  });
}

export function useDeleteCategory() {
  const invalidate = useInvalidateTours();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ deleted: boolean }>(`/tour-categories/${id}`),
    onSuccess: invalidate,
  });
}
