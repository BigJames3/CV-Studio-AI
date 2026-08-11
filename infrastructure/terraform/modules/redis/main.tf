variable "name" { type = string }
variable "env" { type = string }
variable "subnet_ids" { type = list(string) }
variable "vpc_id" { type = string }
variable "node_type" {
  type    = string
  default = "cache.t4g.small"
}

# ElastiCache Redis 7: transit_encryption_enabled, at_rest_encryption_enabled
# auth_token from Secrets Manager

output "redis_notes" {
  value = "Treat as ephemeral cache; CV SoT remains Postgres"
}
