terraform {
  backend "s3" {
    bucket         = "verisk-dev-terraform-state"
    region         = "us-east-2"
    key            = "termageddon/aws/dev/terraform.tfstate"
    dynamodb_table = "matisse_terraform_lock_ohio"
  }
}
