terraform {
  required_version = ">= 1.9.0"

  required_providers {
    ovh = {
      source  = "ovh/ovh"
      version = "~> 2.0"
    }
  }

  # OVHcloud Object Storage (S3-compatible). Settings come from `-backend-config`
  # (see backend.hcl.example); credentials from AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY.
  backend "s3" {}
}

# Credentials from OVH_APPLICATION_KEY, OVH_APPLICATION_SECRET and OVH_CONSUMER_KEY.
provider "ovh" {
  endpoint = "ovh-eu"
}
