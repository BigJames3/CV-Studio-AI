variable "name" { type = string }
variable "env" { type = string }
variable "domain_aliases" {
  type    = list(string)
  default = []
}
variable "acm_certificate_arn_us_east_1" {
  type        = string
  description = "ACM cert in us-east-1 for CloudFront"
  default     = ""
}

# S3 buckets: uploads, exports, static — Block Public Access ON
# CloudFront OAC → S3; TLS viewer minimum TLSv1.2_2021

output "cdn_notes" {
  value = "Associate WAF WebACL; enable access logs to S3"
}
