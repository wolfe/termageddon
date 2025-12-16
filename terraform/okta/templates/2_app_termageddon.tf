/*****************************************************************
 * Termageddon OAuth Application
 *****************************************************************/

resource "okta_app_oauth" "termageddon_app" {
  label       = local.termageddon_app_name
  type        = "browser"
  omit_secret = true
  logo        = "${path.module}/logo.png"

  // General Settings / APPLICATION
  grant_types    = ["refresh_token", "authorization_code"]
  response_types = ["code"]

  // General Settings / LOGIN
  redirect_uris = distinct(flatten([
    "https://${var.termageddon_url}/callback",
    "https://${var.termageddon_backend_url}/oidc/callback",
    local.debugging_redirect_uris,
    var.additional_redirect_urls,
  ]))

  post_logout_redirect_uris = distinct(flatten([
    "https://${var.termageddon_url}",
    "https://${var.termageddon_backend_url}",
    local.debugging_post_logout_uris,
  ]))

  login_mode   = "SPEC"
  login_scopes = ["openid", "email", "profile"]
  login_uri    = "https://${var.termageddon_url}"
  hide_web     = false

  refresh_token_rotation = "ROTATE"
  refresh_token_leeway   = 30

  token_endpoint_auth_method = "none"
  pkce_required              = true

  // SIGN ON / OpenID Connect ID Token
  issuer_mode = "CUSTOM_URL"
}
