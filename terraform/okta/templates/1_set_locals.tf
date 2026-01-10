/* Okta Terraform configuration for Termageddon
 *
 * PRE-CONDITIONS:
 * OKTA_API_TOKEN environment variable (Lastpass entry "Okta API Tokens")
 */

locals {
  suffix               = var.nickname == "" ? "" : " ${var.nickname}"
  termageddon_app_name = "Termageddon${local.suffix}"

  debugging_redirect_uris = [
    "http://localhost:4200/callback",
    "http://localhost:8000/oidc/callback",
  ]

  debugging_post_logout_uris = [
    "http://localhost:4200",
    "http://localhost:8000",
  ]
}
