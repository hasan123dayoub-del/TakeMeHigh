'use client';

import type { Paginated } from '@travelos/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CustomerOption, Report, ReportFilters, ReportType, TripOption } from '@/lib/types/reports';

export const reportKeys = {
  all: ['reports'] as const,
  report: (type: ReportType, filters: ReportFilters) => ['reports', type, filters] as const,
  tripOptions: (search: string) => ['reports', 'trip-options', search] as const,
  tripOption: (id: string) => ['reports', 'trip-option', id] as const,
  customerOptions: (search: string) => ['reports', 'customer-options', search] as const,
  customerOption: (id: string) => ['reports', 'customer-option', id] as const,
};

/** Drop empty filters so the query key and URL stay clean. */
export function cleanFilters(f: ReportFilters): ReportFilters {
  return Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined && v !== '')) as ReportFilters;
}

export function useReport(type: ReportType, filters: ReportFilters, enabled = true) {
  const clean = cleanFilters(filters);
  return useQuery({
    queryKey: reportKeys.report(type, clean),
    queryFn: () => api.get<Report>(`/reports/${type}`, { query: { ...clean } }),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useTripOptions(search: string, enabled = true) {
  return useQuery({
    queryKey: reportKeys.tripOptions(search),
    queryFn: () =>
      api.get<Paginated<TripOption>>('/trips', { query: { search: search || undefined, pageSize: 20, order: 'DESC' } }),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useTripOption(id: string | undefined) {
  return useQuery({
    queryKey: reportKeys.tripOption(id ?? ''),
    queryFn: () => api.get<TripOption>(`/trips/${id}`),
    enabled: !!id,
  });
}

export function useCustomerOptions(search: string, enabled = true) {
  return useQuery({
    queryKey: reportKeys.customerOptions(search),
    queryFn: () => api.get<Paginated<CustomerOption>>('/customers', { query: { search: search || undefined, pageSize: 20 } }),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useCustomerOption(id: string | undefined) {
  return useQuery({
    queryKey: reportKeys.customerOption(id ?? ''),
    queryFn: () => api.get<CustomerOption>(`/customers/${id}`),
    enabled: !!id,
  });
}
