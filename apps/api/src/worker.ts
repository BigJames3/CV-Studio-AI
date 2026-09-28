/**
 * PDF worker entry — same codebase and image as the API (Chromium included).
 * Run: WORKER_KIND=pdf node dist/worker.js
 *
 * Consumes the BullMQ `pdf-render` queue that the API feeds when PDF_RENDER_MODE=queue,
 * keeping Chromium out of API pods. Without that setting the API renders inline (local dev).
 */
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { isJsonLogFormat, JsonLogger } from './observability/json-logger';
import { startMetricsServer } from './observability/metrics';
import { PdfBrowserPool } from './modules/cvs/export/pdf-generator.service';
import { PdfRenderQueue } from './modules/cvs/export/pdf-render-queue.service';
import { RedisService } from './redis/redis.module';

async function bootstrap() {
  const jsonLogger = isJsonLogFormat() ? new JsonLogger() : null;
  if (jsonLogger) Logger.overrideLogger(jsonLogger);
  const logger = new Logger('PdfWorker');
  const kind = process.env.WORKER_KIND ?? 'pdf';
  if (kind !== 'pdf') {
    logger.warn(`WORKER_KIND=${kind} — this entrypoint is for pdf workers`);
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: jsonLogger ?? ['error', 'warn', 'log'],
  });

  const pool = app.get(PdfBrowserPool);
  await pool.getBrowser();

  // One Chromium, several pages: each render is mostly waiting on layout and PDF encoding.
  const concurrency = Math.max(1, Number(process.env.PDF_WORKER_CONCURRENCY) || 2);
  const worker = app.get(PdfRenderQueue).startWorker(concurrency);
  await worker.waitUntilReady();
  logger.log(`Chromium warm — PDF worker consuming the queue (concurrency ${concurrency})`);

  startMetricsServer();

  const redis = app.get(RedisService);
  // Heartbeat key for k8s / ops
  setInterval(() => {
    void redis.set('worker:pdf:heartbeat', new Date().toISOString(), 30).catch(() => undefined);
  }, 10_000);

  const shutdown = async () => {
    logger.log('Shutting down PDF worker');
    // Let in-flight renders finish before Chromium is closed with the rest of the app.
    await worker.close();
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
