variable "okta_org_name" {
  type        = string
  description = "Okta organization name (e.g., sso.uat, sso.emea)"
}

variable "nickname" {
  type        = string
  description = "Environment nickname (e.g., DEV, STAGING, PROD)"
}

variable "termageddon_url" {
  type        = string
  description = "Termageddon frontend URL"
}

variable "termageddon_backend_url" {
  type        = string
  description = "Termageddon backend API URL"
}

variable "additional_redirect_urls" {
  type        = list(string)
  default     = []
  description = "Additional redirect URIs for testing/development"
}
