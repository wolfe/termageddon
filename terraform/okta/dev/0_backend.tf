terraform {
  backend "s3" {
    bucket         = "verisk-dev-terraform-state"
    region         = "us-east-2"
    key            = "termageddon/okta/terraform.tfstate"
    dynamodb_table = "matisse_terraform_lock_ohio"
  }
}

provider "okta" {
  base_url = "verisk.com"
  org_name = var.okta_org_name
}
