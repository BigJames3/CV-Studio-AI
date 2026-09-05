import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.module';
import { FeatureGateService } from '../../common/services/feature-gate.service';
import { AuditLogService } from '../../common/services/audit-log.service';

/**
 * Server-side feature gates. Loads current tier from DB (JWT can be stale after Stripe webhooks),
 * then delegates the matrix to FeatureGateService.
 */
@Injectable()
export class EntitlementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featureGate: FeatureGateService,
    private readonly auditLog: AuditLogService
  ) {}

  async getTier(userId: string): Promise<'free' | 'pro' | 'business'> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    });
    return (user?.subscriptionTier as 'free' | 'pro' | 'business') ?? 'free';
  }

  async gatedUser(userId: string) {
    const subscriptionTier = await this.getTier(userId);
    return { id: userId, subscriptionTier };
  }

  async can(userId: string, feature: string): Promise<boolean> {
    const user = await this.gatedUser(userId);

    if (feature === 'cv:create') {
      const count = await this.prisma.cv.count({
        where: { userId, deletedAt: null },
      });
      return this.featureGate.canCreateCV(user, count);
    }

    if (feature === 'cv:export:pdf' || feature === 'downloadPDF') {
      return this.featureGate.canDownloadPDF(user);
    }
    if (feature === 'cv:print' || feature === 'print') {
      return this.featureGate.canPrint(user);
    }
    if (feature === 'cv:share' || feature === 'share') {
      return this.featureGate.canShare(user);
    }
    if (feature === 'templates:pro' || feature === 'proTemplates') {
      return this.featureGate.canAccessProTemplates(user);
    }
    if (feature === 'templates:business' || feature === 'businessTemplates') {
      return this.featureGate.canAccessBusinessTemplates(user);
    }
    if (feature === 'advancedFeatures') {
      return this.featureGate.canAccessAdvancedFeatures(user);
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
    return allowed.includes(user.subscriptionTier);
  }

  async snapshot(userId: string) {
    const user = await this.gatedUser(userId);
    const cvCount = await this.prisma.cv.count({
      where: { userId, deletedAt: null },
    });
    return {
      tier: user.subscriptionTier,
      cvCount,
      entitlements: {
        cvCreate: this.featureGate.canCreateCV(user, cvCount),
        exportPdf: this.featureGate.canDownloadPDF(user),
        print: this.featureGate.canPrint(user),
        share: this.featureGate.canShare(user),
        proTemplates: this.featureGate.canAccessProTemplates(user),
        businessTemplates: this.featureGate.canAccessBusinessTemplates(user),
        advancedFeatures: this.featureGate.canAccessAdvancedFeatures(user),
        aiOptimize: await this.can(userId, 'ai:optimize'),
        exportDocx: await this.can(userId, 'cv:export:docx'),
      },
    };
  }

  async assertCan(userId: string, feature: string, message: string): Promise<void> {
    const allowed = await this.can(userId, feature);
    if (allowed) return;
    const tier = await this.getTier(userId);
    void this.auditLog.logFeatureDenial(userId, feature, tier);
    throw new ForbiddenException({
      statusCode: 402,
      code: 'ENTITLEMENT_REQUIRED',
      message,
      details: { feature, upgradeUrl: '/pricing' },
    });
  }
}
