'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  BookableTrip,
  BookingDetail,
  BookingListItem,
  BookingQuery,
  Branch,
  CreateBookingInput,
  OfficeProfile,
  Paginated,
  PassengerInput,
  Refund,
} from '@/lib/types/bookings';

export const bookingKeys = {
  all: ['bookings'] as const,
  list: (q: BookingQuery) => ['bookings', 'list', q] as const,
  detail: (id: string) => ['bookings', 'detail', id] as const,
};

export function useBookings(q: BookingQuery) {
  return useQuery({
    queryKey: bookingKeys.list(q),
    queryFn: () => api.get<Paginated<BookingListItem>>('/bookings', { query: { ...q } }),
    placeholderData: keepPreviousData,
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: () => api.get<BookingDetail>(`/bookings/${id}`),
  });
}

/** OPEN, upcoming trips the user may book (the API already limits to the user's branch). */
export function useOpenTrips(search: string) {
  return useQuery({
    queryKey: ['trips', 'bookable', search],
    queryFn: () =>
      api.get<Paginated<BookableTrip>>('/trips', {
        query: { status: 'OPEN', when: 'upcoming', pageSize: 50, order: 'ASC', search: search || undefined },
      }),
    placeholderData: keepPreviousData,
  });
}

export function useTrip(id: string | null | undefined) {
  return useQuery({
    queryKey: ['trips', 'bookable-one', id],
    queryFn: () => api.get<BookableTrip>(`/trips/${id}`),
    enabled: !!id,
  });
}

export function useBranches(enabled = true) {
  return useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get<Branch[]>('/branches'),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useOfficeProfile() {
  return useQuery({
    queryKey: ['office', 'profile'],
    queryFn: () => api.get<OfficeProfile>('/office'),
    staleTime: 5 * 60_000,
  });
}

/** Everything a booking change can affect: bookings, trips (seats), customers (balances), payments. */
function useInvalidateBookingWorld() {
  const qc = useQueryClient();
  return () =>
    Promise.all(
      [['bookings'], ['trips'], ['customers'], ['payments'], ['refunds'], ['dashboard'], ['reports']].map((queryKey) =>
        qc.invalidateQueries({ queryKey }),
      ),
    );
}

export function useCreateBooking() {
  const invalidate = useInvalidateBookingWorld();
  return useMutation({
    mutationFn: (input: CreateBookingInput) => api.post<BookingDetail>('/bookings', input),
    onSuccess: () => invalidate(),
  });
}

/** Booking-level actions; each resolves with the fresh booking from the server. */
export function useBookingActions(id: string) {
  const qc = useQueryClient();
  const invalidate = useInvalidateBookingWorld();
  const onSuccess = (b: BookingDetail) => {
    qc.setQueryData(bookingKeys.detail(id), b);
    return invalidate();
  };
  return {
    confirm: useMutation({ mutationFn: () => api.post<BookingDetail>(`/bookings/${id}/confirm`), onSuccess }),
    waitlist: useMutation({ mutationFn: () => api.post<BookingDetail>(`/bookings/${id}/waitlist`), onSuccess }),
    cancel: useMutation({
      mutationFn: (reason: string) => api.post<BookingDetail>(`/bookings/${id}/cancel`, { reason }),
      onSuccess,
    }),
    transfer: useMutation({
      mutationFn: (body: { targetTripId: string; reason?: string }) => api.post<BookingDetail>(`/bookings/${id}/transfer`, body),
      onSuccess,
    }),
    update: useMutation({
      mutationFn: (body: { notes?: string; passengers?: PassengerInput[] }) => api.patch<BookingDetail>(`/bookings/${id}`, body),
      onSuccess,
    }),
    pay: useMutation({
      mutationFn: (body: { amount: string; currencyCode: string; notes?: string }) => api.post<unknown>(`/bookings/${id}/payments`, body),
      onSuccess: () => invalidate(),
    }),
    refund: useMutation({
      mutationFn: ({ paymentId, ...body }: { paymentId: string; amount: string; reason: string }) =>
        api.post<Refund>(`/payments/${paymentId}/refunds`, body),
      onSuccess: () => invalidate(),
    }),
  };
}
