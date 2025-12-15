# Okta Configuration for Termageddon

Terraform configuration for Okta authentication in the Termageddon glossary management system.

## What This Creates

- OAuth application for Termageddon (browser-based PKCE flow)
- Authorization server with OpenID Connect
- JWT claims: `sub`, `email`, `first_name`, `last_name`

**Note**: Roles and permissions are managed in Termageddon, not Okta.

## Claim Example

```json
{
  "sub": "00u1234567890abcdef",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe"
}
```

## Quick Start

```bash
# Set API token
export OKTA_API_TOKEN="your-token"

# Navigate to dev environment
cd terraform/okta/dev

# First time only: clean old state
rm -rf .terraform/ terraform.tfstate*

# Initialize
terraform init

# Apply
terraform plan -var-file=config/termageddon-dev.tfvars
terraform apply -var-file=config/termageddon-dev.tfvars
```

## Configuration

Edit `dev/config/termageddon-dev.tfvars`:

```hcl
okta_org_name           = "sso.uat"
nickname                = "DEV"
termageddon_url         = "localhost:4200"
termageddon_backend_url = "localhost:8000"
```

## State Storage

- **Bucket**: `verisk-dev-terraform-state`
- **Key**: `termageddon/okta/terraform.tfstate`
- **Region**: `us-east-2`

## Outputs

After applying, use these in your application:

```bash
terraform output okta_client_id    # For frontend config
terraform output okta_issuer_uri   # For backend validation
```

## Cleanup

```bash
terraform destroy -var-file=config/termageddon-dev.tfvars
```
