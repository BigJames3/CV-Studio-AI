/**
 * CLI: retry Stripe webhook DLQ messages.
 * Usage: pnpm --filter @cvstudio/api webhook:retry-dlq
 */
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { PaymentsService } from '../modules/payments/payments.service';

async function main() {
  const logger = new Logger('webhook:retry-dlq');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const payments = app.get(PaymentsService);
    const limit = Number(process.env.WEBHOOK_DLQ_RETRY_LIMIT ?? 50);
    const result = await payments.retryAllDlq(limit);
    logger.log(
      `DLQ retry done: retried=${result.retried} succeeded=${result.succeeded} failed=${result.failed}`
    );
    if (result.failed > 0) process.exitCode = 1;
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
