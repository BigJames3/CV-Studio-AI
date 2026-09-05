import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.module';
import { FeatureGateService } from '../../common/services/feature-gate.service';

/**
 * DB-backed entitlements. Feature matrix decisions delegate to FeatureGateService.
 */
@Injectable()
export class EntitlementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featureGate: FeatureGateService
  ) {}

  async getTier(userId: string): Promise<'free' | 'pro' | 'business'> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    });
    return (user?.subscriptionTier as 'free' | 'pro' | 'business') ?? 'free';
  }

  async countActiveCvs(userId: string): Promise<number> {
    return this.prisma.cv.count({
      where: { userId, deletedAt: null },
    });
  }

  async can(userId: string, feature: string): Promise<boolean> {
    const tier = await this.getTier(userId);
    const user = { id: userId, subscriptionTier: tier };

    switch (feature) {
      case 'cv:create':
        return this.featureGate.canCreateCV(user, await this.countActiveCvs(userId));
      case 'cv:export:pdf':
      case 'export:pdf':
      case 'downloadPDF':
        return this.featureGate.canDownloadPDF(user);
      case 'cv:print':
      case 'print':
        return this.featureGate.canPrint(user);
      case 'cv:share':
      case 'share':
        return this.featureGate.canShare(user);
      case 'templates:pro':
      case 'proTemplates':
        return this.featureGate.canAccessProTemplates(user);
      case 'templates:business':
      case 'businessTemplates':
        return this.featureGate.canAccessBusinessTemplates(user);
      case 'advancedFeatures':
        return this.featureGate.canAccessAdvancedFeatures(user);
      default:
        break;
    }

    const matrix: Record<string, Array<'free' | 'pro' | 'business'>> = {
      // Étape 13: DOCX generator not ready — entitlement hidden until real export ships
      'cv:export:docx': [],
      'ai:generate': ['pro', 'business'],
      'ai:optimize': ['pro', 'business'],
      'ai:cover_letter': ['pro', 'business'],
      'ai:ats': ['free', 'pro', 'business'],
      'ai:interview': ['pro', 'business'],
      'marketplace:buy': ['pro', 'business'],
      'api:access': ['business'],
    };

    const allowed = matrix[feature];
    if (!allowed) return false;
    return allowed.includes(tier);
  }
}
