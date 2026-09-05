import { Injectable } from '@nestjs/common';
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
  getTierLevel,
  type FeatureGateUser,
  type TemplateAccessType,
} from '@cvstudio/shared-utils';

export type { FeatureGateUser, TemplateAccessType };

/**
 * Pure feature-matrix checks. No DB access — pass the user (and CV count) in.
 * Authoritative logic lives in @cvstudio/shared-utils so web + API cannot drift.
 */
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
    return canAccessAdvancedFeatures(user);
  }

  getAvailableTemplateTypes(user: FeatureGateUser): TemplateAccessType[] {
    return getAvailableTemplateTypes(user);
  }

  canAccessTemplate(
    user: FeatureGateUser,
    template: {
      isPremium?: boolean | null;
      accessTier?: string | null;
      designData?: { tier?: string } | null;
    }
  ): boolean {
    return canAccessTemplate(user, template);
  }

  /** Exposed for tests / comparisons. Unknown tiers rank as free. */
  getTierLevel(tier?: string | null): number {
    return getTierLevel(tier);
  }
}
