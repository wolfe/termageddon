output "okta_client_id" {
  value       = okta_app_oauth.termageddon_app.client_id
  description = "OAuth client ID for Termageddon application"
}

output "okta_issuer_uri" {
  value       = okta_auth_server.termageddon_auth_server.issuer
  description = "Okta authorization server issuer URI"
}
