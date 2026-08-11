variable "env" { type = string }

# Optional: Amazon Managed Prometheus workspace, Grafana workspace,
# or OpenSearch domain for ELK-compatible logging.

output "observability_notes" {
  value = "Prefer kube-prometheus-stack on EKS + Fluent Bit → OpenSearch for M2–M3"
}
