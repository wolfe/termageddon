import pytest
from django.contrib.contenttypes.models import ContentType
from django.urls import reverse
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from glossary.models import (
    Comment,
    Domain,
    DomainExpert,
    Entry,
    EntryVersion,
    Term,
)
from glossary.tests.conftest import (
    DomainExpertFactory,
    DomainFactory,
    EntryFactory,
    EntryVersionFactory,
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
        assert "domain_expert_for" in response.data


@pytest.mark.django_db
class TestDomainViewSet:
    """Test Domain API endpoints"""

    def test_list_domains(self, authenticated_client):
        """Test listing domains"""
        DomainFactory.create_batch(3)
        url = reverse("domain-list")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 3

    def test_create_domain_as_staff(self, staff_client):
        """Test creating domain as staff"""
        url = reverse("domain-list")
        data = {"name": "Finance", "description": "Financial terms"}
        response = staff_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert Domain.objects.filter(name="Finance").exists()

    def test_create_domain_as_regular_user_fails(self, authenticated_client):
        """Test creating domain as regular user fails"""
        url = reverse("domain-list")
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
            version = EntryVersionFactory(entry=entry, is_published=True)
            entry.active_version = version
            entry.save()
            
        url = reverse("entry-list")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 3

    def test_filter_entries_by_domain(self, authenticated_client):
        """Test filtering entries by domain"""
        domain1 = DomainFactory()
        domain2 = DomainFactory()
        entry1 = EntryFactory(domain=domain1)
        entry2 = EntryFactory(domain=domain2)
        
        # Create published versions
        version1 = EntryVersionFactory(entry=entry1, is_published=True)
        version2 = EntryVersionFactory(entry=entry2, is_published=True)
        entry1.active_version = version1
        entry2.active_version = version2
        entry1.save()
        entry2.save()

        url = reverse("entry-list")
        response = authenticated_client.get(url, {"domain": domain1.id})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["domain"]["id"] == domain1.id

    def test_endorse_as_domain_expert(self, authenticated_client):
        """Test endorsing entry as domain expert"""
        domain = DomainFactory()
        entry = EntryFactory(domain=domain)
        # Create a published version
        version = EntryVersionFactory(entry=entry, is_published=True)
        entry.active_version = version
        entry.save()
        DomainExpertFactory(user=authenticated_client.user, domain=domain)

        url = reverse("entry-endorse", kwargs={"pk": entry.id})
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        version.refresh_from_db()
        assert version.is_endorsed is True
        assert version.endorsed_by == authenticated_client.user

    def test_endorse_as_non_expert_fails(self, authenticated_client):
        """Test endorsing entry without being expert fails"""
        entry = EntryFactory()
        # Create a published version
        version = EntryVersionFactory(entry=entry, is_published=True)
        entry.active_version = version
        entry.save()
        
        url = reverse("entry-endorse", kwargs={"pk": entry.id})
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestEntryVersionViewSet:
    """Test EntryVersion API endpoints"""

    def test_create_entry_version(self, authenticated_client):
        """Test creating an entry version"""
        entry = EntryFactory()
        url = reverse("entryversion-list")
        data = {
            "entry": entry.id,
            "content": "<p>Test definition</p>",
            "author": authenticated_client.user.id,
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert EntryVersion.objects.filter(entry=entry).exists()

    def test_approve_version(self, authenticated_client):
        """Test approving a version"""
        # Create a version authored by a different user so the test user can approve it
        other_user = UserFactory()
        version = EntryVersionFactory(author=other_user)
        url = reverse("entryversion-approve", kwargs={"pk": version.id})

        # Add show_all=true to bypass filtering
        response = authenticated_client.post(url + "?show_all=true")

        assert response.status_code == status.HTTP_200_OK
        version.refresh_from_db()
        assert version.approvers.filter(pk=authenticated_client.user.pk).exists()

    def test_author_cannot_approve_own_version(self, authenticated_client):
        """Test that authors cannot approve their own versions"""
        version = EntryVersionFactory(author=authenticated_client.user)
        url = reverse("entryversion-approve", kwargs={"pk": version.id})
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "cannot approve their own" in response.data["detail"]

    def test_approved_version_becomes_active(self, authenticated_client):
        """Test that version becomes active when approved"""
        entry = EntryFactory()
        version = EntryVersionFactory(entry=entry)

        # Add 2 approvals (MIN_APPROVALS = 2)
        user1 = UserFactory()
        user2 = UserFactory()
        version.approvers.add(user1, user2)

        entry.refresh_from_db()
        assert entry.active_version == version


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
            "author": authenticated_client.user.id,
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
class TestDomainExpertViewSet:
    """Test DomainExpert API endpoints"""

    def test_create_domain_expert_as_staff(self, staff_client):
        """Test creating domain expert as staff"""
        user = UserFactory()
        domain = DomainFactory()

        url = reverse("domainexpert-list")
        data = {"user_id": user.id, "domain_id": domain.id}
        response = staff_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert DomainExpert.objects.filter(user=user, domain=domain).exists()

    def test_create_domain_expert_as_regular_user_fails(self, authenticated_client):
        """Test creating domain expert as regular user fails"""
        user = UserFactory()
        domain = DomainFactory()

        url = reverse("domainexpert-list")
        data = {"user_id": user.id, "domain_id": domain.id}
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestEntryVersionUpdateWorkflow:
    """Test EntryVersion update workflow and approval clearing"""

    def test_update_unpublished_version_by_author(self, authenticated_client):
        """Test updating an unpublished version by its author"""
        entry = EntryFactory()
        version = EntryVersionFactory(
            entry=entry, author=authenticated_client.user, is_published=False
        )

        url = reverse("entryversion-detail", kwargs={"pk": version.id})
        data = {"content": "Updated content"}
        response = authenticated_client.patch(url, data)

        assert response.status_code == status.HTTP_200_OK
        version.refresh_from_db()
        assert version.content == "Updated content"

    def test_update_unpublished_version_by_other_user_fails(self, authenticated_client):
        """Test updating an unpublished version by non-author fails"""
        other_user = UserFactory()
        entry = EntryFactory()
        version = EntryVersionFactory(
            entry=entry, author=other_user, is_published=False
        )

        url = reverse("entryversion-detail", kwargs={"pk": version.id})
        data = {"content": "Updated content"}
        response = authenticated_client.patch(url, data)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_update_published_version_fails(self, authenticated_client):
        """Test updating a published version fails"""
        entry = EntryFactory()
        version = EntryVersionFactory(
            entry=entry, author=authenticated_client.user, is_published=True
        )

        url = reverse("entryversion-detail", kwargs={"pk": version.id})
        data = {"content": "Updated content"}
        response = authenticated_client.patch(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Cannot update published versions" in response.data["detail"]

    def test_content_update_clears_approvals(self, authenticated_client):
        """Test that updating content clears existing approvals"""
        other_user = UserFactory()
        entry = EntryFactory()
        version = EntryVersionFactory(
            entry=entry, author=authenticated_client.user, is_published=False
        )

        # Add an approval
        version.approvers.add(other_user)
        assert version.approvers.count() == 1

        # Update content
        url = reverse("entryversion-detail", kwargs={"pk": version.id})
        data = {"content": "Updated content"}
        response = authenticated_client.patch(url, data)

        assert response.status_code == status.HTTP_200_OK
        version.refresh_from_db()
        assert version.approvers.count() == 0

    def test_request_review_workflow(self, authenticated_client):
        """Test requesting specific reviewers for a version"""
        reviewer1 = UserFactory()
        reviewer2 = UserFactory()
        entry = EntryFactory()
        version = EntryVersionFactory(
            entry=entry, author=authenticated_client.user, is_published=False
        )

        url = reverse("entryversion-request-review", kwargs={"pk": version.id})
        data = {"reviewer_ids": [reviewer1.id, reviewer2.id]}
        response = authenticated_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK

        # Get fresh version from database
        from glossary.models import EntryVersion

        version = EntryVersion.objects.get(pk=version.id)
        requested_reviewers = list(version.requested_reviewers.all())

        assert len(requested_reviewers) == 2
        assert reviewer1 in requested_reviewers
        assert reviewer2 in requested_reviewers

    def test_request_review_by_non_author_fails(self, authenticated_client):
        """Test requesting review by non-author fails"""
        other_user = UserFactory()
        reviewer = UserFactory()
        entry = EntryFactory()
        version = EntryVersionFactory(
            entry=entry, author=other_user, is_published=False
        )

        url = reverse("entryversion-request-review", kwargs={"pk": version.id})
        data = {"reviewer_ids": [reviewer.id]}
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_request_review_for_published_version_fails(self, authenticated_client):
        """Test requesting review for published version fails"""
        reviewer = UserFactory()
        entry = EntryFactory()
        version = EntryVersionFactory(
            entry=entry, author=authenticated_client.user, is_published=True
        )

        url = reverse("entryversion-request-review", kwargs={"pk": version.id})
        data = {"reviewer_ids": [reviewer.id]}
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_publish_approved_version(self, authenticated_client):
        """Test publishing an approved version"""
        approver1 = UserFactory()
        approver2 = UserFactory()
        entry = EntryFactory()
        version = EntryVersionFactory(
            entry=entry, author=authenticated_client.user, is_published=False
        )

        # Add approvals (assuming MIN_APPROVALS = 2)
        version.approvers.add(approver1, approver2)

        url = reverse("entryversion-publish", kwargs={"pk": version.id})
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        version.refresh_from_db()
        entry.refresh_from_db()
        assert version.is_published is True
        assert entry.active_version == version

    def test_publish_unapproved_version_fails(self, authenticated_client):
        """Test publishing an unapproved version fails"""
        entry = EntryFactory()
        version = EntryVersionFactory(
            entry=entry, author=authenticated_client.user, is_published=False
        )

        url = reverse("entryversion-publish", kwargs={"pk": version.id})
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Version must be approved" in response.data["detail"]

    def test_publish_already_published_version_fails(self, authenticated_client):
        """Test publishing an already published version fails"""
        approver1 = UserFactory()
        approver2 = UserFactory()
        entry = EntryFactory()
        version = EntryVersionFactory(
            entry=entry, author=authenticated_client.user, is_published=True
        )
        # Add approvals to make it approved
        version.approvers.add(approver1, approver2)

        url = reverse("entryversion-publish", kwargs={"pk": version.id})
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Version is already published" in response.data["detail"]

    def test_edit_workflow_with_existing_unpublished_version(
        self, authenticated_client
    ):
        """Test that editing creates new version only if no unpublished version exists"""
        entry = EntryFactory()

        # Create first unpublished version
        version1 = EntryVersionFactory(
            entry=entry,
            author=authenticated_client.user,
            is_published=False,
            content="Original content",
        )

        # Try to create another version - should fail
        url = reverse("entryversion-list")
        data = {
            "entry": entry.id,
            "content": "New content",
            "author": authenticated_client.user.id,
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        # The error is in the __all__ field
        assert "unpublished version" in str(response.data["__all__"][0])

    def test_edit_workflow_after_publishing(self, authenticated_client):
        """Test that editing after publishing creates new version"""
        approver1 = UserFactory()
        approver2 = UserFactory()
        entry = EntryFactory()

        # Create and publish first version
        version1 = EntryVersionFactory(
            entry=entry, author=authenticated_client.user, is_published=False
        )
        version1.approvers.add(approver1, approver2)
        # Use the API to publish instead of direct method call
        url = reverse("entryversion-publish", kwargs={"pk": version1.id})
        publish_response = authenticated_client.post(url)
        assert publish_response.status_code == status.HTTP_200_OK

        # Now should be able to create new version
        url = reverse("entryversion-list")
        data = {
            "entry": entry.id,
            "content": "New content after publishing",
            "author": authenticated_client.user.id,
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert (
            EntryVersion.objects.filter(
                entry=entry, author=authenticated_client.user
            ).count()
            == 2
        )
