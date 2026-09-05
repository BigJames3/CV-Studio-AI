import { Injectable } from '@nestjs/common';
import {
  canAccessAdvancedFeatures,
  canAccessBusinessTemplates,
  canAccessProTemplates,
  canCreateCV,
  canDownloadPDF,
  canPrint,
  canShare,
  canUseTemplateType,
  getAvailableTemplateTypes,
  normalizeTier,
  type FeatureGateUser,
  type TemplateAccessType,
} from '@cvstudio/shared-utils';

export type { FeatureGateUser, TemplateAccessType };

@Injectable()
export class FeatureGateService {
  canCreateCV(user: FeatureGateUser, currentCvCount = 0): boolean {
    return canCreateCV(user, currentCvCount);
  }

  canDownloadPDF(user: FeatureGateUser): boolean {
    return canDownloadPDF(user);
  }

  canPrint(user: FeatureGateUser): boolean {
    return canPrint(user);
  }

  canShare(user: FeatureGateUser): boolean {
    return canShare(user);
  }

  canAccessProTemplates(user: FeatureGateUser): boolean {
    return canAccessProTemplates(user);
  }

  canAccessBusinessTemplates(user: FeatureGateUser): boolean {
    return canAccessBusinessTemplates(user);
  }

  canAccessAdvancedFeatures(user: FeatureGateUser): boolean {
    return (
      this.getTierLevel(normalizeTier(user.subscriptionTier)) >= 1 &&
      canAccessAdvancedFeatures(user)
    );
  }

  getAvailableTemplateTypes(user: FeatureGateUser): TemplateAccessType[] {
    return getAvailableTemplateTypes(user);
  }

  canUseTemplateType(user: FeatureGateUser, type: TemplateAccessType): boolean {
    return canUseTemplateType(user, type);
  }

  private getTierLevel(tier: string): number {
    switch (tier) {
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
}
