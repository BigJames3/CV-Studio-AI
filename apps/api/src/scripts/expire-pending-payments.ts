/**
 * CLI: expire CinetPay/Stripe payments stuck in pending.
 * Usage: pnpm --filter @cvstudio/api payments:expire-pending
 *
 * Sets WORKER_KIND before loading AppModule so Nest @Cron does not start
 * in this one-shot process (production uses the k8s CronJob + in-API cron).
 */
async function main() {
  process.env.WORKER_KIND ??= 'expire-pending';
  const { NestFactory } = await import('@nestjs/core');
  const { Logger } = await import('@nestjs/common');
  const { AppModule } = await import('../app.module');
  const { PaymentsService } = await import('../modules/payments/payments.service');

  const logger = new Logger('payments:expire-pending');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const payments = app.get(PaymentsService);
    const result = await payments.expireStalePending();
    logger.log(`Expired ${result.count} pending payments`);
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
