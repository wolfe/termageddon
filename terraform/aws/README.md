# AWS ECS Fargate Deployment for Termageddon

Terraform configuration for deploying Termageddon to AWS using ECS Fargate, RDS PostgreSQL, and supporting infrastructure.

## Architecture

```
┌─────────────────────────────────────┐
│   Application Load Balancer (ALB)  │
│   • HTTP/HTTPS listeners            │
│   • Health checks                   │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│   ECS Fargate Service                │
│   • Django backend container        │
│   • Serves Angular frontend (static) │
│   • 1 task per environment          │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│   RDS PostgreSQL                    │
│   • Single-AZ (internal use)        │
│   • Automated backups (7 days)      │
└─────────────────────────────────────┘
```

## Infrastructure Components

- **VPC**: Isolated network with public/private subnets
- **ECS Fargate**: Containerized Django backend
- **RDS PostgreSQL**: Database (single-AZ for cost optimization)
- **Application Load Balancer**: Routes traffic to ECS tasks
- **ECR**: Container registry for Docker images
- **Secrets Manager**: Stores database credentials, Django secret key, Okta config
- **CloudWatch**: Logging for ECS tasks

## Prerequisites

1. AWS CLI configured
2. Terraform >= 1.5.0
3. Docker
4. Okta config (client ID, issuer URI)

## Quick Start

### 1. Set Up Secrets

```bash
cd terraform/aws/dev
cp .env.example .env
# Generate secrets and fill in .env (see .env.example for commands)
vim .env
# Store in LastPass
source .env
```

### 2. Configure Variables

```bash
vim config/termageddon-dev.tfvars
# Set okta_client_id, okta_issuer_uri
# Use placeholder for okta_redirect_uri initially
```

### 3. Deploy

```bash
terraform init
terraform apply -var-file=config/termageddon-dev.tfvars
```

### 4. Update Okta Redirect URI

```bash
# Get ALB DNS
terraform output alb_dns_name
# Update okta_redirect_uri in tfvars with: http://<alb-dns>/callback
# Update in Okta admin console
terraform apply -var-file=config/termageddon-dev.tfvars
```

### 5. Build and Push Docker Image

```bash
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-2.amazonaws.com
ECR_URL=$(terraform output -raw ecr_repository_url)
cd ../../../backend
docker build -t termageddon-backend .
docker tag termageddon-backend:latest ${ECR_URL}:latest
docker push ${ECR_URL}:latest
```

### 6. Deploy New Image

```bash
aws ecs update-service --cluster termageddon-dev --service termageddon-dev-service --force-new-deployment --region us-east-2
```

## Outputs

```bash
terraform output alb_dns_name        # Application URL
terraform output ecr_repository_url  # Docker registry
terraform output rds_address         # Database endpoint
```

## Frontend Deployment

The Angular frontend is served from Django static files. To deploy:

1. Build Angular app with production API endpoint:
   ```bash
   cd frontend
   # Update environment.ts with ALB DNS name
   ng build --configuration production
   ```

2. Include the built files in the Docker image (already configured in Dockerfile)

3. Django's `collectstatic` will serve them via the ALB

## Database Migrations

Migrations run automatically on container startup via `entrypoint.sh`. The entrypoint script:
1. Waits for database to be ready
2. Runs `python manage.py migrate`
3. Collects static files
4. Starts Gunicorn

## Secrets Management

Secrets passed as environment variables via Terraform (stored in encrypted state):
- `TF_VAR_db_password` - Database password
- `TF_VAR_django_secret_key` - Django secret key

Okta config (client ID, issuer URI, redirect URI) passed via tfvars.

**Rotating Secrets:** Update `.env`, `source .env`, `terraform apply`

## Troubleshooting

### View ECS Logs

```bash
aws logs tail /ecs/termageddon-dev --follow --region us-east-2
```

### Check ECS Service Status

```bash
aws ecs describe-services \
  --cluster termageddon-dev \
  --services termageddon-dev-service \
  --region us-east-2
```

### Connect to Database

```bash
# Get database endpoint
terraform output rds_address

# Get password from Secrets Manager
aws secretsmanager get-secret-value \
  --secret-id termageddon-dev-db-credentials \
  --region us-east-2 \
  --query SecretString --output text | jq -r .password
```

### Force ECS Task Restart

```bash
aws ecs update-service \
  --cluster termageddon-dev \
  --service termageddon-dev-service \
  --force-new-deployment \
  --region us-east-2
```

## Cleanup

To destroy all resources:

```bash
cd terraform/aws/dev
terraform destroy -var-file=config/termageddon-dev.tfvars
```

**Warning**: This will delete the RDS instance and all data. Make sure you have backups!

## Integration with Okta Terraform

The AWS Terraform can reference Okta outputs. To use:

1. Get Okta outputs from Okta Terraform:
   ```bash
   cd terraform/okta/dev
   terraform output okta_client_id
   terraform output okta_issuer_uri
   ```

2. Use these values in AWS Terraform tfvars files

## State Management

Terraform state is stored in S3:
- **Bucket**: `verisk-dev-terraform-state`
- **Key**: `termageddon/aws/{env}/terraform.tfstate`
- **Region**: `us-east-2`
- **Lock table**: `matisse_terraform_lock_ohio`

## Security Notes

- RDS is in private subnets, not publicly accessible
- ECS tasks are in private subnets
- Security groups restrict access (ALB → ECS → RDS)
- Secrets stored in Secrets Manager (encrypted)
- Database passwords are randomly generated

## Next Steps

1. Configure Okta redirect URI with ALB DNS name
2. Build and push Docker image to ECR
3. Update frontend environment configuration
4. Test health check endpoint
5. Monitor CloudWatch logs for any issues
