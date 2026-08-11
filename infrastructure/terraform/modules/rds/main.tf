variable "name" { type = string }
variable "env" { type = string }
variable "subnet_ids" { type = list(string) }
variable "vpc_id" { type = string }
variable "instance_class" {
  type    = string
  default = "db.t4g.medium"
}
variable "multi_az" {
  type    = bool
  default = true
}
variable "create_read_replica" {
  type    = bool
  default = false
}
variable "backup_retention_days" {
  type    = number
  default = 35
}

# Scaffold resources — replace with aws_db_instance + aws_db_instance replica
# Enforce: storage_encrypted, kms_key_id, deletion_protection (prod), force_ssl parameter

output "endpoint_secret_hint" {
  value = "Store DATABASE_URL in Secrets Manager; never in tf state plaintext if avoidable"
}
