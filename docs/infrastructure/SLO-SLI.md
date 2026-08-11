# SLO / SLI — CV Studio AI

| Service          | SLI                                              | SLO (30d)              | Error budget |
| ---------------- | ------------------------------------------------ | ---------------------- | ------------ |
| API availability | non-5xx success ratio (ready probes + synthetic) | 99.9%                  | 43.2 min     |
| API latency      | p95 `GET /cvs/:id`                               | ≤ 300 ms (ex. cold AI) | burn alerts  |
| Auth             | login success excl. bad creds                    | 99.9%                  | —            |
| Export PDF       | job success ≤ 120s                               | 99.5%                  | —            |
| Sync mobile      | push queue flush success                         | 99.5%                  | —            |

**Alerting:** multi-window burn-rate (Prometheus) → PagerDuty.

Synthetic: CloudWatch Synthetics or Grafana k6 against `https://api.cvstudio.ai/api/v1/health`.
