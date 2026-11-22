'use client';

import type { Paginated } from '@travelos/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ME_QUERY_KEY } from '@/lib/auth';
import type { TripOption } from '@/lib/types/reports';
import type {
  Banner,
  BannerInput,
  Branch,
  BranchInput,
  CreateEmployeeInput,
  Currency,
  Employee,
  Office,
  PermissionInfo,
  Role,
  RoleInput,
  UpdateEmployeeInput,
  UpdateOfficeInput,
} from '@/lib/types/settings';

export const settingsKeys = {
  office: ['settings', 'office'] as const,
  currencies: ['settings', 'currencies'] as const,
  branches: ['settings', 'branches'] as const,
  employees: (search = '') => ['settings', 'employees', search] as const,
  employeesAll: ['settings', 'employees'] as const,
  roles: ['settings', 'roles'] as const,
  permissions: ['settings', 'permissions'] as const,
  banners: ['settings', 'banners'] as const,
  bannerTrips: (search: string) => ['settings', 'banner-trips', search] as const,
};

// ------------------------------------------------------------------ office & currencies

export function useOffice() {
  return useQuery({ queryKey: settingsKeys.office, queryFn: () => api.get<Office>('/office') });
}

export function useCurrencies() {
  return useQuery({
    queryKey: settingsKeys.currencies,
    queryFn: () => api.get<Currency[]>('/currencies'),
    staleTime: 10 * 60_000,
  });
}

export function useUpdateOffice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateOfficeInput) => api.patch<Office>('/office', input),
    onSuccess: (office) => {
      qc.setQueryData(settingsKeys.office, office);
      // name / logo / default currency / locale are part of the session's office ref
      void qc.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
  });
}

export function useSetCurrencies() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (codes: string[]) => api.put<Office>('/office/currencies', { codes }),
    onSuccess: (office) => qc.setQueryData(settingsKeys.office, office),
  });
}

// ------------------------------------------------------------------ branches

export function useBranches(enabled = true) {
  return useQuery({ queryKey: settingsKeys.branches, queryFn: () => api.get<Branch[]>('/branches'), enabled });
}

export function useSaveBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: BranchInput }) =>
      id ? api.patch<Branch>(`/branches/${id}`, input) : api.post<Branch>('/branches', input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: settingsKeys.branches });
      void qc.invalidateQueries({ queryKey: settingsKeys.office });
    },
  });
}

// ------------------------------------------------------------------ employees

export function useEmployees(search: string, enabled = true) {
  return useQuery({
    queryKey: settingsKeys.employees(search),
    queryFn: () => api.get<Employee[]>('/employees', { query: { search: search || undefined } }),
    enabled,
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEmployeeInput) => api.post<Employee>('/employees', input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: settingsKeys.employeesAll });
      void qc.invalidateQueries({ queryKey: settingsKeys.branches });
      void qc.invalidateQueries({ queryKey: settingsKeys.roles });
    },
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateEmployeeInput }) => api.patch<Employee>(`/employees/${id}`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: settingsKeys.employeesAll });
      void qc.invalidateQueries({ queryKey: settingsKeys.branches });
      void qc.invalidateQueries({ queryKey: settingsKeys.roles });
    },
  });
}

// ------------------------------------------------------------------ roles & permissions

/** GET /roles needs `employees.manage` (used by the employee form too). */
export function useRoles(enabled = true) {
  return useQuery({ queryKey: settingsKeys.roles, queryFn: () => api.get<Role[]>('/roles'), enabled });
}

/** GET /permissions needs `roles.manage`. */
export function usePermissionCatalogue(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.permissions,
    queryFn: () => api.get<PermissionInfo[]>('/permissions'),
    staleTime: 10 * 60_000,
    enabled,
  });
}

export function useSaveRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: RoleInput }) =>
      id ? api.patch<Role>(`/roles/${id}`, input) : api.post<Role>('/roles', input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: settingsKeys.roles });
      void qc.invalidateQueries({ queryKey: settingsKeys.employeesAll });
      void qc.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ deleted: true }>(`/roles/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: settingsKeys.roles }),
  });
}

// ------------------------------------------------------------------ ads (banners)

export function useBanners(enabled = true) {
  return useQuery({ queryKey: settingsKeys.banners, queryFn: () => api.get<Banner[]>('/banners'), enabled });
}

export function useSaveBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: Partial<BannerInput> }) =>
      id ? api.patch<Banner>(`/banners/${id}`, input) : api.post<Banner>('/banners', input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: settingsKeys.banners }),
  });
}

export function useDeleteBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ deleted: true }>(`/banners/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: settingsKeys.banners }),
  });
}

/** Trips that an ad can link to (live trips first). */
export function useBannerTrips(search: string, enabled = true) {
  return useQuery({
    queryKey: settingsKeys.bannerTrips(search),
    queryFn: () =>
      api.get<Paginated<TripOption>>('/trips', { query: { search: search || undefined, pageSize: 30, when: 'upcoming' } }),
    enabled,
  });
}
