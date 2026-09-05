export type SubscriptionTier = 'free' | 'pro' | 'business';
export type TemplateAccessType = 'free' | 'pro' | 'business';

export type FeatureGateUser = {
  id?: string;
  subscriptionTier?: string | null;
};

export const PAID_TIERS: readonly SubscriptionTier[] = ['pro', 'business'];

export function normalizeTier(tier?: string | null): SubscriptionTier {
  if (tier === 'pro' || tier === 'business') return tier;
  return 'free';
}

export function getTierLevel(tier?: string | null): number {
  switch (normalizeTier(tier)) {
    case 'free':
      return 0;
    case 'pro':
      return 1;
    case 'business':
      return 2;
    default:
      return 0;
  }
}

export function canCreateCV(user: FeatureGateUser, currentCvCount = 0): boolean {
  if (normalizeTier(user.subscriptionTier) === 'free') {
    return currentCvCount < 1;
  }
  return true;
}

export function canDownloadPDF(user: FeatureGateUser): boolean {
  return normalizeTier(user.subscriptionTier) !== 'free';
}

export function canPrint(user: FeatureGateUser): boolean {
  return canDownloadPDF(user);
}

export function canShare(user: FeatureGateUser): boolean {
  return canDownloadPDF(user);
}

/** Pro templates are Business-only (feature matrix). */
export function canAccessProTemplates(user: FeatureGateUser): boolean {
  return normalizeTier(user.subscriptionTier) === 'business';
}

export function canAccessBusinessTemplates(user: FeatureGateUser): boolean {
  return normalizeTier(user.subscriptionTier) === 'business';
}

export function canAccessAdvancedFeatures(user: FeatureGateUser): boolean {
  return normalizeTier(user.subscriptionTier) !== 'free';
}

export function getAvailableTemplateTypes(user: FeatureGateUser): TemplateAccessType[] {
  if (normalizeTier(user.subscriptionTier) === 'business') {
    return ['free', 'pro', 'business'];
  }
  return ['free'];
}

export function resolveTemplateAccessTier(template: {
  isPremium?: boolean | null;
  accessTier?: string | null;
  designData?: { tier?: string } | null;
}): TemplateAccessType {
  const explicit = template.accessTier ?? template.designData?.tier;
  if (explicit === 'free' || explicit === 'pro' || explicit === 'business') return explicit;
  return template.isPremium ? 'pro' : 'free';
}

export function canAccessTemplate(
  user: FeatureGateUser,
  template: Parameters<typeof resolveTemplateAccessTier>[0]
): boolean {
  const type = resolveTemplateAccessTier(template);
  return getAvailableTemplateTypes(user).includes(type);
}
