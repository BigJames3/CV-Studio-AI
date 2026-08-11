# Disaster Recovery Runbook — CV Studio AI

**RTO region:** ≤ 1 hour · **RPO:** ≤ 5–15 min (PITR / replica lag)  
**Primary:** eu-west-1 · **DR:** eu-central-1

## 1. Detection

- Region impairment AWS Health
- Multi-AZ still failing after 15 min
- IC declares **SEV-1 REGIONAL**

## 2. Decision tree

1. AZ-only? → wait Multi-AZ / node repair (no DNS cutover)
2. Region failing? → proceed DR promote

## 3. Promote database

```bash
# Example — adjust identifiers
aws rds promote-read-replica \
  --db-instance-identifier cvstudio-prod-dr \
  --region eu-central-1
```

- Update Secrets Manager `DATABASE_URL` in DR
- Verify `force_ssl`, connectivity from DR EKS

## 4. Bring up compute

```bash
# Images already replicated to DR ECR
kubectl --context eks-dr apply -k infrastructure/k8s/overlays/prod
# or Argo CD sync DR app
```

- Run migrate Job only if schema behind (usually replica is live)
- Smoke: `/api/v1/health/ready`

## 5. DNS cutover

- Route53 failover: primary unhealthy → secondary
- Or lower TTL pre-incident (300s) then flip alias

## 6. Communications

- Status page: investigating → identified → monitoring
- Notify CISO if data integrity uncertain

## 7. Fail back (planned window)

1. Re-establish replication primary ← DR
2. Maintenance window cutover reverse
3. Postmortem

## 8. Quarterly drill checklist

- [ ] Restore RDS snapshot to isolated instance
- [ ] Time the promote + app smoke
- [ ] Validate backup encryption / access
- [ ] Update this runbook with deltas
