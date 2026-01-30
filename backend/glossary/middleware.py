"""
Custom middleware for Termageddon
"""

import logging

from rest_framework.authtoken.models import Token

from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)
User = get_user_model()


class TokenToSessionMiddleware:
    """
    Middleware to automatically authenticate Django admin requests using API token.

    When a user accesses Django admin through the proxy (localhost:4200/admin),
    this middleware checks for an API token in the Authorization header or cookies
    and automatically logs the user into the Django session if they're not already
    authenticated. This allows seamless admin access after logging in through the frontend.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Only process admin requests
        if request.path.startswith("/admin/") and not request.user.is_authenticated:
            # Try to get token from Authorization header
            token_key = None
            auth_header = request.META.get("HTTP_AUTHORIZATION", "")
            if auth_header.startswith("Token "):
                token_key = auth_header[6:].strip()
            elif auth_header.startswith("Bearer "):
                token_key = auth_header[7:].strip()

            # If no token in header, try to get from cookies (set by frontend if needed)
            if not token_key:
                token_key = request.COOKIES.get("auth_token")

            if token_key:
                try:
                    token = Token.objects.select_related("user").get(key=token_key)
                    user = token.user

                    # Check if user is staff (required for admin access)
                    if user.is_staff:
                        # Log user into Django session
                        # Set backend attribute required by login()
                        user.backend = "django.contrib.auth.backends.ModelBackend"
                        from django.contrib.auth import login

                        login(request, user)
                        logger.info(
                            f"TokenToSessionMiddleware: Auto-authenticated user {user.username} for admin access"
                        )
                except Token.DoesNotExist:
                    logger.debug("TokenToSessionMiddleware: Invalid token attempted for admin access")
                except Exception as e:
                    logger.warning(f"TokenToSessionMiddleware: Error during token authentication: {e}")

        response = self.get_response(request)
        return response
