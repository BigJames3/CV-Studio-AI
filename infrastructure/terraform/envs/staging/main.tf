# Clone of prod with smaller instance sizes — fill identically to prod/main.tf
# multi_az = true recommended for staging pen-tests / failover drills
terraform {
  required_version = ">= 1.7.0"
}

# See envs/prod/main.tf for module graph.
