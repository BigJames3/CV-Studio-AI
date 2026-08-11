import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.module';

@Injectable()
export class AuthAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    userId?: string | null;
    action: string;
    entityId?: string;
    ip?: string;
    userAgent?: string;
    meta?: Record<string, unknown>;
  }) {
    const entityId = params.entityId ?? params.userId;
    if (!entityId) return;

    try {
      await this.prisma.auditLog.create({
        data: {
          userId: params.userId ?? null,
          entityType: 'auth',
          entityId,
          action: params.action,
          newValues: params.meta
            ? (JSON.parse(JSON.stringify(params.meta)) as Prisma.InputJsonValue)
            : undefined,
          ipAddress: params.ip?.slice(0, 64),
          userAgent: params.userAgent?.slice(0, 512),
        },
      });
    } catch {
      // never fail the auth flow because of audit
    }
  }
}
