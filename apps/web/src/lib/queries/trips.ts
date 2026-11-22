'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Paginated, RegistrationDecision } from '@travelos/shared';
import { api } from '@/lib/api';
import type {
  BranchItem,
  EmployeeItem,
  OfferInput,
  OfficeInfo,
  TripDetail,
  TripInput,
  TripListItem,
  TripManifest,
  TripOffer,
  TripQuery,
  TripServiceInput,
} from '@/lib/types/trips';

export const tripKeys = {
  all: ['trips'] as const,
  list: (q: TripQuery) => ['trips', 'list', q] as const,
  detail: (id: string) => ['trips', 'detail', id] as const,
  manifest: (id: string) => ['trips', 'manifest', id] as const,
  waiting: (id: string) => ['trips', 'waiting', id] as const,
};

export function useTrips(q: TripQuery, enabled = true) {
  return useQuery({
    queryKey: tripKeys.list(q),
    queryFn: () => api.get<Paginated<TripListItem>>('/trips', { query: { ...q } }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useTrip(id: string | undefined) {
  return useQuery({
    queryKey: tripKeys.detail(id ?? ''),
    queryFn: () => api.get<TripDetail>(`/trips/${id}`),
    enabled: !!id,
  });
}

export function useTripManifest(id: string, enabled = true) {
  return useQuery({
    queryKey: tripKeys.manifest(id),
    queryFn: () => api.get<TripManifest>(`/trips/${id}/passengers`),
    enabled,
  });
}

/** Waiting-list size, read from the bookings list total (bookings.view). */
export function useTripWaitingCount(id: string, enabled = true) {
  return useQuery({
    queryKey: tripKeys.waiting(id),
    queryFn: () =>
      api
        .get<Paginated<unknown>>('/bookings', { query: { tripId: id, status: 'WAITING_LIST', pageSize: 1 } })
        .then((r) => r.meta.total),
    enabled,
  });
}

// ------------------------------------------------------------------ office data used by the forms

export function useOffice(enabled = true) {
  return useQuery({
    queryKey: ['office'],
    queryFn: () => api.get<OfficeInfo>('/office'),
    staleTime: 5 * 60_000,
    enabled,
  });
}

export function useBranches(enabled = true) {
  return useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get<BranchItem[]>('/branches'),
    staleTime: 5 * 60_000,
    enabled,
  });
}

export function useEmployees(enabled = true) {
  return useQuery({
    queryKey: ['employees'],
    queryFn: () => api.get<EmployeeItem[]>('/employees'),
    staleTime: 60_000,
    enabled,
  });
}

// ------------------------------------------------------------------ mutations

function useInvalidateTrip() {
  const qc = useQueryClient();
  return (id?: string) => {
    void qc.invalidateQueries({ queryKey: tripKeys.all });
    void qc.invalidateQueries({ queryKey: ['tours'] });
    void qc.invalidateQueries({ queryKey: ['suppliers'] });
    void qc.invalidateQueries({ queryKey: ['bookings'] });
    void qc.invalidateQueries({ queryKey: ['dashboard'] });
    if (id) void qc.invalidateQueries({ queryKey: tripKeys.detail(id) });
  };
}

export function useSaveTrip() {
  const invalidate = useInvalidateTrip();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: TripInput }) => {
      if (!id) return api.post<TripDetail>('/trips', input);
      const { services, ...rest } = input;
      await api.patch<TripDetail>(`/trips/${id}`, rest);
      return api.put<TripDetail>(`/trips/${id}/services`, { services: services ?? [] });
    },
    onSuccess: (t) => invalidate(t.id),
  });
}

export function useReplaceServices(id: string) {
  const invalidate = useInvalidateTrip();
  return useMutation({
    mutationFn: (services: TripServiceInput[]) => api.put<TripDetail>(`/trips/${id}/services`, { services }),
    onSuccess: () => invalidate(id),
  });
}

export type TripAction = 'open' | 'unpublish' | 'complete';

export function useTripAction(id: string) {
  const invalidate = useInvalidateTrip();
  return useMutation({
    mutationFn: (action: TripAction) => api.post<TripDetail>(`/trips/${id}/${action}`),
    onSuccess: () => invalidate(id),
  });
}

export function useTripDecision(id: string) {
  const invalidate = useInvalidateTrip();
  return useMutation({
    mutationFn: (body: { decision: RegistrationDecision; newDeadline?: string; note?: string }) =>
      api.post<TripDetail>(`/trips/${id}/decision`, body),
    onSuccess: () => invalidate(id),
  });
}

export function useSetSupervisors(id: string) {
  const invalidate = useInvalidateTrip();
  return useMutation({
    mutationFn: (memberIds: string[]) => api.put<TripDetail>(`/trips/${id}/supervisors`, { memberIds }),
    onSuccess: () => invalidate(id),
  });
}

export function useSetAttendance(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ passengerId, attended }: { passengerId: string; attended: boolean }) =>
      api.patch<{ id: string; attended: boolean }>(`/trips/${tripId}/passengers/${passengerId}/attendance`, { attended }),
    onSuccess: (res) => {
      qc.setQueryData<TripManifest>(tripKeys.manifest(tripId), (old) =>
        old ? { ...old, passengers: old.passengers.map((p) => (p.id === res.id ? { ...p, attended: res.attended } : p)) } : old,
      );
    },
  });
}

export function useSaveOffer(tripId: string) {
  const invalidate = useInvalidateTrip();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: OfferInput }) =>
      id ? api.patch<TripOffer>(`/offers/${id}`, input) : api.post<TripOffer>(`/trips/${tripId}/offers`, input),
    onSuccess: () => invalidate(tripId),
  });
}

export function useDeleteOffer(tripId: string) {
  const invalidate = useInvalidateTrip();
  return useMutation({
    mutationFn: (offerId: string) => api.delete<unknown>(`/offers/${offerId}`),
    onSuccess: () => invalidate(tripId),
  });
}
