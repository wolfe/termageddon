"""
Tests for Okta authentication
"""

import pytest
from rest_framework import status

from django.contrib.auth.models import User

from glossary.okta_auth import OktaTokenError, get_or_create_user_from_okta_token


@pytest.mark.django_db
class TestOktaAuth:
    """Test Okta authentication utilities"""

    def test_get_or_create_user_from_okta_token_new_user(self):
        """Test creating a new user from Okta token data"""
        token_data = {
            "sub": "00u1abc123def456",
            "email": "test@example.com",
            "first_name": "Test",
            "last_name": "User",
        }

        user = get_or_create_user_from_okta_token(token_data)

        assert user.email == "test@example.com"
        assert user.username == "00u1abc123def456"
        assert user.first_name == "Test"
        assert user.last_name == "User"

    def test_get_or_create_user_from_okta_token_existing_username(self):
        """Test finding existing user by username (Okta ID)"""
        # Create user with Okta ID as username
        user = User.objects.create_user(
            username="00u1abc123def456",
            email="existing@example.com",
            first_name="Original",
            last_name="Name",
        )

        token_data = {
            "sub": "00u1abc123def456",
            "email": "updated@example.com",
            "first_name": "Updated",
            "last_name": "Name",
        }

        found_user = get_or_create_user_from_okta_token(token_data)

        assert found_user.id == user.id
        assert found_user.first_name == "Updated"
        assert found_user.last_name == "Name"
        assert found_user.email == "updated@example.com"

    def test_get_or_create_user_from_okta_token_missing_sub(self):
        """Test error when token missing 'sub' claim"""
        token_data = {
            "email": "test@example.com",
        }

        with pytest.raises(OktaTokenError, match="missing 'sub' claim"):
            get_or_create_user_from_okta_token(token_data)

    def test_get_or_create_user_from_okta_token_missing_email(self):
        """Test error when token missing 'email' claim"""
        token_data = {
            "sub": "00u1abc123def456",
        }

        with pytest.raises(OktaTokenError, match="missing 'email' claim"):
            get_or_create_user_from_okta_token(token_data)

    def test_get_or_create_user_from_okta_token_existing_same_okta_id(self):
        """Test finding existing user when Okta ID already used as username"""
        # Create user with Okta ID as username
        user = User.objects.create_user(
            username="00u1abc123def456",
            email="existing@example.com",
            first_name="Original",
            last_name="Name",
        )

        token_data = {
            "sub": "00u1abc123def456",
            "email": "new@example.com",
            "first_name": "Updated",
            "last_name": "User",
        }

        # Should find existing user (same Okta ID) and update info
        found_user = get_or_create_user_from_okta_token(token_data)

        assert found_user.id == user.id
        assert found_user.username == "00u1abc123def456"
        assert found_user.email == "new@example.com"  # Email should be updated
        assert found_user.first_name == "Updated"
        assert found_user.last_name == "User"

    def test_get_or_create_user_from_okta_token_username_collision(self):
        """Test handling username collision when base username already exists"""
        # Create user with a username that would collide
        User.objects.create_user(
            username="00u1abc123def456",
            email="existing@example.com",
        )

        # Try to create another user with same Okta ID - should find existing
        token_data = {
            "sub": "00u1abc123def456",
            "email": "new@example.com",
            "first_name": "New",
            "last_name": "User",
        }

        # Should find existing user, not create new one
        user = get_or_create_user_from_okta_token(token_data)

        assert user.username == "00u1abc123def456"
        assert user.email == "new@example.com"


@pytest.mark.django_db
class TestOktaLoginEndpoint:
    """Test Okta login endpoint"""

    def test_okta_login_missing_token(self, api_client):
        """Test Okta login without token"""
        url = "/api/auth/okta-login/"
        response = api_client.post(url, {})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "okta_token" in str(response.data.get("detail", ""))

    def test_okta_login_invalid_token(self, api_client, monkeypatch):
        """Test Okta login with invalid token"""
        from glossary import okta_auth

        def mock_verify(*args, **kwargs):
            raise OktaTokenError("Invalid token")

        monkeypatch.setattr(okta_auth, "verify_okta_token", mock_verify)

        url = "/api/auth/okta-login/"
        response = api_client.post(url, {"okta_token": "invalid_token"})

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_okta_login_success(self, api_client, monkeypatch):
        """Test successful Okta login"""
        from glossary import okta_auth

        token_data = {
            "sub": "00u1abc123def456",
            "email": "test@example.com",
            "first_name": "Test",
            "last_name": "User",
        }

        def mock_verify(*args, **kwargs):
            return token_data

        monkeypatch.setattr(okta_auth, "verify_okta_token", mock_verify)

        url = "/api/auth/okta-login/"
        response = api_client.post(url, {"okta_token": "valid_token"})

        assert response.status_code == status.HTTP_200_OK
        assert "token" in response.data
        assert "user" in response.data
        assert response.data["user"]["username"] == "00u1abc123def456"
        assert response.data["user"]["first_name"] == "Test"
        assert response.data["user"]["last_name"] == "User"

        # Verify user was created with Okta ID as username
        user = User.objects.get(username="00u1abc123def456")
        assert user.email == "test@example.com"
