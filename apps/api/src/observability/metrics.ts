import { createServer, type Server } from 'http';
import { monitorEventLoopDelay } from 'perf_hooks';
import { Logger } from '@nestjs/common';

/**
 * Prometheus metrics in the text exposition format (v0.0.4), without a client library:
 * the API only needs counters, histograms and a few gauges read at scrape time.
 *
 * Served on a separate port (METRICS_PORT, default 9464) that no Service or Ingress exposes,
 * so /metrics is never reachable from the Internet. Names follow Prometheus conventions and
 * the ones prom-client uses (process_*, nodejs_*), so standard dashboards work.
 */

type Labels = Record<string, string>;

function escapeLabel(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"');
}

function formatLabels(labels: Labels): string {
  const entries = Object.entries(labels);
  if (entries.length === 0) return '';
  return `{${entries.map(([k, v]) => `${k}="${escapeLabel(v)}"`).join(',')}}`;
}

function formatValue(value: number): string {
  if (Number.isNaN(value)) return 'NaN';
  if (value === Infinity) return '+Inf';
  if (value === -Infinity) return '-Inf';
  return String(value);
}

function header(name: string, help: string, type: string): string {
  return `# HELP ${name} ${help.replace(/\\/g, '\\\\').replace(/\n/g, '\\n')}\n# TYPE ${name} ${type}\n`;
}

interface Metric {
  readonly name: string;
  render(): Promise<string> | string;
}

export class Counter implements Metric {
  private readonly values = new Map<string, { labels: Labels; value: number }>();

  constructor(
    readonly name: string,
    private readonly help: string
  ) {}

  inc(labels: Labels = {}, value = 1): void {
    const key = formatLabels(labels);
    const entry = this.values.get(key);
    if (entry) entry.value += value;
    else this.values.set(key, { labels, value });
  }

  render(): string {
    let out = header(this.name, this.help, 'counter');
    for (const { labels, value } of this.values.values()) {
      out += `${this.name}${formatLabels(labels)} ${formatValue(value)}\n`;
    }
    return out;
  }
}

export class Histogram implements Metric {
  private readonly series = new Map<
    string,
    { labels: Labels; counts: number[]; sum: number; count: number }
  >();

  constructor(
    readonly name: string,
    private readonly help: string,
    private readonly buckets: number[]
  ) {
    this.buckets = [...buckets].sort((a, b) => a - b);
  }

  observe(labels: Labels, value: number): void {
    const key = formatLabels(labels);
    let entry = this.series.get(key);
    if (!entry) {
      entry = { labels, counts: this.buckets.map(() => 0), sum: 0, count: 0 };
      this.series.set(key, entry);
    }
    // Store per-bucket counts; render() makes them cumulative.
    const index = this.buckets.findIndex((upper) => value <= upper);
    if (index >= 0) entry.counts[index] += 1;
    entry.sum += value;
    entry.count += 1;
  }

  /** Starts a timer; call the returned function with the final labels. */
  startTimer(): (labels: Labels) => void {
    const started = process.hrtime.bigint();
    return (labels) => this.observe(labels, Number(process.hrtime.bigint() - started) / 1e9);
  }

  render(): string {
    let out = header(this.name, this.help, 'histogram');
    for (const { labels, counts, sum, count } of this.series.values()) {
      let cumulative = 0;
      this.buckets.forEach((upper, i) => {
        cumulative += counts[i];
        out += `${this.name}_bucket${formatLabels({ ...labels, le: formatValue(upper) })} ${cumulative}\n`;
      });
      out += `${this.name}_bucket${formatLabels({ ...labels, le: '+Inf' })} ${count}\n`;
      out += `${this.name}_sum${formatLabels(labels)} ${formatValue(sum)}\n`;
      out += `${this.name}_count${formatLabels(labels)} ${count}\n`;
    }
    return out;
  }
}

/** Value(s) read when Prometheus scrapes (queue depth, memory...). */
export class Gauge implements Metric {
  constructor(
    readonly name: string,
    private readonly help: string,
    private readonly collect: () =>
      | Promise<Array<{ labels?: Labels; value: number }>>
      | Array<{ labels?: Labels; value: number }>,
    private readonly type: 'gauge' | 'counter' = 'gauge'
  ) {}

  async render(): Promise<string> {
    let samples: Array<{ labels?: Labels; value: number }>;
    try {
      samples = await this.collect();
    } catch {
      return ''; // a failing source (Redis down) must not break the whole scrape
    }
    let out = header(this.name, this.help, this.type);
    for (const { labels, value } of samples) {
      out += `${this.name}${formatLabels(labels ?? {})} ${formatValue(value)}\n`;
    }
    return out;
  }
}

export class MetricsRegistry {
  private readonly metrics = new Map<string, Metric>();

  register<T extends Metric>(metric: T): T {
    const existing = this.metrics.get(metric.name);
    if (existing) return existing as T;
    this.metrics.set(metric.name, metric);
    return metric;
  }

  async render(): Promise<string> {
    const parts = await Promise.all([...this.metrics.values()].map((m) => m.render()));
    return parts.join('');
  }
}

export const metrics = new MetricsRegistry();

// ── HTTP ─────────────────────────────────────────────────────────────────────

export const httpRequestDuration = metrics.register(
  new Histogram(
    'http_request_duration_seconds',
    'HTTP request duration by method, route template and status code.',
    [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
  )
);

// ── PDF rendering ────────────────────────────────────────────────────────────

export const pdfRenderDuration = metrics.register(
  new Histogram(
    'pdf_render_duration_seconds',
    'HTML to PDF rendering time. where: inline (API Chromium), queue (API waiting on a worker), worker.',
    [0.25, 0.5, 1, 2, 3, 5, 10, 20, 30, 60]
  )
);

// ── Process / Node.js (prom-client compatible names) ─────────────────────────

const eventLoopDelay = monitorEventLoopDelay({ resolution: 20 });
eventLoopDelay.enable();
const startTimeSeconds = Math.round(Date.now() / 1000 - process.uptime());

metrics.register(
  new Gauge(
    'process_cpu_seconds_total',
    'Total user and system CPU time spent in seconds.',
    () => {
      const { user, system } = process.cpuUsage();
      return [{ value: (user + system) / 1e6 }];
    },
    'counter'
  )
);
metrics.register(
  new Gauge('process_resident_memory_bytes', 'Resident memory size in bytes.', () => [
    { value: process.memoryUsage().rss },
  ])
);
metrics.register(
  new Gauge('process_start_time_seconds', 'Start time of the process since unix epoch.', () => [
    { value: startTimeSeconds },
  ])
);
metrics.register(
  new Gauge('nodejs_heap_size_used_bytes', 'V8 heap used in bytes.', () => [
    { value: process.memoryUsage().heapUsed },
  ])
);
metrics.register(
  new Gauge('nodejs_heap_size_total_bytes', 'V8 heap allocated in bytes.', () => [
    { value: process.memoryUsage().heapTotal },
  ])
);
metrics.register(
  new Gauge(
    'nodejs_eventloop_lag_p99_seconds',
    'Event loop delay p99 since the previous scrape.',
    () => {
      const value = eventLoopDelay.percentile(99) / 1e9;
      eventLoopDelay.reset();
      return [{ value }];
    }
  )
);

// ── Server ───────────────────────────────────────────────────────────────────

/** METRICS_PORT (default 9464); `0` disables it. Off in tests unless METRICS_PORT is set. */
export function metricsPortFromEnv(env: NodeJS.ProcessEnv = process.env): number | null {
  if (env.METRICS_PORT === undefined && env.NODE_ENV === 'test') return null;
  const port = Number(env.METRICS_PORT ?? 9464);
  return Number.isInteger(port) && port > 0 ? port : null;
}

export function startMetricsServer(
  port: number | null = metricsPortFromEnv(),
  registry: MetricsRegistry = metrics
): Server | null {
  if (port === null) return null;
  const logger = new Logger('Metrics');

  const server = createServer((req, res) => {
    if (req.method !== 'GET' || (req.url ?? '').split('?')[0] !== '/metrics') {
      res.writeHead(404).end();
      return;
    }
    registry.render().then(
      (body) => {
        res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8' });
        res.end(body);
      },
      (error: Error) => {
        logger.error(`metrics render failed: ${error.message}`);
        res.writeHead(500).end();
      }
    );
  });
  server.on('error', (error: NodeJS.ErrnoException) => {
    // Never take the API down for metrics (e.g. API and worker on one dev machine).
    logger.warn(`metrics server not started on :${port}: ${error.code ?? error.message}`);
  });
  server.listen(port, () => logger.log(`Prometheus metrics on :${port}/metrics`));
  server.unref();
  return server;
}
