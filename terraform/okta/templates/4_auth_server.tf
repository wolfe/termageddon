resource "okta_auth_server" "termageddon_auth_server" {
  audiences   = ["api://default"]
  description = "${local.termageddon_app_name} auth server"
  name        = local.termageddon_app_name
  issuer_mode = "CUSTOM_URL"
  status      = "ACTIVE"
}

resource "okta_auth_server_policy" "termageddon_policy" {
  auth_server_id   = okta_auth_server.termageddon_auth_server.id
  name             = local.termageddon_app_name
  description      = "${local.termageddon_app_name} access policy"
  status           = "ACTIVE"
  priority         = 1
  client_whitelist = [okta_app_oauth.termageddon_app.id]
}

resource "okta_auth_server_policy_rule" "termageddon_policy_rule" {
  auth_server_id       = okta_auth_server.termageddon_auth_server.id
  policy_id            = okta_auth_server_policy.termageddon_policy.id
  status               = "ACTIVE"
  name                 = "${local.termageddon_app_name} rule"
  priority             = 1
  grant_type_whitelist = ["authorization_code"]
  group_whitelist      = ["EVERYONE"]
  scope_whitelist      = ["openid", "offline_access", "email", "profile"]

  access_token_lifetime_minutes = 60
}
