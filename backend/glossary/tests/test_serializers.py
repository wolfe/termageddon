import pytest
from rest_framework.test import APIRequestFactory

# EntryDraft imported via serializers
from glossary.serializers import (
    EntryDraftListSerializer,
    EntryListSerializer,
    PerspectiveSerializer,
    TermSerializer,
    UserDetailSerializer,
)
from glossary.tests.conftest import (
    EntryDraftFactory,
    EntryFactory,
    PerspectiveCuratorFactory,
    PerspectiveFactory,
    TermFactory,
    UserFactory,
)


@pytest.mark.django_db
class TestUserSerializers:
    """Test User serializers"""

    def test_user_detail_serializer_includes_perspective_curator_for(self):
        """Test that UserDetailSerializer includes perspective_curator_for field"""
        user = UserFactory()
        perspective = PerspectiveFactory()
        PerspectiveCuratorFactory(user=user, perspective=perspective)

        serializer = UserDetailSerializer(user)
        data = serializer.data

        assert "perspective_curator_for" in data
        assert perspective.id in data["perspective_curator_for"]


@pytest.mark.django_db
class TestPerspectiveSerializer:
    """Test Perspective serializer"""

    def test_perspective_serialization(self):
        """Test basic perspective serialization"""
        perspective = PerspectiveFactory(name="Finance", description="Financial terms")
        serializer = PerspectiveSerializer(perspective)
        data = serializer.data

        assert data["name"] == "Finance"
        assert data["description"] == "Financial terms"
        assert "created_at" in data


@pytest.mark.django_db
class TestTermSerializer:
    """Test Term serializer"""

    def test_term_serialization(self):
        """Test basic term serialization"""
        term = TermFactory(text="API", is_official=True)
        serializer = TermSerializer(term)
        data = serializer.data

        assert data["text"] == "API"
        assert data["is_official"] is True
        assert "text_normalized" in data


@pytest.mark.django_db
class TestEntrySerializers:
    """Test Entry serializers"""

    def test_entry_list_serializer_nested_data(self):
        """Test that EntryListSerializer includes nested term and perspective"""
        entry = EntryFactory()
        serializer = EntryListSerializer(entry)
        data = serializer.data

        assert "term" in data
        assert "perspective" in data
        assert data["term"]["id"] == entry.term.id
        assert data["perspective"]["id"] == entry.perspective.id

    def test_entry_list_serializer_includes_active_version(self):
        """Test that EntryListSerializer includes active_version"""
        from django.db.models import Prefetch

        entry = EntryFactory()
        version = EntryDraftFactory(entry=entry, is_published=True)

        # Prefetch published_drafts as required by the serializer
        from glossary.models import EntryDraft

        latest_published_draft = Prefetch(
            "drafts",
            queryset=EntryDraft.objects.filter(is_published=True, is_deleted=False)
            .select_related("author", "endorsed_by")
            .prefetch_related("approvers", "requested_reviewers")
            .order_by("-published_at"),
            to_attr="published_drafts",
        )
        entry = (
            type(entry)
            .objects.filter(pk=entry.pk)
            .prefetch_related(latest_published_draft)
            .first()
        )

        serializer = EntryListSerializer(entry)
        data = serializer.data

        assert "active_draft" in data
        assert data["active_draft"]["id"] == version.id

    def test_entry_list_serializer_permission_flags(self):
        """EntryListSerializer should include can_user_endorse/edit based on user"""
        entry = EntryFactory()
        factory = APIRequestFactory()

        # Anonymous user -> no permissions
        from django.contrib.auth.models import AnonymousUser

        anon_request = factory.get("/")
        anon_request.user = AnonymousUser()
        serializer = EntryListSerializer(entry, context={"request": anon_request})
        data = serializer.data
        assert data.get("can_user_endorse") is False
        assert data.get("can_user_edit") is False

        # Staff user -> both true
        staff_user = UserFactory(is_staff=True)
        staff_request = factory.get("/")
        staff_request.user = staff_user
        serializer = EntryListSerializer(entry, context={"request": staff_request})
        data = serializer.data
        assert data.get("can_user_endorse") is True
        assert data.get("can_user_edit") is True

        # Perspective curator (non-staff) -> both true for matching perspective
        curator_user = UserFactory()
        from glossary.tests.conftest import PerspectiveCuratorFactory

        PerspectiveCuratorFactory(user=curator_user, perspective=entry.perspective)
        curator_request = factory.get("/")
        curator_request.user = curator_user
        serializer = EntryListSerializer(entry, context={"request": curator_request})
        data = serializer.data
        assert data.get("can_user_endorse") is True
        assert data.get("can_user_edit") is True


@pytest.mark.django_db
class TestEntryDraftSerializers:
    """Test EntryDraft serializers"""

    def test_entry_version_list_serializer_includes_approvals(self):
        """Test that EntryDraftListSerializer includes approval info"""
        version = EntryDraftFactory()
        user1 = UserFactory()
        version.approvers.add(user1)

        serializer = EntryDraftListSerializer(version)
        data = serializer.data

        assert "is_approved" in data
        assert "approval_count" in data
        assert data["approval_count"] == 1
        assert "approvers" in data
        assert len(data["approvers"]) == 1

    def test_entry_version_list_serializer_user_flags(self):
        """User-centric fields reflect approval/ownership state"""
        factory = APIRequestFactory()

        # Setup version authored by other user so current can approve
        author = UserFactory()
        current_user = UserFactory()
        version = EntryDraftFactory(author=author)

        request = factory.get("/")
        request.user = current_user
        serializer = EntryDraftListSerializer(version, context={"request": request})
        data = serializer.data
        assert data["can_approve_by_current_user"] is True
        assert data["approval_status_for_user"] == "can_approve"
        assert data["user_has_approved"] is False
        assert data["remaining_approvals"] >= 0
        assert 0 <= data["approval_percentage"] <= 100

        # When user is the author -> cannot approve
        own_request = factory.get("/")
        own_request.user = author
        serializer = EntryDraftListSerializer(version, context={"request": own_request})
        data = serializer.data
        assert data["can_approve_by_current_user"] is False
        assert data["approval_status_for_user"] == "own_draft"

        # After user approves -> flags update
        approver = current_user
        version.approvers.add(approver)
        request2 = factory.get("/")
        request2.user = approver
        serializer = EntryDraftListSerializer(version, context={"request": request2})
        data = serializer.data
        assert data["can_approve_by_current_user"] is False
        # User has approved but draft may not be fully approved yet
        assert data["approval_status_for_user"] in {
            "can_approve",
            "already_approved_by_others",
        }
        assert data["user_has_approved"] is True

    def test_approval_status_for_user_logic(self):
        """Test the updated approval status logic"""
        from glossary.serializers import EntryDraftListSerializer

        author = UserFactory()
        approver1 = UserFactory()
        approver2 = UserFactory()
        entry = EntryFactory()

        # Create a draft that needs 2 approvals
        draft = EntryDraftFactory(entry=entry, author=author)

        factory = APIRequestFactory()

        # Test 1: User who hasn't approved yet
        request1 = factory.get("/")
        request1.user = approver1
        serializer1 = EntryDraftListSerializer(draft, context={"request": request1})
        data1 = serializer1.data
        assert data1["approval_status_for_user"] == "can_approve"

        # Test 2: User approves but draft still needs more approvals
        draft.approvers.add(approver1)
        request2 = factory.get("/")
        request2.user = approver1
        serializer2 = EntryDraftListSerializer(draft, context={"request": request2})
        data2 = serializer2.data
        assert (
            data2["approval_status_for_user"] == "can_approve"
        )  # Still needs more approvals

        # Test 3: Draft gets fully approved
        draft.approvers.add(approver2)
        request3 = factory.get("/")
        request3.user = approver1
        serializer3 = EntryDraftListSerializer(draft, context={"request": request3})
        data3 = serializer3.data
        assert (
            data3["approval_status_for_user"] == "already_approved_by_others"
        )  # Now fully approved

        # Test 4: Different user who hasn't approved
        request4 = factory.get("/")
        request4.user = UserFactory()
        serializer4 = EntryDraftListSerializer(draft, context={"request": request4})
        data4 = serializer4.data
        assert (
            data4["approval_status_for_user"] == "already_approved_by_others"
        )  # Draft is fully approved

    def test_replaces_draft_field_in_serializer(self):
        """Test that replaces_draft field is included in serializers"""
        from glossary.serializers import (
            EntryDraftListSerializer,
            EntryDraftReviewSerializer,
        )

        author = UserFactory()
        entry = EntryFactory()

        # Create drafts with replacement relationship
        draft1 = EntryDraftFactory(entry=entry, author=author)
        draft2 = EntryDraftFactory(entry=entry, author=author, replaces_draft=draft1)

        factory = APIRequestFactory()
        request = factory.get("/")
        request.user = author

        # Test EntryDraftListSerializer
        serializer1 = EntryDraftListSerializer(draft2, context={"request": request})
        data1 = serializer1.data
        assert "replaces_draft" in data1
        assert data1["replaces_draft"] == draft1.id

        # Test EntryDraftReviewSerializer
        serializer2 = EntryDraftReviewSerializer(draft2, context={"request": request})
        data2 = serializer2.data
        assert "replaces_draft" in data2
        assert data2["replaces_draft"] == draft1.id

    def test_entry_version_create_serializer(self):
        """Test EntryDraftCreateSerializer"""
        from glossary.serializers import EntryDraftCreateSerializer

        entry = EntryFactory()
        author = UserFactory()
        factory = APIRequestFactory()
        request = factory.post("/")
        request.user = author

        data = {
            "entry": entry.id,
            "content": "<p>Test content</p>",
        }

        serializer = EntryDraftCreateSerializer(data=data, context={"request": request})
        assert serializer.is_valid()

        version = serializer.save()
        assert version.entry == entry
        assert version.author == author
        assert version.content == "<p>Test content</p>"

    def test_entry_version_create_rejects_empty_quill_html(self):
        """Creation should reject content that's empty after stripping HTML."""
        from glossary.serializers import EntryDraftCreateSerializer

        entry = EntryFactory()
        author = UserFactory()
        factory = APIRequestFactory()
        request = factory.post("/")
        request.user = author

        data = {
            "entry": entry.id,
            "content": "<p><br></p>",
        }

        serializer = EntryDraftCreateSerializer(data=data, context={"request": request})
        assert not serializer.is_valid()
        assert "content" in serializer.errors

    def test_entry_version_update_rejects_empty_quill_html(self):
        """Update should reject content that's empty after stripping HTML."""
        from glossary.serializers import EntryDraftUpdateSerializer

        version = EntryDraftFactory()
        serializer = EntryDraftUpdateSerializer(
            instance=version, data={"content": "<p><br></p>"}, partial=True
        )
        assert not serializer.is_valid()
        assert "content" in serializer.errors
