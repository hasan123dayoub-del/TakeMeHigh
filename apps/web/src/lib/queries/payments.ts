'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { Paginated } from '@travelos/shared';
import { api } from '@/lib/api';
import type { ListQuery, PaymentListItem, PaymentReceipt, RefundListItem } from '@/lib/types/payments';

export function usePayments(q: ListQuery, enabled = true) {
  return useQuery({
    queryKey: ['payments', 'list', q],
    queryFn: () => api.get<Paginated<PaymentListItem>>('/payments', { query: { ...q } }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useRefunds(q: ListQuery, enabled = true) {
  return useQuery({
    queryKey: ['refunds', 'list', q],
    queryFn: () => api.get<Paginated<RefundListItem>>('/refunds', { query: { ...q } }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useReceipt(id: string) {
  return useQuery({
    queryKey: ['payments', 'receipt', id],
    queryFn: () => api.get<PaymentReceipt>(`/payments/${id}/receipt`),
  });
}
