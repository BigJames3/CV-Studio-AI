import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  SetMetadata,
  UseGuards,
  applyDecorators,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.module';
import { FeatureGateService } from '../services/feature-gate.service';
import { AuditLogService } from '../services/audit-log.service';
import type { AuthUser } from '../decorators';

export const FEATURE_GATE_KEY = 'featureGate';

export type FeatureGateName =
  'downloadPDF' | 'print' | 'share' | 'proTemplates' | 'businessTemplates' | 'advancedFeatures';

export const RequireFeature = (feature: FeatureGateName) => SetMetadata(FEATURE_GATE_KEY, feature);

/** Nest-idiomatic equivalent of `@UseGuards(new FeatureGateGuard('downloadPDF'))`. */
export const FeatureGate = (feature: FeatureGateName) =>
  applyDecorators(RequireFeature(feature), UseGuards(FeatureGateGuard));

@Injectable()
export class FeatureGateGuard implements CanActivate {
  private readonly logger = new Logger(FeatureGateGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly featureGate: FeatureGateService,
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<FeatureGateName>(FEATURE_GATE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!feature) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;
    if (!user?.id) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not authenticated' });
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { subscriptionTier: true },
    });
    const gatedUser = {
      id: user.id,
      subscriptionTier: dbUser?.subscriptionTier ?? user.subscriptionTier ?? 'free',
    };

    const hasAccess = this.checkFeature(gatedUser, feature);
    if (!hasAccess) {
      this.logger.warn(
        `Feature denied: user=${user.id}, tier=${gatedUser.subscriptionTier}, feature=${feature}`
      );
      void this.auditLog.logFeatureDenial(user.id, feature, String(gatedUser.subscriptionTier));
      throw new ForbiddenException({
        statusCode: 402,
        code: 'ENTITLEMENT_REQUIRED',
        message: `Feature requires higher tier: ${feature}`,
        details: { feature, upgradeUrl: '/pricing' },
      });
    }

    return true;
  }

  checkFeature(
    user: { subscriptionTier?: string | null },
    feature: FeatureGateName | string
  ): boolean {
    switch (feature) {
      case 'downloadPDF':
        return this.featureGate.canDownloadPDF(user);
      case 'print':
        return this.featureGate.canPrint(user);
      case 'share':
        return this.featureGate.canShare(user);
      case 'proTemplates':
        return this.featureGate.canAccessProTemplates(user);
      case 'businessTemplates':
        return this.featureGate.canAccessBusinessTemplates(user);
      case 'advancedFeatures':
        return this.featureGate.canAccessAdvancedFeatures(user);
      default:
        return false;
    }
  }
}
