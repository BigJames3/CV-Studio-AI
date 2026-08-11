# ADR-017 — AWS EKS + Terraform + GitHub Actions CI/CD

**Status:** Accepted  
**Date:** 2026-07-26  
**Deciders:** DevOps Principal, CTO, CISO

## Context

Need production-grade delivery for Nest API, Next web, workers, aligned with Security (OIDC, WAF) and Database (RDS Multi-AZ).

## Decision

1. **AWS eu-west-1** primary; EKS for api/web/workers.
2. **Terraform** modules + per-env state (S3/DynamoDB).
3. **GitHub Actions** with OIDC to AWS; no long-lived keys.
4. **Blue-Green** deploys for prod API/web.
5. **Prometheus + Grafana** on-cluster; logs via Fluent Bit → OpenSearch (ELK-compatible).
6. **CloudFront + ACM + ALB** for TLS/load balancing.
7. **RDS Multi-AZ + read replica + cross-region DR replica**; PITR 35 days.

## Consequences

- Platform owns `infrastructure/` and workflows.
- App teams ship via image tags, not cluster kubectl from laptops.
- See `docs/INFRASTRUCTURE-CV-STUDIO-AI.md`.
