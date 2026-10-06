'use client';

import {
  featureGatesFor,
  canUseTemplateType,
  getCvLimit,
  type TemplateAccessType,
} from '@cvstudio/shared-utils';
import { useQuery } from '@tanstack/react-query';
import { queryKeys, subscriptionsApi } from '@/lib/api';
import { useUiStore } from '@/stores/ui-store';
import { useMe } from '@/hooks/useMe';
import { useCvsInfinite } from '@/hooks/useCvsInfinite';

export function useFeatureGate() {
  const { data: user } = useMe();
  const { data } = useCvsInfinite();
  const { data: sub } = useQuery({
    queryKey: queryKeys.subscription,
    queryFn: () => subscriptionsApi.me(),
  });

  const loadedCount = data?.pages.flatMap((page) => page.items).length ?? 0;
  const cvLimit = sub?.cvLimit ?? getCvLimit(user?.subscriptionTier);
  const cvCount = sub?.cvCount ?? loadedCount;
  const gates = featureGatesFor({ subscriptionTier: user?.subscriptionTier }, cvCount);

  const showUpgrade = (feature: string) => {
    useUiStore.getState().openPaywall(feature, feature, { cvCount, cvLimit });
  };

  return {
    ...gates,
    cvCount,
    cvLimit,
    cvRemaining: sub?.cvRemaining ?? Math.max(0, cvLimit - cvCount),
    canCreateMoreCVs: sub?.entitlements.cvCreate ?? gates.canCreateCV,
    canUseTemplateType: (type: TemplateAccessType) =>
      canUseTemplateType({ subscriptionTier: user?.subscriptionTier }, type),
    showUpgrade,
  };
}
