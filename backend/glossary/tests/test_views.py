import pytest
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from django.contrib.contenttypes.models import ContentType
from django.urls import reverse

from glossary.models import (
    Comment,
    Entry,
    EntryDraft,
    Perspective,
    PerspectiveCurator,
)
from glossary.tests.conftest import (
    CommentFactory,
    EntryDraftFactory,
    EntryFactory,
    PerspectiveCuratorFactory,
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
    user = UserFactory()
    token = Token.objects.create(user=user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    api_client.user = user
    return api_client


@pytest.fixture
def staff_client(api_client):
    """Fixture for staff user API client"""
    user = UserFactory(is_staff=True)
    token = Token.objects.create(user=user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    api_client.user = user
    return api_client


@pytest.mark.django_db
class TestAuthEndpoints:
    """Test authentication endpoints"""

    def test_login_success(self, api_client):
        """Test successful login"""
        user = UserFactory()
        user.set_password("testpass123")
        user.save()

        url = reverse("auth-login")
        data = {"username": user.username, "password": "testpass123"}
        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert "token" in response.data
        assert "user" in response.data
        assert response.data["user"]["username"] == user.username

    def test_login_invalid_credentials(self, api_client):
        """Test login with invalid credentials"""
        url = reverse("auth-login")
        data = {"username": "nonexistent", "password": "wrongpass"}
        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_logout(self, authenticated_client):
        """Test logout deletes token"""
        url = reverse("auth-logout")
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert not Token.objects.filter(user=authenticated_client.user).exists()

    def test_current_user(self, authenticated_client):
        """Test /api/auth/me/ endpoint"""
        url = reverse("auth-me")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["username"] == authenticated_client.user.username
        assert "perspective_curator_for" in response.data


@pytest.mark.django_db
class TestPerspectiveViewSet:
    """Test Perspective API endpoints"""

    def test_list_perspectives(self, authenticated_client):
        """Test listing perspectives"""
        PerspectiveFactory.create_batch(3)
        url = reverse("perspective-list")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 3

    def test_create_perspective_as_staff(self, staff_client):
        """Test creating perspective as staff"""
        url = reverse("perspective-list")
        data = {"name": "Finance", "description": "Financial terms"}
        response = staff_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert Perspective.objects.filter(name="Finance").exists()

    def test_create_perspective_as_regular_user_fails(self, authenticated_client):
        """Test creating perspective as regular user fails"""
        url = reverse("perspective-list")
        data = {"name": "Finance", "description": "Financial terms"}
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestTermViewSet:
    """Test Term API endpoints"""

    def test_list_terms(self, authenticated_client):
        """Test listing terms"""
        TermFactory.create_batch(3)
        url = reverse("term-list")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 3

    def test_search_terms(self, authenticated_client):
        """Test searching terms"""
        TermFactory(text="API")
        TermFactory(text="Database")
        url = reverse("term-list")
        response = authenticated_client.get(url, {"search": "API"})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["text"] == "API"

    def test_filter_official_terms(self, authenticated_client):
        """Test filtering by is_official"""
        TermFactory(text="Official", is_official=True)
        TermFactory(text="Unofficial", is_official=False)
        url = reverse("term-list")
        response = authenticated_client.get(url, {"is_official": "true"})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["is_official"] is True


@pytest.mark.django_db
class TestEntryViewSet:
    """Test Entry API endpoints"""

    def test_list_entries(self, authenticated_client):
        """Test listing entries"""
        # Create entries with published versions
        entries = EntryFactory.create_batch(3)
        for entry in entries:
            EntryDraftFactory(entry=entry, is_published=True)

        url = reverse("entry-list")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 3

    def test_filter_entries_by_perspective(self, authenticated_client):
        """Test filtering entries by perspective"""
        perspective1 = PerspectiveFactory()
        perspective2 = PerspectiveFactory()
        entry1 = EntryFactory(perspective=perspective1)
        entry2 = EntryFactory(perspective=perspective2)

        # Create published versions
        EntryDraftFactory(entry=entry1, is_published=True)
        EntryDraftFactory(entry=entry2, is_published=True)

        url = reverse("entry-list")
        response = authenticated_client.get(url, {"perspective": perspective1.id})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["perspective"]["id"] == perspective1.id

    def test_grouped_by_term(self, authenticated_client):
        """Test grouped_by_term aggregates entries by term"""
        term = TermFactory(text="Cache")
        perspective1 = PerspectiveFactory()
        perspective2 = PerspectiveFactory()
        e1 = EntryFactory(term=term, perspective=perspective1)
        e2 = EntryFactory(term=term, perspective=perspective2)
        EntryDraftFactory(entry=e1, is_published=True)
        EntryDraftFactory(entry=e2, is_published=True)

        url = reverse("entry-grouped-by-term")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)
        assert response.data[0]["term"]["text"] == "Cache"
        assert len(response.data[0]["entries"]) == 2

    def test_create_with_term(self, authenticated_client):
        """Test atomic creation of term + entry"""
        perspective = PerspectiveFactory()
        url = reverse("entry-create-with-term")
        payload = {
            "term_text": "New Term",
            "perspective_id": perspective.id,
            "is_official": False,
        }
        response = authenticated_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert Entry.objects.filter(
            term__text="New Term", perspective=perspective
        ).exists()

    def test_create_with_term_long_text(self, authenticated_client):
        """Test creating a term with text exceeding length limit"""
        perspective = PerspectiveFactory()

        url = reverse("entry-create-with-term")
        data = {
            "term_text": "x" * 1000,  # Very long term text
            "perspective_id": perspective.id,
        }

        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Term text cannot exceed 255 characters" in response.data["detail"]

    def test_endorse_as_perspective_curator(self, authenticated_client):
        """Test endorsing entry as perspective curator"""
        perspective = PerspectiveFactory()
        entry = EntryFactory(perspective=perspective)
        # Create a published version
        draft = EntryDraftFactory(entry=entry, is_published=True)
        PerspectiveCuratorFactory(
            user=authenticated_client.user, perspective=perspective
        )

        url = reverse("entry-endorse", kwargs={"pk": entry.id})
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        draft.refresh_from_db()
        assert draft.is_endorsed is True
        assert draft.endorsed_by == authenticated_client.user

    def test_endorse_as_non_curator_fails(self, authenticated_client):
        """Test endorsing entry without being curator fails"""
        entry = EntryFactory()
        # Create a published version
        EntryDraftFactory(entry=entry, is_published=True)

        url = reverse("entry-endorse", kwargs={"pk": entry.id})
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestEntryDraftViewSet:
    """Test EntryDraft API endpoints"""

    def test_create_entry_draft(self, authenticated_client):
        """Test creating an entry draft"""
        entry = EntryFactory()
        url = reverse("entrydraft-list")
        data = {
            "entry": entry.id,
            "content": "<p>Test definition</p>",
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert EntryDraft.objects.filter(entry=entry).exists()

    def test_list_with_eligibility_and_search(self, authenticated_client):
        """Test eligibility and search filters"""
        other_user = UserFactory()
        # Create drafts: one by other user with specific term, one by current user
        draft1 = EntryDraftFactory(author=other_user, content="absorption of energy")
        draft2 = EntryDraftFactory(
            author=authenticated_client.user, content="other term"
        )

        url = reverse("entrydraft-list")
        # eligibility=can_approve should exclude own drafts
        resp1 = authenticated_client.get(url, {"eligibility": "can_approve"})
        assert resp1.status_code == status.HTTP_200_OK
        ids = [v["id"] for v in resp1.data["results"]]
        assert draft1.id in ids
        assert draft2.id not in ids

        # search should find by term name (not content)
        # include show_all=true so relevance filter does not hide results
        resp2 = authenticated_client.get(
            url, {"search": draft1.entry.term.text, "show_all": "true"}
        )
        assert resp2.status_code == status.HTTP_200_OK
        ids2 = [v["id"] for v in resp2.data["results"]]
        assert draft1.id in ids2

    def test_approve_draft(self, authenticated_client):
        """Test approving a draft"""
        # Create a draft authored by a different user so the test user can approve it
        other_user = UserFactory()
        draft = EntryDraftFactory(author=other_user)
        url = reverse("entrydraft-approve", kwargs={"pk": draft.id})

        # Add show_all=true to bypass filtering
        response = authenticated_client.post(url + "?show_all=true")

        assert response.status_code == status.HTTP_200_OK
        draft.refresh_from_db()
        assert draft.approvers.filter(pk=authenticated_client.user.pk).exists()

    def test_author_cannot_approve_own_draft(self, authenticated_client):
        """Test that authors cannot approve their own drafts"""
        draft = EntryDraftFactory(author=authenticated_client.user)
        url = reverse("entrydraft-approve", kwargs={"pk": draft.id})
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "cannot approve their own" in response.data["detail"]

    def test_delete_draft_by_author(self, authenticated_client):
        """Test deleting a draft by its author"""
        entry = EntryFactory()
        draft = EntryDraftFactory(
            entry=entry, author=authenticated_client.user, is_published=False
        )

        url = reverse("entrydraft-detail", kwargs={"pk": draft.id})
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not EntryDraft.objects.filter(id=draft.id).exists()

    def test_delete_draft_by_non_author_fails(self, authenticated_client):
        """Test deleting a draft by non-author fails"""
        other_user = UserFactory()
        entry = EntryFactory()
        draft = EntryDraftFactory(entry=entry, author=other_user, is_published=False)

        url = reverse("entrydraft-detail", kwargs={"pk": draft.id})
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "You can only delete your own drafts" in response.data["detail"]
        assert EntryDraft.objects.filter(id=draft.id).exists()

    def test_delete_published_draft_by_author(self, authenticated_client):
        """Test deleting a published draft by its author"""
        entry = EntryFactory()
        draft = EntryDraftFactory(
            entry=entry, author=authenticated_client.user, is_published=True
        )

        url = reverse("entrydraft-detail", kwargs={"pk": draft.id})
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not EntryDraft.objects.filter(id=draft.id).exists()

    def test_delete_nonexistent_draft(self, authenticated_client):
        """Test deleting a nonexistent draft returns 404"""
        url = reverse("entrydraft-detail", kwargs={"pk": 99999})
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_draft_with_approvals(self, authenticated_client):
        """Test deleting a draft that has approvals"""
        approver = UserFactory()
        entry = EntryFactory()
        draft = EntryDraftFactory(
            entry=entry, author=authenticated_client.user, is_published=False
        )
        draft.approvers.add(approver)

        url = reverse("entrydraft-detail", kwargs={"pk": draft.id})
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not EntryDraft.objects.filter(id=draft.id).exists()

    def test_delete_draft_with_requested_reviewers(self, authenticated_client):
        """Test deleting a draft that has requested reviewers"""
        reviewer = UserFactory()
        entry = EntryFactory()
        draft = EntryDraftFactory(
            entry=entry, author=authenticated_client.user, is_published=False
        )
        draft.requested_reviewers.add(reviewer)

        url = reverse("entrydraft-detail", kwargs={"pk": draft.id})
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not EntryDraft.objects.filter(id=draft.id).exists()

    def test_delete_draft_with_comments(self, authenticated_client):
        """Test deleting a draft that has comments"""
        entry = EntryFactory()
        draft = EntryDraftFactory(
            entry=entry, author=authenticated_client.user, is_published=False
        )
        CommentFactory(content_object=draft, author=authenticated_client.user)

        url = reverse("entrydraft-detail", kwargs={"pk": draft.id})
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not EntryDraft.objects.filter(id=draft.id).exists()

    def test_delete_draft_unauthenticated_fails(self, api_client):
        """Test deleting a draft without authentication fails"""
        entry = EntryFactory()
        draft = EntryDraftFactory(entry=entry, is_published=False)

        url = reverse("entrydraft-detail", kwargs={"pk": draft.id})
        response = api_client.delete(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert EntryDraft.objects.filter(id=draft.id).exists()


@pytest.mark.django_db
class TestCommentViewSet:
    """Test Comment API endpoints"""

    def test_create_comment(self, authenticated_client):
        """Test creating a comment"""
        entry = EntryFactory()
        content_type = ContentType.objects.get_for_model(Entry)

        url = reverse("comment-list")
        data = {
            "content_type": content_type.id,
            "object_id": entry.id,
            "text": "Test comment",
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert Comment.objects.filter(text="Test comment").exists()

    def test_resolve_comment(self, authenticated_client):
        """Test resolving a comment"""
        comment = Comment.objects.create(
            text="Test",
            author=authenticated_client.user,
            content_type=ContentType.objects.get_for_model(Entry),
            object_id=EntryFactory().id,
            created_by=authenticated_client.user,
        )

        url = reverse("comment-resolve", kwargs={"pk": comment.id})
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        comment.refresh_from_db()
        assert comment.is_resolved is True


@pytest.mark.django_db
class TestPerspectiveCuratorViewSet:
    """Test PerspectiveCurator API endpoints"""

    def test_create_perspective_curator_as_staff(self, staff_client):
        """Test creating perspective curator as staff"""
        user = UserFactory()
        perspective = PerspectiveFactory()

        url = reverse("perspectivecurator-list")
        data = {"user_id": user.id, "perspective_id": perspective.id}
        response = staff_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert PerspectiveCurator.objects.filter(
            user=user, perspective=perspective
        ).exists()

    def test_create_perspective_curator_as_regular_user_fails(
        self, authenticated_client
    ):
        """Test creating perspective curator as regular user fails"""
        user = UserFactory()
        perspective = PerspectiveFactory()

        url = reverse("perspectivecurator-list")
        data = {"user_id": user.id, "perspective_id": perspective.id}
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestSystemConfig:
    """Test system-config endpoint"""

    def test_system_config_returns_min_approvals(self, authenticated_client):
        url = reverse("system-config")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "MIN_APPROVALS" in response.data


@pytest.mark.django_db
class TestEntryDraftUpdateWorkflow:
    """Test EntryDraft update workflow and approval clearing"""

    def test_update_unpublished_draft_by_author(self, authenticated_client):
        """Test updating an unpublished draft by its author"""
        entry = EntryFactory()
        draft = EntryDraftFactory(
            entry=entry, author=authenticated_client.user, is_published=False
        )

        url = reverse("entrydraft-detail", kwargs={"pk": draft.id})
        data = {"content": "Updated content"}
        response = authenticated_client.patch(url, data)

        assert response.status_code == status.HTTP_200_OK
        draft.refresh_from_db()
        assert draft.content == "Updated content"

    def test_update_unpublished_draft_by_other_user_fails(self, authenticated_client):
        """Test updating an unpublished draft by non-author fails"""
        other_user = UserFactory()
        entry = EntryFactory()
        draft = EntryDraftFactory(entry=entry, author=other_user, is_published=False)

        url = reverse("entrydraft-detail", kwargs={"pk": draft.id})
        data = {"content": "Updated content"}
        response = authenticated_client.patch(url, data)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_update_published_draft_fails(self, authenticated_client):
        """Test updating a published draft fails"""
        entry = EntryFactory()
        draft = EntryDraftFactory(
            entry=entry, author=authenticated_client.user, is_published=True
        )

        url = reverse("entrydraft-detail", kwargs={"pk": draft.id})
        data = {"content": "Updated content"}
        response = authenticated_client.patch(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Cannot update published drafts" in response.data["detail"]

    def test_content_update_clears_approvals(self, authenticated_client):
        """Test that updating content clears existing approvals"""
        other_user = UserFactory()
        entry = EntryFactory()
        draft = EntryDraftFactory(
            entry=entry, author=authenticated_client.user, is_published=False
        )

        # Add an approval
        draft.approvers.add(other_user)
        assert draft.approvers.count() == 1

        # Update content
        url = reverse("entrydraft-detail", kwargs={"pk": draft.id})
        data = {"content": "Updated content"}
        response = authenticated_client.patch(url, data)

        assert response.status_code == status.HTTP_200_OK
        draft.refresh_from_db()
        assert draft.approvers.count() == 0

    def test_request_review_workflow(self, authenticated_client):
        """Test requesting specific reviewers for a draft"""
        reviewer1 = UserFactory()
        reviewer2 = UserFactory()
        entry = EntryFactory()
        draft = EntryDraftFactory(
            entry=entry, author=authenticated_client.user, is_published=False
        )

        url = reverse("entrydraft-request-review", kwargs={"pk": draft.id})
        data = {"reviewer_ids": [reviewer1.id, reviewer2.id]}
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK

        # Get fresh draft from database
        from glossary.models import EntryDraft

        draft = EntryDraft.objects.get(pk=draft.id)
        requested_reviewers = list(draft.requested_reviewers.all())

        assert len(requested_reviewers) == 2
        assert reviewer1 in requested_reviewers
        assert reviewer2 in requested_reviewers

    def test_request_review_by_non_author_succeeds(self, authenticated_client):
        """Test requesting review by non-author succeeds (anyone can request reviews)"""
        other_user = UserFactory()
        reviewer = UserFactory()
        entry = EntryFactory()
        draft = EntryDraftFactory(entry=entry, author=other_user, is_published=False)

        url = reverse("entrydraft-request-review", kwargs={"pk": draft.id})
        data = {"reviewer_ids": [reviewer.id]}
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert reviewer in draft.requested_reviewers.all()

    def test_request_review_for_published_draft_fails(self, authenticated_client):
        """Test requesting review for published draft fails"""
        reviewer = UserFactory()
        entry = EntryFactory()
        draft = EntryDraftFactory(
            entry=entry, author=authenticated_client.user, is_published=True
        )

        url = reverse("entrydraft-request-review", kwargs={"pk": draft.id})
        data = {"reviewer_ids": [reviewer.id]}
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_publish_approved_draft(self, authenticated_client):
        """Test publishing an approved draft"""
        approver1 = UserFactory()
        approver2 = UserFactory()
        entry = EntryFactory()
        draft = EntryDraftFactory(
            entry=entry, author=authenticated_client.user, is_published=False
        )

        # Add approvals (assuming MIN_APPROVALS = 2)
        draft.approvers.add(approver1, approver2)

        url = reverse("entrydraft-publish", kwargs={"pk": draft.id})
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        draft.refresh_from_db()
        entry.refresh_from_db()
        assert draft.is_published is True

    def test_publish_unapproved_draft_fails(self, authenticated_client):
        """Test publishing an unapproved draft fails"""
        entry = EntryFactory()
        draft = EntryDraftFactory(
            entry=entry, author=authenticated_client.user, is_published=False
        )

        url = reverse("entrydraft-publish", kwargs={"pk": draft.id})
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Draft must be approved" in response.data["detail"]

    def test_publish_already_published_draft_fails(self, authenticated_client):
        """Test publishing an already published draft fails"""
        approver1 = UserFactory()
        approver2 = UserFactory()
        entry = EntryFactory()
        draft = EntryDraftFactory(
            entry=entry, author=authenticated_client.user, is_published=True
        )
        # Add approvals to make it approved
        draft.approvers.add(approver1, approver2)

        url = reverse("entrydraft-publish", kwargs={"pk": draft.id})
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Draft is already published" in response.data["detail"]

    def test_edit_workflow_with_existing_unpublished_draft(self, authenticated_client):
        """Test that editing with existing unpublished draft creates new draft (linear history)"""
        entry = EntryFactory()

        # Create first unpublished draft
        draft1 = EntryDraftFactory(
            entry=entry,
            author=authenticated_client.user,
            is_published=False,
            content="Original content",
        )

        # Try to create another draft - should succeed (linear draft history)
        url = reverse("entrydraft-list")
        data = {
            "entry": entry.id,
            "content": "New content",
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        new_draft_id = response.data["id"]
        new_draft = EntryDraft.objects.get(id=new_draft_id)

        # New draft should replace the original draft
        assert new_draft.replaces_draft == draft1
        assert new_draft.content == "New content"

    def test_draft_history_endpoint(self, authenticated_client):
        """Test the draft history endpoint"""
        entry = EntryFactory()

        # Create multiple drafts
        draft1 = EntryDraftFactory(
            entry=entry, author=authenticated_client.user, content="First draft"
        )
        draft2 = EntryDraftFactory(
            entry=entry,
            author=authenticated_client.user,
            content="Second draft",
            replaces_draft=draft1,
        )
        draft3 = EntryDraftFactory(
            entry=entry,
            author=authenticated_client.user,
            content="Third draft",
            replaces_draft=draft2,
        )

        url = reverse("entrydraft-history")
        response = authenticated_client.get(url, {"entry": entry.id})

        assert response.status_code == status.HTTP_200_OK
        drafts = response.data

        # Should return drafts in reverse chronological order (newest first)
        assert len(drafts) == 3
        assert drafts[0]["id"] == draft3.id
        assert drafts[1]["id"] == draft2.id
        assert drafts[2]["id"] == draft1.id

        # Check that replaces_draft field is included
        assert drafts[0]["replaces_draft"] == draft2.id
        assert drafts[1]["replaces_draft"] == draft1.id
        assert drafts[2]["replaces_draft"] is None

    def test_draft_history_endpoint_missing_entry(self, authenticated_client):
        """Test the draft history endpoint with missing entry parameter"""
        url = reverse("entrydraft-history")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "entry parameter is required" in response.data["detail"]

    def test_comments_with_draft_positions_endpoint(self, authenticated_client):
        """Test the comments with draft positions endpoint"""
        entry = EntryFactory()

        # Create drafts
        published_draft = EntryDraftFactory(
            entry=entry, author=authenticated_client.user, is_published=True
        )
        current_draft = EntryDraftFactory(
            entry=entry,
            author=authenticated_client.user,
            replaces_draft=published_draft,
        )

        # Create comments on different drafts
        comment1 = CommentFactory(
            content_object=published_draft, author=authenticated_client.user
        )
        comment2 = CommentFactory(
            content_object=current_draft, author=authenticated_client.user
        )

        url = reverse("comment-with-draft-positions")
        response = authenticated_client.get(url, {"entry": entry.id})

        assert response.status_code == status.HTTP_200_OK
        comments = response.data

        # Should return comments with draft position information
        assert len(comments) >= 2

        # Find our comments
        comment1_data = next(c for c in comments if c["id"] == comment1.id)
        comment2_data = next(c for c in comments if c["id"] == comment2.id)

        assert comment1_data["draft_position"] == "published"
        assert comment2_data["draft_position"] == "current draft"
        assert comment1_data["draft_id"] == published_draft.id
        assert comment2_data["draft_id"] == current_draft.id

    def test_comments_with_draft_positions_missing_entry(self, authenticated_client):
        """Test the comments with draft positions endpoint with missing entry parameter"""
        url = reverse("comment-with-draft-positions")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "entry parameter is required" in response.data["detail"]

    def test_edit_workflow_after_publishing(self, authenticated_client):
        """Test that editing after publishing creates new draft"""
        approver1 = UserFactory()
        approver2 = UserFactory()
        entry = EntryFactory()

        # Create and publish first draft
        draft1 = EntryDraftFactory(
            entry=entry, author=authenticated_client.user, is_published=False
        )
        draft1.approvers.add(approver1, approver2)
        # Use the API to publish instead of direct method call
        url = reverse("entrydraft-publish", kwargs={"pk": draft1.id})
        publish_response = authenticated_client.post(url)
        assert publish_response.status_code == status.HTTP_200_OK

        # Now should be able to create new draft
        url = reverse("entrydraft-list")
        data = {
            "entry": entry.id,
            "content": "New content after publishing",
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert (
            EntryDraft.objects.filter(
                entry=entry, author=authenticated_client.user
            ).count()
            == 2
        )


@pytest.mark.django_db
class TestEntryDraftEligibilityFiltering:
    """Test EntryDraft eligibility filtering logic"""

    def test_requested_or_approved_with_show_all_false(self, authenticated_client):
        """Test eligibility=requested_or_approved with show_all=false shows only relevant drafts"""
        other_user = UserFactory()
        UserFactory()  # reviewer

        # Create drafts with different relationships to the authenticated user
        draft1 = EntryDraftFactory(author=other_user, is_published=False)  # Not related
        draft2 = EntryDraftFactory(
            author=other_user, is_published=False
        )  # User is requested reviewer
        draft3 = EntryDraftFactory(
            author=other_user, is_published=False
        )  # User has already approved
        draft4 = EntryDraftFactory(
            author=authenticated_client.user, is_published=False
        )  # User's own draft

        # Set up relationships
        draft2.requested_reviewers.add(authenticated_client.user)
        draft3.approvers.add(authenticated_client.user)

        url = reverse("entrydraft-list")
        response = authenticated_client.get(
            url, {"eligibility": "requested_or_approved", "show_all": "false"}
        )

        assert response.status_code == status.HTTP_200_OK
        result_ids = [d["id"] for d in response.data["results"]]

        # Should include drafts where user is requested reviewer OR has approved
        assert draft2.id in result_ids  # User is requested reviewer
        assert draft3.id in result_ids  # User has already approved
        assert draft1.id not in result_ids  # Not related to user
        assert (
            draft4.id not in result_ids
        )  # User's own draft (not in requested_or_approved)

    def test_requested_or_approved_with_show_all_true(self, authenticated_client):
        """Test eligibility=requested_or_approved with show_all=true shows all unpublished drafts"""
        other_user = UserFactory()

        # Create drafts
        draft1 = EntryDraftFactory(author=other_user, is_published=False)
        draft2 = EntryDraftFactory(author=other_user, is_published=False)
        draft3 = EntryDraftFactory(
            author=other_user, is_published=True
        )  # Published - should be excluded

        url = reverse("entrydraft-list")
        response = authenticated_client.get(
            url, {"eligibility": "requested_or_approved", "show_all": "true"}
        )

        assert response.status_code == status.HTTP_200_OK
        result_ids = [d["id"] for d in response.data["results"]]

        # Should include all unpublished drafts regardless of relationship
        assert draft1.id in result_ids
        assert draft2.id in result_ids
        assert draft3.id not in result_ids  # Published drafts excluded

    def test_can_approve_eligibility(self, authenticated_client):
        """Test eligibility=can_approve shows only drafts user can approve"""
        other_user = UserFactory()

        # Create drafts with different approval states
        draft1 = EntryDraftFactory(author=other_user, is_published=False)  # Can approve
        draft2 = EntryDraftFactory(
            author=authenticated_client.user, is_published=False
        )  # Own draft
        draft3 = EntryDraftFactory(
            author=other_user, is_published=False
        )  # Already approved by user
        draft4 = EntryDraftFactory(
            author=other_user, is_published=False
        )  # Already fully approved

        # Set up relationships
        draft3.approvers.add(authenticated_client.user)
        # Add enough approvers to make draft4 fully approved
        approver1 = UserFactory()
        approver2 = UserFactory()
        draft4.approvers.add(approver1, approver2)

        url = reverse("entrydraft-list")
        response = authenticated_client.get(
            url,
            {
                "eligibility": "can_approve",
                "show_all": "true",  # Use show_all=true to bypass default filtering
            },
        )

        assert response.status_code == status.HTTP_200_OK
        result_ids = [d["id"] for d in response.data["results"]]

        # Should only include draft1 (can approve)
        assert draft1.id in result_ids
        assert draft2.id not in result_ids  # Own draft
        assert draft3.id not in result_ids  # Already approved by user
        assert draft4.id not in result_ids  # Already fully approved

    def test_own_eligibility(self, authenticated_client):
        """Test eligibility=own shows only user's own drafts"""
        other_user = UserFactory()

        # Create drafts
        draft1 = EntryDraftFactory(author=authenticated_client.user, is_published=False)
        draft2 = EntryDraftFactory(author=other_user, is_published=False)
        draft3 = EntryDraftFactory(
            author=authenticated_client.user, is_published=False
        )  # Changed to unpublished

        url = reverse("entrydraft-list")
        response = authenticated_client.get(
            url, {"eligibility": "own", "show_all": "true"}
        )

        assert response.status_code == status.HTTP_200_OK
        result_ids = [d["id"] for d in response.data["results"]]

        # Should only include user's own drafts
        assert draft1.id in result_ids
        assert draft2.id not in result_ids
        assert draft3.id in result_ids

    def test_already_approved_eligibility(self, authenticated_client):
        """Test eligibility=already_approved shows only drafts user has approved"""
        other_user = UserFactory()

        # Create drafts
        draft1 = EntryDraftFactory(author=other_user, is_published=False)
        draft2 = EntryDraftFactory(author=other_user, is_published=False)
        draft3 = EntryDraftFactory(author=authenticated_client.user, is_published=False)

        # Set up relationships
        draft1.approvers.add(authenticated_client.user)

        url = reverse("entrydraft-list")
        response = authenticated_client.get(
            url, {"eligibility": "already_approved", "show_all": "true"}
        )

        assert response.status_code == status.HTTP_200_OK
        result_ids = [d["id"] for d in response.data["results"]]

        # Should only include drafts user has approved
        assert draft1.id in result_ids
        assert draft2.id not in result_ids
        assert draft3.id not in result_ids

    def test_eligibility_without_show_all_parameter(self, authenticated_client):
        """Test that eligibility parameter works without show_all parameter"""
        other_user = UserFactory()

        # Create drafts
        draft1 = EntryDraftFactory(author=other_user, is_published=False)
        draft2 = EntryDraftFactory(author=authenticated_client.user, is_published=False)

        # Set up relationship
        draft1.requested_reviewers.add(authenticated_client.user)

        url = reverse("entrydraft-list")
        response = authenticated_client.get(
            url,
            {
                "eligibility": "requested_or_approved"
                # No show_all parameter - should default to false
            },
        )

        assert response.status_code == status.HTTP_200_OK
        result_ids = [d["id"] for d in response.data["results"]]

        # Should include draft1 (user is requested reviewer) but not draft2 (own draft)
        assert draft1.id in result_ids
        assert draft2.id not in result_ids

    def test_no_eligibility_with_show_all_false(self, authenticated_client):
        """Test default filtering when no eligibility parameter is provided"""
        other_user = UserFactory()

        # Create drafts with different relationships
        draft1 = EntryDraftFactory(
            author=authenticated_client.user, is_published=False
        )  # Own draft
        draft2 = EntryDraftFactory(author=other_user, is_published=False)  # Not related
        draft3 = EntryDraftFactory(
            author=other_user, is_published=False
        )  # User is requested reviewer
        draft4 = EntryDraftFactory(
            author=other_user, is_published=False
        )  # Related term

        # Set up relationships
        draft3.requested_reviewers.add(authenticated_client.user)
        # Make draft4 related by having user author a draft for the same term
        EntryDraftFactory(
            entry=draft4.entry, author=authenticated_client.user, is_published=False
        )

        url = reverse("entrydraft-list")
        response = authenticated_client.get(
            url,
            {
                "show_all": "false"
                # No eligibility parameter
            },
        )

        assert response.status_code == status.HTTP_200_OK
        result_ids = [d["id"] for d in response.data["results"]]

        # Should include drafts user authored, was requested to review, or for related terms
        assert draft1.id in result_ids  # Own draft
        assert draft2.id not in result_ids  # Not related
        assert draft3.id in result_ids  # Requested reviewer
        assert draft4.id in result_ids  # Related term


@pytest.mark.django_db
class TestEntryLookupOrCreate:
    """Test the lookup_or_create_entry endpoint"""

    def test_lookup_existing_entry_with_term_id(self, authenticated_client):
        """Test looking up existing entry with term_id"""
        term = TermFactory()
        perspective = PerspectiveFactory()
        entry = EntryFactory(term=term, perspective=perspective)

        url = reverse("entry-lookup-or-create-entry")
        data = {"term_id": term.id, "perspective_id": perspective.id}

        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["entry_id"] == entry.id
        assert response.data["is_new"] is False
        assert response.data["term"]["id"] == term.id
        assert response.data["perspective"]["id"] == perspective.id
        assert response.data["entry"] is not None

    def test_lookup_existing_entry_with_term_text(self, authenticated_client):
        """Test looking up existing entry with term_text"""
        term = TermFactory()
        perspective = PerspectiveFactory()
        entry = EntryFactory(term=term, perspective=perspective)

        url = reverse("entry-lookup-or-create-entry")
        data = {"term_text": term.text, "perspective_id": perspective.id}

        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["entry_id"] == entry.id
        assert response.data["is_new"] is False
        assert response.data["term"]["id"] == term.id
        assert response.data["perspective"]["id"] == perspective.id
        assert response.data["entry"] is not None

    def test_create_new_entry_with_existing_term(self, authenticated_client):
        """Test creating new entry with existing term"""
        term = TermFactory()
        perspective = PerspectiveFactory()

        url = reverse("entry-lookup-or-create-entry")
        data = {"term_id": term.id, "perspective_id": perspective.id}

        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["entry_id"] is not None
        assert response.data["is_new"] is True
        assert response.data["term"]["id"] == term.id
        assert response.data["perspective"]["id"] == perspective.id
        assert response.data["entry"] is None

    def test_create_new_entry_with_new_term(self, authenticated_client):
        """Test creating new entry with new term"""
        perspective = PerspectiveFactory()
        term_text = "New Term"

        url = reverse("entry-lookup-or-create-entry")
        data = {"term_text": term_text, "perspective_id": perspective.id}

        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["entry_id"] is not None
        assert response.data["is_new"] is True
        assert response.data["term"]["text"] == term_text
        assert response.data["perspective"]["id"] == perspective.id
        assert response.data["entry"] is None

    def test_entry_with_published_draft(self, authenticated_client):
        """Test entry with published draft"""
        term = TermFactory()
        perspective = PerspectiveFactory()
        entry = EntryFactory(term=term, perspective=perspective)
        EntryDraftFactory(entry=entry, is_published=True)

        url = reverse("entry-lookup-or-create-entry")
        data = {"term_id": term.id, "perspective_id": perspective.id}

        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["has_published_draft"] is True
        assert response.data["has_unpublished_draft"] is False
        assert response.data["unpublished_draft_author_id"] is None

    def test_entry_with_unpublished_draft(self, authenticated_client):
        """Test entry with unpublished draft"""
        term = TermFactory()
        perspective = PerspectiveFactory()
        entry = EntryFactory(term=term, perspective=perspective)
        EntryDraftFactory(
            entry=entry, is_published=False, author=authenticated_client.user
        )

        url = reverse("entry-lookup-or-create-entry")
        data = {"term_id": term.id, "perspective_id": perspective.id}

        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["has_published_draft"] is False
        assert response.data["has_unpublished_draft"] is True
        assert (
            response.data["unpublished_draft_author_id"] == authenticated_client.user.id
        )

    def test_missing_perspective_id(self, authenticated_client):
        """Test error when perspective_id is missing"""
        url = reverse("entry-lookup-or-create-entry")
        data = {"term_text": "Test Term"}

        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "perspective_id is required" in response.data["detail"]

    def test_missing_term_id_and_text(self, authenticated_client):
        """Test error when both term_id and term_text are missing"""
        perspective = PerspectiveFactory()

        url = reverse("entry-lookup-or-create-entry")
        data = {"perspective_id": perspective.id}

        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Either term_id or term_text is required" in response.data["detail"]

    def test_term_not_found(self, authenticated_client):
        """Test error when term_id references non-existent term"""
        perspective = PerspectiveFactory()

        url = reverse("entry-lookup-or-create-entry")
        data = {"term_id": 99999, "perspective_id": perspective.id}

        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Term not found" in response.data["detail"]

    def test_perspective_not_found(self, authenticated_client):
        """Test error when perspective_id references non-existent perspective"""
        term = TermFactory()

        url = reverse("entry-lookup-or-create-entry")
        data = {"term_id": term.id, "perspective_id": 99999}

        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Perspective not found" in response.data["detail"]

    def test_concurrent_entry_creation_race_condition(self, authenticated_client):
        """Test handling of concurrent entry creation attempts"""
        term = TermFactory()
        perspective = PerspectiveFactory()

        # Simulate concurrent creation by creating entry before lookup
        entry = EntryFactory(term=term, perspective=perspective)

        url = reverse("entry-lookup-or-create-entry")
        data = {"term_id": term.id, "perspective_id": perspective.id}

        response = authenticated_client.post(url, data)

        # Should find existing entry, not create duplicate
        assert response.status_code == status.HTTP_200_OK
        assert response.data["entry_id"] == entry.id
        assert response.data["is_new"] is False

    def test_lookup_with_deleted_term(self, authenticated_client):
        """Test lookup when term exists but is soft-deleted"""
        term = TermFactory()
        perspective = PerspectiveFactory()
        term.delete()  # Soft delete the term

        url = reverse("entry-lookup-or-create-entry")
        data = {"term_id": term.id, "perspective_id": perspective.id}

        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Term not found" in response.data["detail"]

    def test_lookup_with_deleted_perspective(self, authenticated_client):
        """Test lookup when perspective exists but is soft-deleted"""
        term = TermFactory()
        perspective = PerspectiveFactory()
        perspective.delete()  # Soft delete the perspective

        url = reverse("entry-lookup-or-create-entry")
        data = {"term_id": term.id, "perspective_id": perspective.id}

        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Perspective not found" in response.data["detail"]

    def test_lookup_with_deleted_entry(self, authenticated_client):
        """Test lookup when entry exists but is soft-deleted"""
        term = TermFactory()
        perspective = PerspectiveFactory()
        entry = EntryFactory(term=term, perspective=perspective)
        entry.delete()  # Soft delete the entry

        url = reverse("entry-lookup-or-create-entry")
        data = {"term_id": term.id, "perspective_id": perspective.id}

        response = authenticated_client.post(url, data)

        # Should create new entry since old one is deleted
        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_new"] is True
        assert response.data["entry_id"] != entry.id

    def test_create_entry_with_invalid_term_text(self, authenticated_client):
        """Test creation with empty or invalid term text"""
        perspective = PerspectiveFactory()

        url = reverse("entry-lookup-or-create-entry")
        data = {"term_text": "", "perspective_id": perspective.id}  # Empty term text

        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Either term_id or term_text is required" in response.data["detail"]

    def test_create_entry_with_very_long_term_text(self, authenticated_client):
        """Test creation with term text exceeding reasonable limits"""
        perspective = PerspectiveFactory()
        very_long_text = "x" * 1000  # Very long term text (exceeds 255 char limit)

        url = reverse("entry-lookup-or-create-entry")
        data = {"term_text": very_long_text, "perspective_id": perspective.id}

        response = authenticated_client.post(url, data)

        # Should return 400 Bad Request with proper validation message
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Term text cannot exceed 255 characters" in response.data["detail"]

    def test_create_entry_with_maximum_length_term_text(self, authenticated_client):
        """Test creation with term text at the maximum allowed length (255 chars)"""
        perspective = PerspectiveFactory()
        max_length_text = "x" * 255  # Exactly 255 characters

        url = reverse("entry-lookup-or-create-entry")
        data = {"term_text": max_length_text, "perspective_id": perspective.id}

        response = authenticated_client.post(url, data)

        # Should succeed with maximum length text
        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_new"] is True
        assert response.data["term"]["text"] == max_length_text


@pytest.mark.django_db
class TestEntryTermTextFiltering:
    """Test term_text filtering functionality"""

    def test_filter_entries_by_term_text_exact_match(self, authenticated_client):
        """Test filtering entries by exact term text"""
        term1 = TermFactory(text="Exact Term")
        term2 = TermFactory(text="Other Term")
        perspective = PerspectiveFactory()

        entry1 = EntryFactory(term=term1, perspective=perspective)
        entry2 = EntryFactory(term=term2, perspective=perspective)

        # Create published drafts so entries appear in results
        EntryDraftFactory(entry=entry1, is_published=True)
        EntryDraftFactory(entry=entry2, is_published=True)

        url = reverse("entry-list")
        response = authenticated_client.get(url, {"term_text": "Exact Term"})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["id"] == entry1.id

    def test_filter_entries_by_term_text_no_match(self, authenticated_client):
        """Test filtering entries by term text with no matches"""
        perspective = PerspectiveFactory()

        url = reverse("entry-list")
        response = authenticated_client.get(
            url, {"term_text": "Nonexistent Term", "perspective": perspective.id}
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 0

    def test_filter_entries_by_term_text_case_insensitive(self, authenticated_client):
        """Test that term_text filtering is case-insensitive"""
        term = TermFactory(text="Case Sensitive Term")
        perspective = PerspectiveFactory()
        entry = EntryFactory(term=term, perspective=perspective)

        # Create published draft so entry appears in results
        EntryDraftFactory(entry=entry, is_published=True)

        url = reverse("entry-list")

        # Test different case variations
        test_cases = [
            "case sensitive term",
            "CASE SENSITIVE TERM",
            "Case Sensitive Term",
            "cAsE sEnSiTiVe TeRm",
        ]

        for test_case in test_cases:
            response = authenticated_client.get(url, {"term_text": test_case})
            assert response.status_code == status.HTTP_200_OK
            assert response.data["count"] == 1
            assert response.data["results"][0]["id"] == entry.id

    def test_filter_entries_by_term_text_with_special_characters(
        self, authenticated_client
    ):
        """Test filtering entries by term text with special characters"""
        term = TermFactory(text="Café & Résumé")
        perspective = PerspectiveFactory()
        entry = EntryFactory(term=term, perspective=perspective)

        # Create published draft so entry appears in results
        EntryDraftFactory(entry=entry, is_published=True)

        url = reverse("entry-list")
        response = authenticated_client.get(url, {"term_text": "Café & Résumé"})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["id"] == entry.id

    def test_filter_entries_by_term_text_combined_with_perspective(
        self, authenticated_client
    ):
        """Test filtering entries by term_text combined with perspective filter"""
        term1 = TermFactory(text="Same Term One")
        term2 = TermFactory(text="Same Term Two")
        perspective1 = PerspectiveFactory()
        perspective2 = PerspectiveFactory()

        entry1 = EntryFactory(term=term1, perspective=perspective1)
        entry2 = EntryFactory(term=term2, perspective=perspective2)

        # Create published drafts so entries appear in results
        EntryDraftFactory(entry=entry1, is_published=True)
        EntryDraftFactory(entry=entry2, is_published=True)

        url = reverse("entry-list")
        response = authenticated_client.get(
            url, {"term_text": "Same Term One", "perspective": perspective1.id}
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["id"] == entry1.id

    def test_filter_entries_by_term_text_partial_match_not_supported(
        self, authenticated_client
    ):
        """Test that term_text only matches exact text, not partial"""
        term = TermFactory(text="Complete Term Name")
        perspective = PerspectiveFactory()
        entry = EntryFactory(term=term, perspective=perspective)
        EntryDraftFactory(entry=entry, is_published=True)

        url = reverse("entry-list")

        # Partial match should return nothing (use search parameter for partial matching)
        response = authenticated_client.get(url, {"term_text": "Complete"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 0

        # Exact match should work
        response = authenticated_client.get(url, {"term_text": "Complete Term Name"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_filter_entries_term_text_vs_search_parameter(self, authenticated_client):
        """Test that term_text (exact) and search (partial) work differently"""
        term1 = TermFactory(text="API Gateway")
        term2 = TermFactory(text="API")
        perspective = PerspectiveFactory()

        entry1 = EntryFactory(term=term1, perspective=perspective)
        entry2 = EntryFactory(term=term2, perspective=perspective)

        EntryDraftFactory(entry=entry1, is_published=True)
        EntryDraftFactory(entry=entry2, is_published=True)

        url = reverse("entry-list")

        # search parameter should find both (partial match)
        response = authenticated_client.get(url, {"search": "API"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2

        # term_text should find only exact match
        response = authenticated_client.get(url, {"term_text": "API"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["term"]["text"] == "API"

    def test_filter_entries_by_term_text_unicode_normalized(self, authenticated_client):
        """Test that term_text handles unicode normalization properly"""
        # Create term with accented characters
        term = TermFactory(text="Café")
        perspective = PerspectiveFactory()
        entry = EntryFactory(term=term, perspective=perspective)
        EntryDraftFactory(entry=entry, is_published=True)

        url = reverse("entry-list")

        # Search with normalized version (no accents)
        response = authenticated_client.get(url, {"term_text": "cafe"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

        # Search with accented version
        response = authenticated_client.get(url, {"term_text": "Café"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
