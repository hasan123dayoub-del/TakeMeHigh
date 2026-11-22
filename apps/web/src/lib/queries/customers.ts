'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Paginated } from '@travelos/shared';
import type { Customer, CustomerDetail, CustomerInput, CustomerListItem } from '@/lib/types/customers';

export interface CustomerQuery {
  page: number;
  pageSize: number;
  search?: string;
}

export function useCustomers(q: CustomerQuery, enabled = true) {
  return useQuery({
    queryKey: ['customers', 'list', q],
    queryFn: () => api.get<Paginated<CustomerListItem>>('/customers', { query: { ...q } }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useCustomer(id: string | null | undefined) {
  return useQuery({
    queryKey: ['customers', 'detail', id],
    queryFn: () => api.get<CustomerDetail>(`/customers/${id}`),
    enabled: !!id,
  });
}

/** Look up a customer by phone (used after a 409 "phone already exists"). */
export function findCustomerByPhone(phone: string) {
  const term = phone.replace(/[\s()-]/g, '');
  return api
    .get<Paginated<CustomerListItem>>('/customers', { query: { search: term, pageSize: 5 } })
    .then((r) => r.data.find((c) => c.phone.replace(/[\s()-]/g, '') === term) ?? r.data[0] ?? null);
}

export function useSaveCustomer(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomerInput) =>
      id ? api.patch<Customer>(`/customers/${id}`, input) : api.post<Customer>('/customers', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}
