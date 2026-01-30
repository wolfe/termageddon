import pytest
from rest_framework import status
from rest_framework.test import APIClient

from django.urls import reverse

from glossary.tests.conftest import (
    EntryDraftFactory,
    EntryFactory,
    PerspectiveFactory,
    TermFactory,
    UserFactory,
)


@pytest.fixture
def api_client():
    """Fixture for API client"""
    return APIClient()


@pytest.fixture
def authenticated_client(api_client):
    """Fixture for authenticated API client"""
    from rest_framework.authtoken.models import Token

    user = UserFactory()
    token = Token.objects.create(user=user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    api_client.user = user
    return api_client


@pytest.mark.django_db
class TestErrorHandling:
    """Test error handling scenarios"""

    def test_invalid_json_requests(self, authenticated_client):
        """Test handling of malformed JSON requests"""
        url = reverse("entry-lookup-or-create-entry")

        # Send malformed JSON
        response = authenticated_client.post(url, data="invalid json", content_type="application/json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_permission_errors_with_deleted_objects(self, authenticated_client):
        """Test permission checks with soft-deleted objects"""
        # Create and delete objects
        term = TermFactory()
        perspective = PerspectiveFactory()
        entry = EntryFactory(term=term, perspective=perspective)

        # Soft delete the entry
        entry.delete()

        # Try to access deleted entry
        url = reverse("entry-detail", kwargs={"pk": entry.id})
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_unauthorized_access_to_protected_endpoints(self, api_client):
        """Test that protected endpoints require authentication"""
        # Test various protected endpoints without authentication
        endpoints = [
            reverse("entry-lookup-or-create-entry"),
            reverse("entrydraft-list"),
            reverse("comment-list"),
        ]

        for endpoint in endpoints:
            response = api_client.post(endpoint, {})
            assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_invalid_entry_id_in_urls(self, authenticated_client):
        """Test handling of invalid entry IDs in URLs"""
        # Test with non-existent entry ID
        url = reverse("entry-detail", kwargs={"pk": 99999})
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_invalid_draft_id_in_urls(self, authenticated_client):
        """Test handling of invalid draft IDs in URLs"""
        # Test with non-existent draft ID
        url = reverse("entrydraft-detail", kwargs={"pk": 99999})
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_missing_required_fields(self, authenticated_client):
        """Test handling of missing required fields"""
        # Test entry creation without required fields
        url = reverse("entry-lookup-or-create-entry")
        data = {}  # Missing required fields

        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_duplicate_entry_creation(self, authenticated_client):
        """Test handling of duplicate entry creation attempts"""
        term = TermFactory()
        perspective = PerspectiveFactory()

        # Create first entry
        EntryFactory(term=term, perspective=perspective)

        # Try to create duplicate entry
        url = reverse("entry-lookup-or-create-entry")
        data = {"term_id": term.id, "perspective_id": perspective.id}

        response = authenticated_client.post(url, data)

        # Should find existing entry, not create duplicate
        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_new"] is False

    def test_entry_draft_approval_edge_cases(self, authenticated_client):
        """Test edge cases in draft approval"""
        other_user = UserFactory()
        entry = EntryFactory()
        draft = EntryDraftFactory(entry=entry, author=other_user)

        # Test approving non-existent draft
        url = reverse("entrydraft-approve", kwargs={"pk": 99999})
        response = authenticated_client.post(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

        # Test approving already approved draft
        approver1 = UserFactory()
        approver2 = UserFactory()

        from rest_framework.authtoken.models import Token

        token1 = Token.objects.create(user=approver1)
        token2 = Token.objects.create(user=approver2)

        client1 = APIClient()
        client1.credentials(HTTP_AUTHORIZATION=f"Token {token1.key}")

        client2 = APIClient()
        client2.credentials(HTTP_AUTHORIZATION=f"Token {token2.key}")

        approve_url = reverse("entrydraft-approve", kwargs={"pk": draft.id})

        # First approval
        response1 = client1.post(approve_url + "?show_all=true")
        assert response1.status_code == status.HTTP_200_OK

        # Second approval
        response2 = client2.post(approve_url + "?show_all=true")
        assert response2.status_code == status.HTTP_200_OK

        # Try to approve again (should fail)
        response3 = client1.post(approve_url + "?show_all=true")
        assert response3.status_code == status.HTTP_400_BAD_REQUEST

    def test_comment_creation_edge_cases(self, authenticated_client):
        """Test edge cases in comment creation"""
        EntryFactory()  # Create entry for test

        # Test comment on non-existent draft
        url = reverse("comment-list")
        data = {
            "draft_id": 99999,  # Non-existent draft
            "text": "Test comment",
        }

        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST  # Comment creation fails with non-existent draft

    def test_pagination_edge_cases(self, authenticated_client):
        """Test edge cases in pagination"""
        # Test with invalid page parameters
        url = reverse("entry-list")

        # Test negative page
        response = authenticated_client.get(url, {"page": "-1"})
        assert response.status_code == status.HTTP_404_NOT_FOUND  # Django returns 404 for invalid pages

        # Test very large page
        response = authenticated_client.get(url, {"page": "999999"})
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_search_edge_cases(self, authenticated_client):
        """Test edge cases in search functionality"""
        url = reverse("entry-list")

        # Test empty search
        response = authenticated_client.get(url, {"search": ""})
        assert response.status_code == status.HTTP_200_OK

        # Test very long search term
        long_search = "x" * 1000
        response = authenticated_client.get(url, {"search": long_search})
        assert response.status_code == status.HTTP_200_OK

        # Test special characters in search
        response = authenticated_client.get(url, {"search": "!@#$%^&*()"})
        assert response.status_code == status.HTTP_200_OK

    def test_file_upload_edge_cases(self, authenticated_client):
        """Test edge cases in file upload scenarios"""
        # Test uploading file that's too large (if file upload is implemented)
        # This is a placeholder for future file upload functionality
        pass

    def test_concurrent_modification_edge_cases(self, authenticated_client):
        """Test edge cases with concurrent modifications"""
        entry = EntryFactory()
        draft = EntryDraftFactory(entry=entry, author=authenticated_client.user)

        # Simulate concurrent modification by updating the same draft
        url = reverse("entrydraft-detail", kwargs={"pk": draft.id})

        # First update
        data1 = {"content": "First update"}
        response1 = authenticated_client.patch(url, data1)
        assert response1.status_code == status.HTTP_200_OK

        # Second update (should work with linear draft history)
        data2 = {"content": "Second update"}
        response2 = authenticated_client.patch(url, data2)
        assert response2.status_code == status.HTTP_200_OK

    def test_memory_limit_edge_cases(self, authenticated_client):
        """Test edge cases that might cause memory issues"""
        # Test creating many entries (stress test)
        perspective = PerspectiveFactory()

        for i in range(10):  # Reasonable number for testing
            url = reverse("entry-lookup-or-create-entry")
            data = {
                "term_text": f"Stress Test Term {i}",
                "perspective_id": perspective.id,
            }

            response = authenticated_client.post(url, data)
            assert response.status_code == status.HTTP_200_OK

    def test_database_constraint_violations(self, authenticated_client):
        """Test handling of database constraint violations"""
        # Test creating term with duplicate text
        TermFactory(text="Duplicate Term")

        with pytest.raises(Exception):  # Should raise validation error
            TermFactory(text="Duplicate Term")

    def test_network_timeout_simulation(self, authenticated_client):
        """Test handling of network timeout scenarios"""
        # This would typically be tested with actual network simulation
        # For now, we'll test that the API handles missing data gracefully

        url = reverse("entry-lookup-or-create-entry")
        data = {
            "term_text": "Timeout Test Term",
            "perspective_id": 99999,  # Non-existent perspective
        }

        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_404_NOT_FOUND
