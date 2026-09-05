'use client';

import {
  featureGatesFor,
  canUseTemplateType,
  type TemplateAccessType,
} from '@cvstudio/shared-utils';
import { useUiStore } from '@/stores/ui-store';
import { useMe } from '@/hooks/useMe';
import { useCvsInfinite } from '@/hooks/useCvsInfinite';

export function useFeatureGate() {
  const { data: user } = useMe();
  const { data } = useCvsInfinite();
  const cvCount = data?.pages.flatMap((page) => page.items).length ?? 0;
  const gates = featureGatesFor({ subscriptionTier: user?.subscriptionTier }, cvCount);

  const showUpgrade = (feature: string) => {
    useUiStore.getState().openPaywall(feature, feature, { cvCount, cvLimit: 1 });
  };

  return {
    ...gates,
    cvCount,
    canCreateMoreCVs: gates.canCreateCV,
    canUseTemplateType: (type: TemplateAccessType) =>
      canUseTemplateType({ subscriptionTier: user?.subscriptionTier }, type),
    showUpgrade,
  };
}
