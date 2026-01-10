# Testing Guide for AWS ECS Fargate Deployment

## Testing Order

### 1. Test Dockerfile Locally (First)

This is the fastest way to catch issues before deploying to AWS.

#### Steps:

```bash
# 1. Build the Docker image locally
cd backend
docker build -t termageddon-backend:test .

# 2. Test with SQLite (quick test)
docker run -p 8000:8000 \
  -e SECRET_KEY="test-secret-key" \
  -e DEBUG="True" \
  -e ALLOWED_HOSTS="localhost,127.0.0.1" \
  termageddon-backend:test

# 3. Verify health check works
curl http://localhost:8000/health/

# 4. Test with PostgreSQL (simulate AWS)
# Start a local PostgreSQL container
docker run -d --name test-postgres \
  -e POSTGRES_DB=termageddon \
  -e POSTGRES_USER=termageddon \
  -e POSTGRES_PASSWORD=testpass \
  -p 5432:5432 postgres:15

# Run Django container with PostgreSQL
docker run -p 8000:8000 \
  -e SECRET_KEY="test-secret-key" \
  -e DEBUG="True" \
  -e ALLOWED_HOSTS="localhost,127.0.0.1" \
  -e DB_HOST="host.docker.internal" \
  -e DB_PORT="5432" \
  -e DB_NAME="termageddon" \
  -e DB_USER="termageddon" \
  -e DB_PASSWORD="testpass" \
  --add-host=host.docker.internal:host-gateway \
  termageddon-backend:test
```

#### What to Verify:
- ✅ Image builds successfully
- ✅ Container starts without errors
- ✅ Health check endpoint responds (`/health/`)
- ✅ Database migrations run
- ✅ Static files are collected
- ✅ Gunicorn serves the app

### 2. Test Terraform (After Docker Works)

Once the Docker image works locally, test the AWS infrastructure.

#### Steps:

```bash
# 1. Configure AWS credentials
aws configure

# 2. Initialize Terraform
cd terraform/aws/dev
terraform init

# 3. Review the plan
terraform plan -var-file=config/termageddon-dev.tfvars

# 4. Apply (creates infrastructure)
terraform apply -var-file=config/termageddon-dev.tfvars

# 5. Get outputs
terraform output alb_dns_name
terraform output ecr_repository_url

# 6. Build and push Docker image to ECR
# (Use the ECR URL from output)
ECR_URL=$(terraform output -raw ecr_repository_url)
aws ecr get-login-password --region us-east-2 | \
  docker login --username AWS --password-stdin ${ECR_URL%%/*}

docker tag termageddon-backend:test ${ECR_URL}:latest
docker push ${ECR_URL}:latest

# 7. Force ECS service update
aws ecs update-service \
  --cluster termageddon-dev \
  --service termageddon-dev-service \
  --force-new-deployment \
  --region us-east-2
```

#### What to Verify:
- ✅ Terraform creates all resources
- ✅ ECS service starts tasks
- ✅ Health checks pass
- ✅ ALB routes traffic correctly
- ✅ Database connection works
- ✅ Logs appear in CloudWatch

## Quick Test Checklist

### Local Docker:
- [ ] `docker build` succeeds
- [ ] Container starts
- [ ] `/health/` returns 200
- [ ] Migrations run
- [ ] Can access `/api/` endpoints

### AWS:
- [ ] `terraform apply` succeeds
- [ ] ECS tasks are running
- [ ] ALB health checks pass
- [ ] Can access app via ALB DNS
- [ ] CloudWatch logs show activity

## Troubleshooting

### Docker Build Issues

**Error: Cannot find requirements.txt**
- Ensure you're in the `backend/` directory when building

**Error: Failed to build psycopg2-binary / pg_config not found**
- **Fixed**: Dockerfile now uses Python 3.12 (psycopg2-binary has pre-built wheels for 3.12)
- The Dockerfile includes `libpq-dev` and `python3-dev` in the builder stage

**Error: Module not found (Django)**
- **Fixed**: Added `PYTHONPATH` environment variable to Dockerfile
- Ensure you're using the updated Dockerfile with Python 3.12

**Error: Permission denied on entrypoint.sh**
- The Dockerfile should set execute permissions, but if it fails:
  ```bash
  chmod +x backend/entrypoint.sh
  ```

### Docker Run Issues

**Error: Database connection failed**
- For SQLite test: This is expected if DB_HOST is set - unset it
- For PostgreSQL test: Ensure PostgreSQL container is running and accessible

**Error: Health check fails**
- Check that `/health/` endpoint exists in URLs
- Verify database is accessible

**Error: Static files not found**
- This is normal on first run - `collectstatic` should create them
- Check container logs for `collectstatic` output

### Terraform Issues

**Error: AWS credentials not found**
- Run `aws configure` to set up credentials
- Or set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment variables

**Error: S3 backend bucket doesn't exist**
- The bucket `verisk-dev-terraform-state` must exist
- Or modify `0_backend.tf` to use a different bucket

**Error: IAM permissions insufficient**
- Ensure your AWS user/role has permissions for:
  - ECS, RDS, VPC, EC2, IAM, Secrets Manager, CloudWatch, ECR, ALB
