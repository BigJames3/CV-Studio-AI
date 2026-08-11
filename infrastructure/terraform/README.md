# CV Studio AI — Terraform

See `docs/INFRASTRUCTURE-CV-STUDIO-AI.md`.

## Usage

```bash
cd infrastructure/terraform/envs/staging
terraform init
terraform plan
# apply only via GitHub Actions with OIDC + environment approval
```

## State

Per-env S3 backend + DynamoDB lock. Never commit `.tfstate`.
