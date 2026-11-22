'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Paginated } from '@travelos/shared';
import { api } from '@/lib/api';
import type {
  IntegrationConfigInput,
  IntegrationHealthResult,
  SupplierDetail,
  SupplierInput,
  SupplierIntegrationView,
  SupplierListItem,
  SupplierPayment,
  SupplierPaymentInput,
  SupplierQuery,
} from '@/lib/types/suppliers';

export const supplierKeys = {
  all: ['suppliers'] as const,
  list: (q: SupplierQuery) => ['suppliers', 'list', q] as const,
  detail: (id: string) => ['suppliers', 'detail', id] as const,
  integration: (id: string) => ['suppliers', 'integration', id] as const,
};

export function useSuppliers(q: SupplierQuery, enabled = true) {
  return useQuery({
    queryKey: supplierKeys.list(q),
    queryFn: () => api.get<Paginated<SupplierListItem>>('/suppliers', { query: { ...q } }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useSupplier(id: string | undefined) {
  return useQuery({
    queryKey: supplierKeys.detail(id ?? ''),
    queryFn: () => api.get<SupplierDetail>(`/suppliers/${id}`),
    enabled: !!id,
  });
}

export function useSupplierIntegration(id: string, enabled = true) {
  return useQuery({
    queryKey: supplierKeys.integration(id),
    queryFn: () => api.get<SupplierIntegrationView>(`/suppliers/${id}/integration`),
    enabled,
  });
}

function useInvalidateSuppliers() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: supplierKeys.all });
    void qc.invalidateQueries({ queryKey: ['trips'] });
  };
}

export function useSaveSupplier() {
  const invalidate = useInvalidateSuppliers();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: SupplierInput }) =>
      id ? api.patch<SupplierListItem>(`/suppliers/${id}`, input) : api.post<SupplierListItem>('/suppliers', input),
    onSuccess: invalidate,
  });
}

export function useDeleteSupplier() {
  const invalidate = useInvalidateSuppliers();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ deleted: boolean }>(`/suppliers/${id}`),
    onSuccess: invalidate,
  });
}

export function useRecordSupplierPayment(id: string) {
  const invalidate = useInvalidateSuppliers();
  return useMutation({
    mutationFn: (input: SupplierPaymentInput) => api.post<SupplierPayment>(`/suppliers/${id}/payments`, input),
    onSuccess: invalidate,
  });
}

export function useSaveIntegration(id: string) {
  const invalidate = useInvalidateSuppliers();
  return useMutation({
    mutationFn: (input: IntegrationConfigInput) => api.put<SupplierIntegrationView['integration']>(`/suppliers/${id}/integration`, input),
    onSuccess: invalidate,
  });
}

export function useCheckIntegration(id: string) {
  const invalidate = useInvalidateSuppliers();
  return useMutation({
    mutationFn: () => api.post<IntegrationHealthResult>(`/suppliers/${id}/integration/health`),
    onSuccess: invalidate,
  });
}
