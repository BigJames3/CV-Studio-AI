import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { PrismaService } from '../../database/prisma.module';
import { isSentryConfigured } from '../../observability/sentry';
import { getMarketingSpendMonthly, isPostHogConfigured } from '../../observability/posthog';
import { availablePaymentMethods } from '../payments/payment-env';

/** A probe must answer within its own timeout even when Postgres hangs (RDS failover). */
export const DB_CHECK_TIMEOUT_MS = 2_000;

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * K8s liveness: the process answers HTTP. It never touches the database, otherwise a DB
   * outage would make Kubernetes restart every API pod at once.
   */
  @Public()
  @Get('live')
  live() {
    return { status: 'ok' };
  }

  @Public()
  @Get()
  async check() {
    const db = (await this.databaseUp()) ? 'up' : 'down';
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

  /** K8s readiness + CD smoke. 503 if Postgres is unreachable or does not answer within 2 s. */
  @Public()
  @Get('ready')
  async ready() {
    if (await this.databaseUp()) return { status: 'ok' };
    throw new ServiceUnavailableException({
      code: 'NOT_READY',
      message: 'Database unavailable',
    });
  }

  private async databaseUp(): Promise<boolean> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<false>((resolve) => {
      timer = setTimeout(() => resolve(false), DB_CHECK_TIMEOUT_MS);
    });
    try {
      return await Promise.race([
        this.prisma.$queryRaw`SELECT 1`.then(
          () => true,
          () => false
        ),
        timeout,
      ]);
    } finally {
      clearTimeout(timer);
    }
  }
}
