'use client';

import { useMemo } from 'react';
import {
  canAccessAdvancedFeatures,
  canAccessBusinessTemplates,
  canAccessProTemplates,
  canAccessTemplate,
  canCreateCV,
  canDownloadPDF,
  canPrint,
  canShare,
  getAvailableTemplateTypes,
  normalizeTier,
  resolveTemplateAccessTier,
  type FeatureGateUser,
} from '@cvstudio/shared-utils';
import { useMe } from '@/hooks/useMe';
import { useCvsInfinite } from '@/hooks/useCvsInfinite';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';

export function useFeatureGate() {
  const { data: profile } = useMe();
  const authUser = useAuthStore((s) => s.user);
  const cvsQuery = useCvsInfinite();
  const openPaywall = useUiStore((s) => s.openPaywall);

  const cvCount = cvsQuery.data?.pages.flatMap((page) => page.items).length ?? 0;

  const user: FeatureGateUser = useMemo(
    () => ({
      id: profile?.id ?? authUser?.id,
      subscriptionTier: profile?.subscriptionTier ?? authUser?.subscriptionTier ?? 'free',
    }),
    [profile?.id, profile?.subscriptionTier, authUser?.id, authUser?.subscriptionTier]
  );

  const tier = normalizeTier(user.subscriptionTier);

  return {
    tier,
    cvCount,
    user,
    canCreateMoreCVs: canCreateCV(user, cvCount),
    canDownloadPDF: canDownloadPDF(user),
    canPrint: canPrint(user),
    canShare: canShare(user),
    canAccessProTemplates: canAccessProTemplates(user),
    canAccessBusinessTemplates: canAccessBusinessTemplates(user),
    canAccessAdvancedFeatures: canAccessAdvancedFeatures(user),
    availableTemplateTypes: getAvailableTemplateTypes(user),
    canAccessTemplate: (template: {
      isPremium?: boolean | null;
      accessTier?: string | null;
      designData?: { tier?: string } | null;
    }) => canAccessTemplate(user, template),
    templateAccessTier: resolveTemplateAccessTier,
    showUpgrade: (feature: string) => openPaywall(feature, feature, { cvCount, cvLimit: 1 }),
  };
}
