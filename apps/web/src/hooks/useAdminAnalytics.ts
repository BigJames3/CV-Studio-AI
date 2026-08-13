'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsApi, queryKeys } from '@/lib/api';

export function useAdminMetrics() {
  return useQuery({
    queryKey: queryKeys.adminMetrics,
    queryFn: () => analyticsApi.metrics(),
    staleTime: 60_000,
    retry: false,
  });
}

export function useAdminRevenueHistory(months = 12) {
  return useQuery({
    queryKey: [...queryKeys.adminRevenue, months] as const,
    queryFn: () => analyticsApi.revenueHistory(months),
    staleTime: 60_000,
    retry: false,
  });
}

export function useAdminFunnel() {
  return useQuery({
    queryKey: queryKeys.adminFunnel,
    queryFn: () => analyticsApi.funnel(),
    staleTime: 60_000,
    retry: false,
  });
}

export function useAdminCohort(months = 12) {
  return useQuery({
    queryKey: [...queryKeys.adminCohort, months] as const,
    queryFn: () => analyticsApi.cohortRetention(months),
    staleTime: 60_000,
    retry: false,
  });
}

export function useAdminCac() {
  return useQuery({
    queryKey: queryKeys.adminCac,
    queryFn: () => analyticsApi.cac('month'),
    staleTime: 60_000,
    retry: false,
  });
}

export function useAdminLtv() {
  return useQuery({
    queryKey: queryKeys.adminLtv,
    queryFn: () => analyticsApi.ltv(),
    staleTime: 60_000,
    retry: false,
  });
}
