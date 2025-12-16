"""
Okta authentication utilities for Termageddon.

This module provides functions to verify Okta JWT tokens and create/update Django users
based on Okta token claims.
"""

import logging
from typing import Any, Dict

import jwt
import requests

from django.conf import settings
from django.contrib.auth.models import User

logger = logging.getLogger(__name__)


class OktaTokenError(Exception):
    """Raised when Okta token validation fails"""

    pass


def get_okta_jwks() -> Dict[str, Any]:
    """Fetch Okta's public keys for token verification"""
    jwks_url = f"{settings.OKTA_ISSUER_URI}/v1/keys"
    try:
        response = requests.get(jwks_url, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        logger.error(f"Failed to fetch Okta JWKS: {e}")
        raise OktaTokenError(f"Failed to fetch Okta public keys: {e}")


def verify_okta_token(token: str) -> Dict[str, Any]:
    """
    Verify Okta JWT token and return decoded claims.

    Note: Audience validation is skipped as it's not needed for this security flow.
    """
    try:
        # Get Okta's public keys
        jwks = get_okta_jwks()

        # Get the signing key
        unverified_header = jwt.get_unverified_header(token)
        signing_key = None
        for key in jwks["keys"]:
            if key["kid"] == unverified_header["kid"]:
                # Construct RSA key from JWK components
                import base64

                from cryptography.hazmat.backends import default_backend
                from cryptography.hazmat.primitives.asymmetric import rsa

                # Decode base64url-encoded values (add padding if needed)
                def base64url_decode(value: str) -> bytes:
                    # Add padding
                    padding = 4 - len(value) % 4
                    if padding != 4:
                        value += "=" * padding
                    return base64.urlsafe_b64decode(value)

                n_bytes = base64url_decode(key["n"])
                e_bytes = base64url_decode(key["e"])

                # Convert to integers
                n_int = int.from_bytes(n_bytes, "big")
                e_int = int.from_bytes(e_bytes, "big")

                # Construct RSA public key
                public_numbers = rsa.RSAPublicNumbers(e_int, n_int)
                signing_key = public_numbers.public_key(default_backend())
                break

        if not signing_key:
            raise OktaTokenError("Unable to find appropriate signing key")

        # Decode and verify token (without audience check)
        claims = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            issuer=settings.OKTA_ISSUER_URI,
            options={
                "verify_aud": False,  # Skip audience validation
            },
        )

        logger.info(f"Successfully verified Okta token for user: {claims.get('sub')}")
        return claims

    except jwt.InvalidTokenError as e:
        logger.error(f"JWT verification failed: {e}")
        raise OktaTokenError(f"Invalid token: {e}")
    except Exception as e:
        logger.error(f"Unexpected error during token verification: {e}")
        raise OktaTokenError(f"Token verification failed: {e}")


def get_or_create_user_from_okta_token(token_data: Dict[str, Any]) -> User:
    """
    Get or create Django user from Okta token claims.

    Maps Okta claims to Django User fields:
    - sub -> username (Okta user ID)
    - email -> email
    - first_name -> first_name
    - last_name -> last_name
    """
    # Extract claims
    okta_user_id = token_data.get("sub")
    email = token_data.get("email")
    first_name = token_data.get("first_name", "")
    last_name = token_data.get("last_name", "")

    if not okta_user_id:
        raise OktaTokenError("Token missing 'sub' claim")

    if not email:
        raise OktaTokenError("Token missing 'email' claim")

    # Use Okta user ID as username for consistency
    # Okta IDs are unique, so we can use them directly as usernames
    username = okta_user_id

    # Get or create user
    user, created = User.objects.get_or_create(
        username=username,
        defaults={
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
        },
    )

    # Update user info if it changed (for existing users)
    if not created:
        user_updated = False
        if user.email != email:
            user.email = email
            user_updated = True
        if user.first_name != first_name:
            user.first_name = first_name
            user_updated = True
        if user.last_name != last_name:
            user.last_name = last_name
            user_updated = True

        if user_updated:
            user.save()
            logger.info(f"Updated user info from Okta: {username}")

    if created:
        logger.info(f"Created new user from Okta: {username}")

    return user
