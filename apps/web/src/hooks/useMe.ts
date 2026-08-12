'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys, usersApi, type UserProfile } from '@/lib/api';

export type SubscriptionTier = 'free' | 'pro' | 'business';

export type User = UserProfile;

export function useMe() {
  return useQuery({
    queryKey: queryKeys.user.me(),
    queryFn: () => usersApi.getMe(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useUserPlan() {
  const { data: user } = useMe();
  const tier = (user?.subscriptionTier ?? 'free') as SubscriptionTier;

  return {
    tier,
    isPro: tier === 'pro',
    isBusiness: tier === 'business',
    isFree: tier === 'free',
  };
}
