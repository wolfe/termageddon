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

1. AWS CLI configured with appropriate credentials
2. Terraform >= 1.5.0
3. Docker (for building images)
4. Okta configuration (client ID, issuer URI)

## Quick Start

### 1. Configure Environment Variables

Edit the tfvars file for your environment:

```bash
# For dev
cd terraform/aws/dev
vim config/termageddon-dev.tfvars

# For prod
cd terraform/aws/prod
vim config/termageddon-prod.tfvars
```

Set:
- `okta_client_id`: Your Okta client ID
- `okta_issuer_uri`: Your Okta issuer URI
- `okta_redirect_uri`: ALB DNS name (update after first deploy)

### 2. Initialize Terraform

```bash
cd terraform/aws/dev  # or prod
terraform init
```

### 3. Plan and Apply

```bash
terraform plan -var-file=config/termageddon-dev.tfvars
terraform apply -var-file=config/termageddon-dev.tfvars
```

### 4. Build and Push Docker Image

```bash
# Get ECR login token
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-2.amazonaws.com

# Get ECR repository URL from Terraform output
ECR_URL=$(terraform output -raw ecr_repository_url)

# Build image
cd ../../../backend
docker build -t termageddon-backend .

# Tag and push
docker tag termageddon-backend:latest ${ECR_URL}:latest
docker push ${ECR_URL}:latest
```

### 5. Update ECS Service

After pushing a new image, force a new deployment:

```bash
aws ecs update-service \
  --cluster termageddon-dev \
  --service termageddon-dev-service \
  --force-new-deployment \
  --region us-east-2
```

## Environment Configuration

### Development

- **RDS**: db.t3.micro, 20GB storage
- **ECS**: 0.25 vCPU, 512 MB memory
- **Tasks**: 1
- **Log retention**: 7 days

### Production

- **RDS**: db.t3.small, 20GB storage
- **ECS**: 0.5 vCPU, 1 GB memory
- **Tasks**: 1
- **Log retention**: 30 days

## Key Outputs

After applying, get important values:

```bash
# ALB DNS name (for frontend configuration)
terraform output alb_dns_name

# ECR repository URL
terraform output ecr_repository_url

# RDS endpoint (for database connections)
terraform output rds_address
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

## Health Checks

- **ECS**: Uses `/health/` endpoint (checks database connectivity)
- **ALB**: Uses `/health/` endpoint for target group health checks

## Secrets Management

Secrets are stored in AWS Secrets Manager:
- `termageddon-{env}-db-credentials`: Database connection info
- `termageddon-{env}-django-secret`: Django SECRET_KEY
- `termageddon-{env}-okta-config`: Okta configuration

ECS tasks automatically retrieve these via IAM roles.

## Cost Estimation

For internal/low-load use:
- **RDS**: ~$15-20/month (db.t3.micro/small, single-AZ)
- **ECS Fargate**: ~$10-15/month (0.25-0.5 vCPU, 512MB-1GB)
- **ALB**: ~$16/month
- **NAT Gateway**: ~$32/month
- **Data transfer**: Minimal for internal use
- **Total**: ~$100-150/month

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
cd terraform/aws/dev  # or prod
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
