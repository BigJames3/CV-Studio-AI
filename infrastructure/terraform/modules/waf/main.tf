variable "name" { type = string }
variable "env" { type = string }
variable "rate_limit_ip" {
  type    = number
  default = 2000
}

# aws_wafv2_web_acl — AWSManagedRulesCommonRuleSet, SQLi, KnownBadInputs
# Rate-based rule; associate CloudFront (scope CLOUDFRONT in us-east-1)

output "waf_notes" {
  value = "Align rate limits with Security plan §7–§8"
}
