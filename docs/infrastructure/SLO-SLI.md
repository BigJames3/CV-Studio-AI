# SLO / SLI — CV Studio AI

| Service          | SLI                                                         | SLO (30d)                   | Error budget         | Alert (`infrastructure/k8s/monitoring/prometheus-rules.yaml`) |
| ---------------- | ----------------------------------------------------------- | --------------------------- | -------------------- | ------------------------------------------------------------- |
| API availability | non-5xx ratio of API responses (health probes excluded)     | 99.9%                       | 43.2 min / 0.1% req. | `ApiErrorBudgetFastBurn`, `ApiErrorBudgetSlowBurn`            |
| API errors       | 5xx ratio over 5 min                                        | < 1% (alert), 0.1% (target) | —                    | `ApiHighErrorRate`                                            |
| API latency      | p95 of interactive routes (PDF export, AI, health excluded) | < 500 ms                    | —                    | `ApiLatencyP95High`                                           |
| Export PDF       | renders without error                                       | 99.5%                       | —                    | `PdfRenderErrors`, `PdfQueueBacklog`, `PdfNoWorker`           |
| Auth             | login success excl. bad creds                               | 99.9%                       | —                    | — (access log: `path=/api/v1/auth/login status=401`)          |
| Recovery         | time to restore service after an incident                   | < 15 min                    | —                    | `docs/infrastructure/DR-RUNBOOK.md`                           |

**Alerting:** multi-window burn rate (1 h + 5 min at 14.4×, 6 h + 30 min at 6×) → Alertmanager (PagerDuty / Slack receiver to configure in `values-prometheus.yaml`).

## Metrics (API and PDF worker, port 9464 `/metrics`)

Exposed by `apps/api/src/observability/metrics.ts`, scraped by the `cvstudio-api` PodMonitor.

| Metric                                                            | Labels                                                 |
| ----------------------------------------------------------------- | ------------------------------------------------------ |
| `http_request_duration_seconds` (histogram)                       | `method`, `route` (template, or `unmatched`), `status` |
| `pdf_render_duration_seconds` (histogram)                         | `where` (`inline`, `queue`, `worker`), `result`        |
| `pdf_render_queue_jobs` (gauge, read from Redis)                  | `state`                                                |
| `pdf_render_workers` (gauge)                                      | —                                                      |
| `process_cpu_seconds_total`, `process_resident_memory_bytes`      | —                                                      |
| `nodejs_heap_size_used_bytes`, `nodejs_eventloop_lag_p99_seconds` | —                                                      |

Dashboard: `infrastructure/k8s/monitoring/grafana-dashboard-api.yaml` (golden signals, slowest routes, PDF queue, memory, event loop).

## Not covered yet

- **Database connections > 80%**: needs RDS CloudWatch (`DatabaseConnections` against `max_connections`) or a postgres exporter; nothing in Terraform yet.
- **Disk > 90%**: `NodeDiskAlmostFull` covers node disks (node-exporter); RDS storage needs a CloudWatch `FreeStorageSpace` alarm.

Synthetic: CloudWatch Synthetics or Grafana k6 against `https://api.cvstudio.ai/api/v1/health`.
