import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.module';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(@Optional() private readonly prisma?: PrismaService) {}

  async logFeatureDenial(userId: string, feature: string, tier: string) {
    return this.write(userId, feature, tier, 'FEATURE_DENIED');
  }

  async logFeatureAccess(userId: string, feature: string, tier: string) {
    return this.write(userId, feature, tier, 'FEATURE_ACCESSED');
  }

  private async write(userId: string, feature: string, tier: string, action: string) {
    if (!this.prisma) return;
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          entityType: 'feature_gate',
          entityId: userId,
          action,
          newValues: { feature, tier, action },
        },
      });
    } catch (error) {
      this.logger.warn(
        `Audit log failed action=${action} user=${userId} feature=${feature}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
