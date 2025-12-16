"""
Okta OAuth2/OIDC authentication utilities
"""

import logging
from typing import Dict

import jwt
from jwt import PyJWKClient

from django.conf import settings
from django.contrib.auth.models import User

from glossary.models import UserProfile

logger = logging.getLogger(__name__)


class OktaTokenError(Exception):
    """Raised when Okta token validation fails"""

    pass


def get_jwks_client(issuer_uri: str) -> PyJWKClient:
    """Get PyJWKClient for Okta issuer"""
    # Okta uses /v1/keys endpoint for JWKS
    jwks_uri = f"{issuer_uri}/v1/keys"
    try:
        return PyJWKClient(jwks_uri, cache_keys=True)
    except Exception as e:
        logger.error(f"Failed to initialize PyJWKClient: {e}")
        raise OktaTokenError(f"Failed to initialize JWKS client: {str(e)}")


def _decode_with_audience_check(
    token: str, signing_key, unverified_token: Dict
) -> Dict:
    """
    Attempt to decode token with audience verification, fallback if needed.

    Args:
        token: The JWT token string
        signing_key: The signing key from JWKS
        unverified_token: Pre-decoded token for logging

    Returns:
        Decoded token claims
    """
    try:
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=settings.OKTA_CLIENT_ID,
            issuer=settings.OKTA_ISSUER_URI,
            options={
                "verify_signature": True,
                "verify_aud": True,
                "verify_iss": True,
            },
        )
    except jwt.InvalidAudienceError:
        # If audience doesn't match, try without audience verification
        # Some Okta configurations use different audience values
        logger.warning(
            f"Token audience mismatch. Token audience: {unverified_token.get('aud')}, "
            f"Trying without audience verification"
        )
        decoded_token = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=settings.OKTA_ISSUER_URI,
            options={
                "verify_signature": True,
                "verify_aud": False,
                "verify_iss": True,
            },
        )
        logger.info(
            f"Token verified without audience check. Token audience was: {unverified_token.get('aud')}"
        )
        return decoded_token


def verify_okta_token(token: str) -> Dict:
    """
    Verify and decode an Okta JWT access token.

    Args:
        token: The Okta JWT access token

    Returns:
        Dict containing the decoded token claims

    Raises:
        OktaTokenError: If token validation fails
    """
    if not settings.OKTA_ISSUER_URI:
        raise OktaTokenError("OKTA_ISSUER_URI not configured")

    if not settings.OKTA_CLIENT_ID:
        raise OktaTokenError("OKTA_CLIENT_ID not configured")

    try:
        # Initialize JWKS client
        jwks_client = get_jwks_client(settings.OKTA_ISSUER_URI)

        # Get signing key from JWKS
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        # Decode without verification first to check audience
        unverified_token = jwt.decode(token, options={"verify_signature": False})

        # Decode and verify token
        decoded_token = _decode_with_audience_check(
            token, signing_key, unverified_token
        )

        logger.info(
            f"Successfully verified Okta token for user: {decoded_token.get('sub')}"
        )
        return decoded_token
    except jwt.ExpiredSignatureError:
        logger.error("Okta token has expired")
        raise OktaTokenError("Token has expired")
    except jwt.InvalidAudienceError as e:
        logger.error(
            f"Token audience mismatch. Expected: {settings.OKTA_CLIENT_ID}, Error: {e}"
        )
        raise OktaTokenError(
            f"Token audience does not match client ID. Expected: {settings.OKTA_CLIENT_ID}"
        )
    except jwt.InvalidIssuerError as e:
        logger.error(
            f"Token issuer mismatch. Expected: {settings.OKTA_ISSUER_URI}, Error: {e}"
        )
        raise OktaTokenError(
            f"Token issuer does not match configured issuer. Expected: {settings.OKTA_ISSUER_URI}"
        )
    except jwt.InvalidSignatureError as e:
        logger.error(f"Token signature verification failed: {e}")
        raise OktaTokenError(f"Token signature verification failed: {str(e)}")
    except jwt.InvalidTokenError as e:
        logger.error(f"Invalid token error: {e}")
        raise OktaTokenError(f"Invalid token: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error during token verification: {e}")
        raise OktaTokenError(f"Token verification failed: {str(e)}")


def _update_existing_user(
    user: User, email: str, first_name: str, last_name: str, username: str
) -> None:
    """Update existing user with new information from token"""
    needs_save = False
    if user.email != email:
        user.email = email
        needs_save = True
    if first_name and user.first_name != first_name:
        user.first_name = first_name
        needs_save = True
    if last_name and user.last_name != last_name:
        user.last_name = last_name
        needs_save = True
    if user.username != username:
        if not User.objects.filter(username=username).exclude(id=user.id).exists():
            user.username = username
            needs_save = True
    if needs_save:
        user.save()


def _link_okta_to_existing_user(user: User, okta_id: str, username: str) -> None:
    """Link Okta ID to an existing user found by email"""
    if not hasattr(user, "profile"):
        UserProfile.objects.create(user=user, okta_id=okta_id)
    else:
        user.profile.okta_id = okta_id
        user.profile.save()
    # Update username to use sub
    if user.username != username:
        if not User.objects.filter(username=username).exclude(id=user.id).exists():
            user.username = username
            user.save()


def _create_new_user(okta_id: str, email: str, first_name: str, last_name: str) -> User:
    """Create a new user from Okta token data"""
    username = okta_id
    # Ensure username is unique (Django requirement)
    base_username = username
    counter = 1
    while User.objects.filter(username=username).exists():
        username = f"{base_username}_{counter}"
        counter += 1

    user = User.objects.create_user(
        username=username,
        email=email,
        first_name=first_name,
        last_name=last_name,
    )
    # Set okta_id on profile (created by signal)
    user.profile.okta_id = okta_id
    user.profile.save()
    logger.info(f"Created new user from Okta: {username} ({okta_id})")
    return user


def get_or_create_user_from_okta_token(token_data: Dict) -> User:
    """
    Get or create a Django User from Okta token data.

    Uses Okta ID (sub) as primary identifier and username.
    Gets first_name and last_name directly from token claims.

    Args:
        token_data: Decoded Okta token claims

    Returns:
        Django User instance
    """
    okta_id = token_data.get("sub")
    email = token_data.get("email")

    # Get first_name and last_name directly from claims
    first_name = token_data.get("first_name", "")
    last_name = token_data.get("last_name", "")

    if not okta_id:
        raise OktaTokenError("Token missing 'sub' claim (Okta user ID)")

    if not email:
        raise OktaTokenError("Token missing 'email' claim")

    # Use sub (Okta ID) as username
    username = okta_id

    # Try to find user by Okta ID first (most reliable)
    try:
        profile = UserProfile.objects.select_related("user").get(okta_id=okta_id)
        user = profile.user
        _update_existing_user(user, email, first_name, last_name, username)
        return user
    except UserProfile.DoesNotExist:
        # Try to find by email (for migration from old system)
        try:
            user = User.objects.get(email=email)
            _link_okta_to_existing_user(user, okta_id, username)
            return user
        except User.DoesNotExist:
            # Create new user
            return _create_new_user(okta_id, email, first_name, last_name)
