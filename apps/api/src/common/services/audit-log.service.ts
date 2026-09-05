import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.module';

/**
 * Feature-gate audit trail using the existing `audit_logs` table.
 *
 * Dashboard:
 *   SELECT new_values->>'feature' AS feature, COUNT(*) AS denials, new_values->>'tier' AS tier
 *   FROM audit_logs
 *   WHERE action = 'FEATURE_DENIED' AND entity_type = 'feature_gate'
 *   GROUP BY 1, 3 ORDER BY denials DESC;
 *
 * Conversion moments:
 *   SELECT new_values->>'feature' AS feature, COUNT(DISTINCT user_id) AS unique_users
 *   FROM audit_logs
 *   WHERE action = 'FEATURE_DENIED' AND entity_type = 'feature_gate'
 *   GROUP BY 1;
 *
 * Alerts (ops): 10+ denials / user / hour → abuse; 100+ CV creates / user → fraud.
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logFeatureDenial(userId: string, feature: string, tier: string): Promise<void> {
    await this.write(userId, feature, tier, 'FEATURE_DENIED');
  }

  async logFeatureAccess(userId: string, feature: string, tier: string): Promise<void> {
    await this.write(userId, feature, tier, 'FEATURE_ACCESSED');
  }

  private async write(
    userId: string,
    feature: string,
    tier: string,
    action: 'FEATURE_DENIED' | 'FEATURE_ACCESSED'
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          entityType: 'feature_gate',
          entityId: userId,
          action,
          newValues: { feature, tier } as Prisma.InputJsonValue,
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
