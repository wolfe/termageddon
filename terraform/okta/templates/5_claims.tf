/*****************************************************************
* TO VIEW SAMPLE CLAIMS:
*    As an Okta admin visit Security / API and search for the Termageddon auth server
*    Then select Token Preview in the main window. Sample field completion:
*       Oauth/OIDC client: Termageddon <NICKNAME>
*       Grant type: Authorization Code
*       User: (select any user)
*       Scopes: openid email profile
*    Click "Token" (not "ID Token") in the Preview to see claims.
*****************************************************************/

resource "okta_auth_server_claim" "email" {
  auth_server_id = okta_auth_server.termageddon_auth_server.id
  name           = "email"
  value          = "user.email"
  claim_type     = "RESOURCE"
}

resource "okta_auth_server_claim" "first_name" {
  auth_server_id = okta_auth_server.termageddon_auth_server.id
  name           = "first_name"
  value          = "user.firstName"
  claim_type     = "RESOURCE"
}

resource "okta_auth_server_claim" "last_name" {
  auth_server_id = okta_auth_server.termageddon_auth_server.id
  name           = "last_name"
  value          = "user.lastName"
  claim_type     = "RESOURCE"
}
