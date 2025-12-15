terraform {
  required_providers {
    okta = {
      source  = "okta/okta"
      version = ">= 4.11"
    }
  }
  required_version = ">=1.5.5, < 1.5.6"
}
