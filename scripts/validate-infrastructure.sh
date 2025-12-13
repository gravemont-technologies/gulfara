echo "✓ terraform plan completed (inspect output for resource changes)"
#!/usr/bin/env bash
set -euo pipefail

echo "🔍 Validating network contract and Terraform plan"

if ! command -v terraform >/dev/null 2>&1; then
  echo "terraform not installed. Install from https://developer.hashicorp.com/terraform/downloads"
  exit 1
fi

if [ ! -f "gcp/main.tf" ]; then
  echo "gcp/main.tf not found. Run scripts/generate-terraform.ts first."
  exit 1
fi

echo "Running terraform init && plan (dry-run)..."
terraform -chdir=gcp init -input=false
terraform -chdir=gcp plan -input=false

echo "✓ terraform plan completed (inspect output for resource changes)"

GCP_PROJECT_ID=${GCP_PROJECT_ID:-${PROJECT_ID:-}}
if [ -z "$GCP_PROJECT_ID" ]; then
  echo "GCP_PROJECT_ID unset; skipping gcloud connectivity checks. Set GCP_PROJECT_ID to enable validation."
elif command -v gcloud >/dev/null 2>&1; then
  echo "Running gcloud network sanity checks..."
  gcloud compute networks describe gulfara-network --project "$GCP_PROJECT_ID" >/dev/null
  echo "  ✓ gcloud network describe succeeded"
else
  echo "gcloud CLI not installed; skipping connectivity dry-run."
fi

echo "Connectivity dry-run: TODO — test Cloud Run -> Cloud SQL private IP once infra exists"
