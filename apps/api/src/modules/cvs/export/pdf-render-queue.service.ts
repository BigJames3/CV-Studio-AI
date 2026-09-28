import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, QueueEvents, Worker, type ConnectionOptions } from 'bullmq';
import { PdfGeneratorService } from './pdf-generator.service';
import type { ExportPdfOptions } from './pdf-content.types';

export const PDF_RENDER_QUEUE = 'pdf-render';

/** Longest a request waits for a worker before failing (HTML → PDF usually takes 1–5 s). */
const RENDER_TIMEOUT_MS = 60_000;
/** How long the "is any worker alive" answer is reused. */
const WORKERS_CHECK_TTL_MS = 10_000;

type RenderJobData = { html: string; options: ExportPdfOptions };

function redisConnection(): ConnectionOptions {
  const url = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : undefined,
    tls: url.protocol === 'rediss:' ? {} : undefined,
    // Required by BullMQ for blocking connections (workers, queue events).
    maxRetriesPerRequest: null,
  };
}

/**
 * HTML → PDF rendering, the Chromium-heavy step of every export path (sync, batch, async).
 *
 * - `PDF_RENDER_MODE=queue`: the API enqueues a BullMQ job and waits for its result; PDF workers
 *   (`WORKER_KIND=pdf node dist/worker.js`) run Chromium. API pods stay small, rendering scales
 *   with the worker Deployment, and a job whose worker dies is retried (stalled-job recovery).
 *   If no worker is alive, the API renders inline instead of failing.
 * - Otherwise (default: local dev, tests): renders inline with the local Chromium, as before.
 */
@Injectable()
export class PdfRenderQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PdfRenderQueue.name);
  private queue: Queue<RenderJobData, string> | null = null;
  private events: QueueEvents | null = null;
  private worker: Worker<RenderJobData, string> | null = null;
  private workersCheck: { alive: Promise<boolean>; at: number } | null = null;

  constructor(private readonly generator: PdfGeneratorService) {}

  static queueModeEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
    return env.PDF_RENDER_MODE === 'queue';
  }

  onModuleInit() {
    if (!PdfRenderQueue.queueModeEnabled()) return;
    const connection = redisConnection();
    this.queue = new Queue<RenderJobData, string>(PDF_RENDER_QUEUE, { connection });
    this.events = new QueueEvents(PDF_RENDER_QUEUE, { connection });
    this.logger.log('PDF rendering goes through the BullMQ queue');
  }

  /** Same contract as PdfGeneratorService.htmlToPdf, wherever the rendering happens. */
  async htmlToPdf(html: string, options: ExportPdfOptions = {}): Promise<Buffer> {
    if (!this.queue || !this.events || !(await this.hasWorkers())) {
      return this.generator.htmlToPdf(html, options);
    }
    const job = await this.queue.add(
      'render',
      { html, options },
      {
        attempts: 2,
        backoff: { type: 'fixed', delay: 1000 },
        // Jobs carry up to 1.5 MB of HTML plus the PDF, and the result goes straight back
        // to the waiting request: keep only a short window in Redis.
        removeOnComplete: { age: 60, count: 200 },
        removeOnFail: { age: 3600, count: 200 },
      }
    );
    const pdfBase64 = await job.waitUntilFinished(this.events, RENDER_TIMEOUT_MS);
    return Buffer.from(pdfBase64, 'base64');
  }

  /** Called by the PDF worker process only. */
  startWorker(concurrency: number): Worker<RenderJobData, string> {
    this.worker = new Worker<RenderJobData, string>(
      PDF_RENDER_QUEUE,
      async (job) => {
        const pdf = await this.generator.htmlToPdf(job.data.html, job.data.options);
        return pdf.toString('base64');
      },
      { connection: redisConnection(), concurrency }
    );
    this.worker.on('failed', (job, err) => {
      this.logger.warn(`PDF render job ${job?.id} failed: ${err.message}`);
    });
    return this.worker;
  }

  private hasWorkers(): Promise<boolean> {
    const now = Date.now();
    if (!this.workersCheck || now - this.workersCheck.at >= WORKERS_CHECK_TTL_MS) {
      // Concurrent requests share one check instead of each asking Redis.
      this.workersCheck = { at: now, alive: this.countWorkers() };
    }
    return this.workersCheck.alive;
  }

  private async countWorkers(): Promise<boolean> {
    let alive = false;
    try {
      alive = (await this.queue!.getWorkersCount()) > 0;
    } catch (error) {
      this.logger.warn(`Cannot reach the PDF queue: ${(error as Error).message}`);
    }
    if (!alive) this.logger.warn('No PDF worker alive: rendering inline in the API');
    return alive;
  }

  async onModuleDestroy() {
    await Promise.allSettled([this.worker?.close(), this.events?.close(), this.queue?.close()]);
  }
}
