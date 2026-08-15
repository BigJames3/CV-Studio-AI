import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { PrismaService } from '../../database/prisma.module';
import { isSentryConfigured } from '../../observability/sentry';
import { getMarketingSpendMonthly, isPostHogConfigured } from '../../observability/posthog';
import { availablePaymentMethods } from '../payments/payment-env';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    let db: 'up' | 'down' = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'down';
    }
    return {
      status: db === 'up' ? 'ok' : 'degraded',
      db,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      observability: {
        sentry: isSentryConfigured(),
        posthog: isPostHogConfigured(),
        marketingSpendConfigured: getMarketingSpendMonthly() > 0,
        payments: availablePaymentMethods(),
      },
    };
  }

  /** K8s readiness + CD smoke. 503 if Postgres is unreachable. */
  @Public()
  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException({
        code: 'NOT_READY',
        message: 'Database unavailable',
      });
    }
  }
}
