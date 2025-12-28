# Note: For internal use, we're serving Angular static files from Django
# This file is kept for potential future S3 hosting if needed

# S3 bucket for Angular static files (optional - not used if serving from Django)
resource "aws_s3_bucket" "frontend" {
  count  = 0 # Disabled - serving from Django instead
  bucket = "termageddon-${var.environment}-frontend"

  tags = merge(
    var.tags,
    {
      Name = "termageddon-${var.environment}-frontend"
    }
  )
}

# S3 bucket versioning (if bucket is enabled)
resource "aws_s3_bucket_versioning" "frontend" {
  count  = 0
  bucket = aws_s3_bucket.frontend[0].id

  versioning_configuration {
    status = "Enabled"
  }
}

# S3 bucket public access block
resource "aws_s3_bucket_public_access_block" "frontend" {
  count  = 0
  bucket = aws_s3_bucket.frontend[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
