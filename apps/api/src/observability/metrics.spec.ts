import type { AddressInfo } from 'net';
import type { Request } from 'express';
import {
  Counter,
  Gauge,
  Histogram,
  MetricsRegistry,
  metrics,
  metricsPortFromEnv,
  startMetricsServer,
} from './metrics';
import { routeTemplate } from '../common/middleware/http-metrics.middleware';

describe('Prometheus exposition', () => {
  it('renders counters with escaped labels', () => {
    const counter = new Counter('demo_total', 'A demo counter.');
    counter.inc({ route: '/a' });
    counter.inc({ route: '/a' }, 2);
    counter.inc({ route: 'quote"back\\slash\nline' });

    expect(counter.render()).toBe(
      '# HELP demo_total A demo counter.\n' +
        '# TYPE demo_total counter\n' +
        'demo_total{route="/a"} 3\n' +
        'demo_total{route="quote\\"back\\\\slash\\nline"} 1\n'
    );
  });

  it('renders cumulative histogram buckets, +Inf, sum and count', () => {
    const histogram = new Histogram('demo_seconds', 'A demo histogram.', [0.5, 0.1, 1]);
    for (const value of [0.05, 0.2, 0.2, 0.7, 3]) histogram.observe({ route: '/x' }, value);

    const lines = histogram.render().split('\n');
    expect(lines).toEqual(
      expect.arrayContaining([
        'demo_seconds_bucket{route="/x",le="0.1"} 1',
        'demo_seconds_bucket{route="/x",le="0.5"} 3',
        'demo_seconds_bucket{route="/x",le="1"} 4',
        'demo_seconds_bucket{route="/x",le="+Inf"} 5',
        'demo_seconds_sum{route="/x"} 4.15',
        'demo_seconds_count{route="/x"} 5',
      ])
    );
    // Buckets must be listed in increasing order.
    const les = lines.filter((l) => l.includes('_bucket')).map((l) => l.match(/le="([^"]+)"/)![1]);
    expect(les).toEqual(['0.1', '0.5', '1', '+Inf']);
  });

  it('skips a gauge whose source fails instead of failing the scrape', async () => {
    const registry = new MetricsRegistry();
    registry.register(new Gauge('ok_gauge', 'Works.', () => [{ value: 1 }]));
    registry.register(
      new Gauge('broken_gauge', 'Redis down.', async () => {
        throw new Error('ECONNREFUSED');
      })
    );

    const body = await registry.render();
    expect(body).toContain('ok_gauge 1');
    expect(body).not.toContain('broken_gauge');
  });

  it('registers a metric name once', () => {
    const registry = new MetricsRegistry();
    const first = registry.register(new Counter('once_total', 'Once.'));
    const second = registry.register(new Counter('once_total', 'Once.'));
    expect(second).toBe(first);
  });

  it('exposes process and Node.js metrics under prom-client names', async () => {
    const body = await metrics.render();
    for (const name of [
      'process_cpu_seconds_total',
      'process_resident_memory_bytes',
      'process_start_time_seconds',
      'nodejs_heap_size_used_bytes',
      'nodejs_eventloop_lag_p99_seconds',
    ]) {
      expect(body).toMatch(new RegExp(`^${name} [0-9.e+-]+$`, 'm'));
    }
  });
});

describe('routeTemplate', () => {
  it('uses the route template, never the raw URL', () => {
    const req = { route: { path: '/api/v1/cvs/:id' }, baseUrl: '' } as unknown as Request;
    expect(routeTemplate(req)).toBe('/api/v1/cvs/:id');
  });

  it('groups requests that matched no route', () => {
    expect(routeTemplate({ baseUrl: '' } as Request)).toBe('unmatched');
  });
});

describe('metrics server', () => {
  it('is off in tests unless METRICS_PORT is set, and can be disabled', () => {
    expect(metricsPortFromEnv({ NODE_ENV: 'test' })).toBeNull();
    expect(metricsPortFromEnv({ NODE_ENV: 'production' })).toBe(9464);
    expect(metricsPortFromEnv({ NODE_ENV: 'production', METRICS_PORT: '0' })).toBeNull();
    expect(metricsPortFromEnv({ NODE_ENV: 'test', METRICS_PORT: '9100' })).toBe(9100);
  });

  it('serves GET /metrics only', async () => {
    const registry = new MetricsRegistry();
    registry.register(new Gauge('up_gauge', 'Up.', () => [{ value: 1 }]));
    const live = startMetricsServer(0, registry)!; // 0: ephemeral port
    await new Promise((resolve) => live.once('listening', resolve));
    const { port } = live.address() as AddressInfo;
    try {
      const ok = await fetch(`http://127.0.0.1:${port}/metrics`);
      expect(ok.status).toBe(200);
      expect(ok.headers.get('content-type')).toContain('text/plain; version=0.0.4');
      expect(await ok.text()).toContain('up_gauge 1');

      expect((await fetch(`http://127.0.0.1:${port}/`)).status).toBe(404);
      expect((await fetch(`http://127.0.0.1:${port}/metrics`, { method: 'POST' })).status).toBe(
        404
      );
    } finally {
      await new Promise((resolve) => live.close(resolve));
    }
  });
});
