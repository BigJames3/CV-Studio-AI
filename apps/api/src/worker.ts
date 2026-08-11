/**
 * PDF worker entry — same codebase as API, Chromium-enabled image.
 * Run: WORKER_KIND=pdf node dist/worker.js
 *
 * Jobs are currently processed inline by the API for local/dev.
 * This process keeps a warm browser pool and can re-process stalled Redis jobs.
 */
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PdfBrowserPool } from './modules/cvs/export/pdf-generator.service';
import { RedisService } from './redis/redis.module';

async function bootstrap() {
  const logger = new Logger('PdfWorker');
  const kind = process.env.WORKER_KIND ?? 'pdf';
  if (kind !== 'pdf') {
    logger.warn(`WORKER_KIND=${kind} — this entrypoint is for pdf workers`);
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const pool = app.get(PdfBrowserPool);
  await pool.getBrowser();
  logger.log('Chromium warm — PDF worker ready');

  const redis = app.get(RedisService);
  // Heartbeat key for k8s / ops
  setInterval(() => {
    void redis.set('worker:pdf:heartbeat', new Date().toISOString(), 30).catch(() => undefined);
  }, 10_000);

  const shutdown = async () => {
    logger.log('Shutting down PDF worker');
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
