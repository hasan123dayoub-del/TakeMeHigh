'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DashboardData } from '@/lib/types/dashboard';

export const dashboardKeys = {
  all: ['dashboard'] as const,
};

/** GET /dashboard: KPIs, upcoming trips, tasks, recent bookings, finance (financial roles) and activity. */
export function useDashboard() {
  return useQuery({
    queryKey: dashboardKeys.all,
    queryFn: () => api.get<DashboardData>('/dashboard'),
    refetchInterval: 60_000,
  });
}
