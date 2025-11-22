import pytest
from rest_framework import status
from rest_framework.test import APIClient

from django.urls import reverse

from glossary.models import Comment, EntryDraft
from glossary.tests.conftest import (
    PerspectiveCuratorFactory,
    PerspectiveFactory,
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
class TestEntryCreationIntegration:
    """Integration tests for the complete entry creation workflow"""

    def test_complete_entry_creation_workflow(self, authenticated_client):
        """Test the full workflow from term creation to published entry"""
        # 1. Create term and entry using lookup_or_create_entry
        perspective = PerspectiveFactory()

        url = reverse("entry-lookup-or-create-entry")
        data = {"term_text": "Integration Test Term", "perspective_id": perspective.id}

        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_new"] is True

        entry_id = response.data["entry_id"]

        # 2. Create draft
        draft_url = reverse("entrydraft-list")
        draft_data = {
            "entry": entry_id,
            "content": "<p>This is a test definition for integration testing.</p>",
        }

        draft_response = authenticated_client.post(draft_url, draft_data)
        assert draft_response.status_code == status.HTTP_201_CREATED
        draft_id = draft_response.data["id"]

        # 3. Get approvals (simulate multiple users approving)
        approver1 = UserFactory()
        approver2 = UserFactory()

        # Create tokens for approvers
        from rest_framework.authtoken.models import Token

        token1 = Token.objects.create(user=approver1)
        token2 = Token.objects.create(user=approver2)

        # Approve with first user
        approve_url = reverse("entrydraft-approve", kwargs={"pk": draft_id})
        client1 = APIClient()
        client1.credentials(HTTP_AUTHORIZATION=f"Token {token1.key}")
        approve_response1 = client1.post(approve_url + "?show_all=true")
        assert approve_response1.status_code == status.HTTP_200_OK

        # Approve with second user
        client2 = APIClient()
        client2.credentials(HTTP_AUTHORIZATION=f"Token {token2.key}")
        approve_response2 = client2.post(approve_url + "?show_all=true")
        assert approve_response2.status_code == status.HTTP_200_OK

        # 4. Publish
        publish_url = reverse("entrydraft-publish", kwargs={"pk": draft_id})
        publish_response = authenticated_client.post(publish_url)
        assert publish_response.status_code == status.HTTP_200_OK

        # 5. Verify final state
        draft = EntryDraft.objects.get(id=draft_id)
        assert draft.is_published is True
        assert draft.approval_count == 2

        # Verify entry is accessible
        entry_url = reverse("entry-detail", kwargs={"pk": entry_id})
        entry_response = authenticated_client.get(entry_url)
        assert entry_response.status_code == status.HTTP_200_OK

        # Verify entry appears in glossary
        glossary_url = reverse("entry-list")
        glossary_response = authenticated_client.get(glossary_url)
        assert glossary_response.status_code == status.HTTP_200_OK
        entry_ids = [entry["id"] for entry in glossary_response.data["results"]]
        assert entry_id in entry_ids

    def test_entry_creation_with_concurrent_edits(self, authenticated_client):
        """Test handling of concurrent edits during creation"""
        perspective = PerspectiveFactory()

        # Create initial entry
        url = reverse("entry-lookup-or-create-entry")
        data = {"term_text": "Concurrent Test Term", "perspective_id": perspective.id}

        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_200_OK
        entry_id = response.data["entry_id"]

        # Create first draft
        draft_url = reverse("entrydraft-list")
        draft_data = {"entry": entry_id, "content": "<p>First draft content</p>"}

        draft_response = authenticated_client.post(draft_url, draft_data)
        assert draft_response.status_code == status.HTTP_201_CREATED
        draft1_id = draft_response.data["id"]

        # Create second draft (should replace first)
        draft_data2 = {"entry": entry_id, "content": "<p>Second draft content</p>"}

        draft_response2 = authenticated_client.post(draft_url, draft_data2)
        assert draft_response2.status_code == status.HTTP_201_CREATED
        draft2_id = draft_response2.data["id"]

        # Verify draft replacement
        draft2 = EntryDraft.objects.get(id=draft2_id)
        assert draft2.replaces_draft_id == draft1_id

        # Verify first draft is no longer active
        draft1 = EntryDraft.objects.get(id=draft1_id)
        assert draft1.replaces_draft is None

    def test_entry_creation_with_review_requests(self, authenticated_client):
        """Test creation workflow with review requests"""
        perspective = PerspectiveFactory()

        # Create entry
        url = reverse("entry-lookup-or-create-entry")
        data = {"term_text": "Review Test Term", "perspective_id": perspective.id}

        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_200_OK
        entry_id = response.data["entry_id"]

        # Create draft
        draft_url = reverse("entrydraft-list")
        draft_data = {"entry": entry_id, "content": "<p>Draft content for review</p>"}

        draft_response = authenticated_client.post(draft_url, draft_data)
        assert draft_response.status_code == status.HTTP_201_CREATED
        draft_id = draft_response.data["id"]

        # Request specific reviewers
        reviewer1 = UserFactory()
        reviewer2 = UserFactory()

        request_review_url = reverse(
            "entrydraft-request-review", kwargs={"pk": draft_id}
        )
        review_data = {"reviewer_ids": [reviewer1.id, reviewer2.id]}

        review_response = authenticated_client.post(
            request_review_url, review_data, format="json"
        )
        assert review_response.status_code == status.HTTP_200_OK

        # Verify reviewers were added
        draft = EntryDraft.objects.get(id=draft_id)
        requested_reviewers = list(draft.requested_reviewers.all())
        assert len(requested_reviewers) == 2
        assert reviewer1 in requested_reviewers
        assert reviewer2 in requested_reviewers

    def test_entry_creation_with_comments(self, authenticated_client):
        """Test entry creation workflow with comments"""
        perspective = PerspectiveFactory()

        # Create entry
        url = reverse("entry-lookup-or-create-entry")
        data = {"term_text": "Comment Test Term", "perspective_id": perspective.id}

        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_200_OK
        entry_id = response.data["entry_id"]

        # Create draft
        draft_url = reverse("entrydraft-list")
        draft_data = {
            "entry": entry_id,
            "content": "<p>Draft content with comments</p>",
        }

        draft_response = authenticated_client.post(draft_url, draft_data)
        assert draft_response.status_code == status.HTTP_201_CREATED
        draft_id = draft_response.data["id"]

        # Add comment
        comment_url = reverse("comment-list")
        comment_data = {
            "draft_id": draft_id,
            "text": "This is a test comment",
        }

        comment_response = authenticated_client.post(comment_url, comment_data)
        assert comment_response.status_code == status.HTTP_201_CREATED
        comment_id = comment_response.data["id"]

        # Verify comment was created
        comment = Comment.objects.get(id=comment_id)
        assert comment.text == "This is a test comment"
        assert comment.draft.id == draft_id

    def test_entry_creation_workflow_with_perspective_curator(
        self, authenticated_client
    ):
        """Test entry creation and endorsement by perspective curator"""
        perspective = PerspectiveFactory()

        # Make user a perspective curator
        PerspectiveCuratorFactory(
            user=authenticated_client.user, perspective=perspective
        )

        # Create entry
        url = reverse("entry-lookup-or-create-entry")
        data = {"term_text": "Curator Test Term", "perspective_id": perspective.id}

        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_200_OK
        entry_id = response.data["entry_id"]

        # Create and publish draft
        draft_url = reverse("entrydraft-list")
        draft_data = {
            "entry": entry_id,
            "content": "<p>Draft content for endorsement</p>",
        }

        draft_response = authenticated_client.post(draft_url, draft_data)
        assert draft_response.status_code == status.HTTP_201_CREATED
        draft_id = draft_response.data["id"]

        # Get approvals and publish
        approver1 = UserFactory()
        approver2 = UserFactory()

        from rest_framework.authtoken.models import Token

        token1 = Token.objects.create(user=approver1)
        token2 = Token.objects.create(user=approver2)

        approve_url = reverse("entrydraft-approve", kwargs={"pk": draft_id})

        client1 = APIClient()
        client1.credentials(HTTP_AUTHORIZATION=f"Token {token1.key}")
        client1.post(approve_url + "?show_all=true")

        client2 = APIClient()
        client2.credentials(HTTP_AUTHORIZATION=f"Token {token2.key}")
        client2.post(approve_url + "?show_all=true")

        publish_url = reverse("entrydraft-publish", kwargs={"pk": draft_id})
        publish_response = authenticated_client.post(publish_url)
        assert publish_response.status_code == status.HTTP_200_OK

        # Endorse as perspective curator
        endorse_url = reverse("entry-endorse", kwargs={"pk": entry_id})
        endorse_response = authenticated_client.post(endorse_url)
        assert endorse_response.status_code == status.HTTP_200_OK

        # Verify endorsement
        draft = EntryDraft.objects.get(id=draft_id)
        assert draft.is_endorsed is True
        assert draft.endorsed_by == authenticated_client.user
