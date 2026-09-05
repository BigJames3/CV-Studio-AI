import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_GATE_KEY, GatedFeature, AuthUser } from '../decorators';
import { FeatureGateService, FeatureGateUser } from '../services/feature-gate.service';
import { AuditLogService } from '../services/audit-log.service';
import { PrismaService } from '../../database/prisma.module';

@Injectable()
export class FeatureGateGuard implements CanActivate {
  private readonly logger = new Logger(FeatureGateGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly featureGate: FeatureGateService,
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly auditLog?: AuditLogService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<GatedFeature>(FEATURE_GATE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!feature) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    if (!user?.id) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not authenticated' });
    }

    const gatedUser = await this.resolveUser(user);
    const hasAccess = this.checkFeature(gatedUser, feature);

    if (!hasAccess) {
      this.logger.warn(
        `Feature denied: user=${gatedUser.id}, tier=${gatedUser.subscriptionTier}, feature=${feature}`
      );
      void this.auditLog?.logFeatureDenial(
        user.id,
        feature,
        String(gatedUser.subscriptionTier ?? 'free')
      );
      throw new ForbiddenException({
        statusCode: 403,
        code: 'ENTITLEMENT_REQUIRED',
        message: `Feature requires higher tier: ${feature}`,
        details: { feature, upgradeUrl: '/pricing' },
      });
    }

    return true;
  }

  private async resolveUser(user: AuthUser): Promise<FeatureGateUser> {
    if (!this.prisma) {
      return { id: user.id, subscriptionTier: user.subscriptionTier };
    }
    try {
      const db = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { subscriptionTier: true },
      });
      return {
        id: user.id,
        subscriptionTier: db?.subscriptionTier ?? user.subscriptionTier,
      };
    } catch {
      return { id: user.id, subscriptionTier: user.subscriptionTier };
    }
  }

  private checkFeature(user: FeatureGateUser, feature: GatedFeature | string): boolean {
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
