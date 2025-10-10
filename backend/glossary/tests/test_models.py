import pytest
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError

from glossary.models import (
    Comment,
    Perspective,
    PerspectiveCurator,
    Entry,
    EntryDraft,
    Term,
)
from glossary.tests.conftest import (
    CommentFactory,
    PerspectiveCuratorFactory,
    PerspectiveFactory,
    EntryFactory,
    EntryDraftFactory,
    TermFactory,
    UserFactory,
)


@pytest.mark.django_db
class TestAuditedModelAndSoftDelete:
    """Test the AuditedModel base class and soft delete functionality"""

    def test_soft_delete_excludes_from_default_manager(self):
        """Test that soft deleted objects are excluded from default manager"""
        perspective = PerspectiveFactory()
        assert Perspective.objects.count() == 1

        perspective.delete()  # Soft delete
        assert Perspective.objects.count() == 0
        assert Perspective.all_objects.count() == 1
        assert perspective.is_deleted is True

    def test_hard_delete_actually_deletes(self):
        """Test that hard_delete removes object from database"""
        perspective = PerspectiveFactory()
        assert Perspective.all_objects.count() == 1

        perspective.hard_delete()
        assert Perspective.all_objects.count() == 0

    def test_audit_fields_are_set(self):
        """Test that audit fields are automatically populated"""
        user = UserFactory()
        perspective = PerspectiveFactory(created_by=user)

        assert perspective.created_at is not None
        assert perspective.updated_at is not None
        assert perspective.created_by == user


@pytest.mark.django_db
class TestPerspectiveModel:
    """Test the Perspective model"""

    def test_perspective_str_representation(self):
        """Test __str__ method"""
        perspective = PerspectiveFactory(name="Finance")
        assert str(perspective) == "Finance"

    def test_perspective_uniqueness_validation(self):
        """Test that perspective names must be unique among non-deleted records"""
        PerspectiveFactory(name="Finance")

        with pytest.raises(ValidationError):
            PerspectiveFactory(name="Finance")

    def test_perspective_can_reuse_deleted_name(self):
        """Test that we can create a perspective with same name as soft-deleted one"""
        perspective1 = PerspectiveFactory(name="Finance")
        perspective1.delete()  # Soft delete

        # This should work now
        perspective2 = PerspectiveFactory(name="Finance")
        assert perspective2.name == "Finance"


@pytest.mark.django_db
class TestTermModel:
    """Test the Term model"""

    def test_term_str_representation(self):
        """Test __str__ method"""
        term = TermFactory(text="API")
        assert str(term) == "API"

    def test_term_normalized_auto_populated(self):
        """Test that text_normalized is automatically set"""
        term = TermFactory(text="Café")
        assert term.text_normalized == "cafe"

    def test_term_uniqueness_validation(self):
        """Test that term text must be unique among non-deleted records"""
        TermFactory(text="API")

        with pytest.raises(ValidationError):
            TermFactory(text="API")

    def test_term_is_official_flag(self):
        """Test the is_official flag"""
        term = TermFactory(is_official=True)
        assert term.is_official is True


@pytest.mark.django_db
class TestEntryModel:
    """Test the Entry model"""

    def test_entry_str_representation(self):
        """Test __str__ method"""
        term = TermFactory(text="API")
        perspective = PerspectiveFactory(name="Technology")
        entry = EntryFactory(term=term, perspective=perspective)
        assert str(entry) == "API (Technology)"

    def test_entry_term_perspective_uniqueness(self):
        """Test that term+perspective combination must be unique"""
        term = TermFactory()
        perspective = PerspectiveFactory()
        EntryFactory(term=term, perspective=perspective)

        with pytest.raises(ValidationError):
            EntryFactory(term=term, perspective=perspective)

    def test_entry_same_term_different_perspectives(self):
        """Test that same term can exist in different perspectives"""
        term = TermFactory()
        perspective1 = PerspectiveFactory()
        perspective2 = PerspectiveFactory()

        entry1 = EntryFactory(term=term, perspective=perspective1)
        entry2 = EntryFactory(term=term, perspective=perspective2)

        assert entry1.term == entry2.term
        assert entry1.perspective != entry2.perspective


@pytest.mark.django_db
class TestEntryDraftModel:
    """Test the EntryDraft model"""

    def test_entry_version_str_representation(self):
        """Test __str__ method"""
        user = UserFactory(username="john")
        entry = EntryFactory()
        version = EntryDraftFactory(entry=entry, author=user)
        assert "john" in str(version)

    def test_approval_count_property(self):
        """Test the approval_count property"""
        version = EntryDraftFactory()
        assert version.approval_count == 0

        user1 = UserFactory()
        version.approvers.add(user1)
        assert version.approval_count == 1

    def test_is_approved_property(self):
        """Test the is_approved property (requires MIN_APPROVALS=2)"""
        version = EntryDraftFactory()
        assert version.is_approved is False

        user1 = UserFactory()
        version.approvers.add(user1)
        assert version.is_approved is False

        user2 = UserFactory()
        version.approvers.add(user2)
        assert version.is_approved is True

    def test_approve_method_adds_approver(self):
        """Test the approve() method"""
        author = UserFactory()
        version = EntryDraftFactory(author=author)
        approver = UserFactory()

        version.approve(approver)
        assert version.approvers.filter(pk=approver.pk).exists()

    def test_approve_method_rejects_author(self):
        """Test that authors cannot approve their own versions"""
        author = UserFactory()
        version = EntryDraftFactory(author=author)

        with pytest.raises(ValidationError, match="cannot approve their own"):
            version.approve(author)

    def test_approve_method_rejects_duplicate(self):
        """Test that users can't approve twice"""
        version = EntryDraftFactory()
        approver = UserFactory()

        version.approve(approver)

        with pytest.raises(ValidationError, match="already approved"):
            version.approve(approver)

    def test_one_unapproved_version_per_author_per_entry(self):
        """Test validation that prevents multiple unapproved versions"""
        author = UserFactory()
        entry = EntryFactory()
        version1 = EntryDraftFactory(entry=entry, author=author)

        # Should not be able to create second unapproved version
        with pytest.raises(
            ValidationError, match="already have an unpublished draft"
        ):
            EntryDraftFactory(entry=entry, author=author)


@pytest.mark.django_db
class TestEntryDraftSignal:
    """Test the auto-activation signal for EntryDraft"""

    def test_approved_version_becomes_active(self):
        """Test that approved versions automatically become active"""
        entry = EntryFactory()
        version = EntryDraftFactory(entry=entry)

        # Add 2 approvers to meet MIN_APPROVALS=2
        user1 = UserFactory()
        user2 = UserFactory()
        version.approvers.add(user1, user2)

        # Refresh entry from DB
        entry.refresh_from_db()
        assert entry.active_draft == version

    def test_newer_approved_version_replaces_older(self):
        """Test that newer approved versions replace older ones"""
        entry = EntryFactory()
        version1 = EntryDraftFactory(entry=entry)

        # Approve version1
        user1 = UserFactory()
        user2 = UserFactory()
        version1.approvers.add(user1, user2)
        entry.refresh_from_db()
        assert entry.active_draft == version1

        # Create and approve version2
        # Need different author since only 1 unapproved version per author
        different_author = UserFactory()
        version2 = EntryDraftFactory(entry=entry, author=different_author)
        user3 = UserFactory()
        version2.approvers.add(user1, user3)

        entry.refresh_from_db()
        assert entry.active_draft == version2


@pytest.mark.django_db
class TestCommentModel:
    """Test the Comment model"""

    def test_comment_str_representation(self):
        """Test __str__ method"""
        user = UserFactory(username="alice")
        entry = EntryFactory()
        comment = CommentFactory(author=user)
        # Set content_object manually for GenericForeignKey
        comment.content_type = ContentType.objects.get_for_model(Entry)
        comment.object_id = entry.id
        comment.save()

        assert "alice" in str(comment)

    def test_comment_with_replies(self):
        """Test nested comments (replies)"""
        parent = CommentFactory()
        reply = CommentFactory(parent=parent)

        assert reply.parent == parent
        assert parent.replies.count() == 1

    def test_only_top_level_comments_can_be_resolved(self):
        """Test that only comments without parents can be resolved"""
        parent = CommentFactory(is_resolved=True)
        assert parent.is_resolved is True

        reply = CommentFactory(parent=parent)
        with pytest.raises(ValidationError, match="Only top-level"):
            reply.is_resolved = True
            reply.save()


@pytest.mark.django_db
class TestPerspectiveCuratorModel:
    """Test the PerspectiveCurator model"""

    def test_perspective_curator_str_representation(self):
        """Test __str__ method"""
        user = UserFactory(username="expert")
        perspective = PerspectiveFactory(name="Finance")
        expert = PerspectiveCuratorFactory(user=user, perspective=perspective)
        assert str(expert) == "expert - Finance"

    def test_perspective_curator_user_perspective_uniqueness(self):
        """Test that user+perspective must be unique"""
        user = UserFactory()
        perspective = PerspectiveFactory()
        PerspectiveCuratorFactory(user=user, perspective=perspective)

        with pytest.raises(ValidationError, match="already a perspective curator"):
            PerspectiveCuratorFactory(user=user, perspective=perspective)

    def test_user_helper_method_is_perspective_curator_for(self):
        """Test the monkey-patched User.is_perspective_curator_for method"""
        user = UserFactory()
        perspective = PerspectiveFactory()
        PerspectiveCuratorFactory(user=user, perspective=perspective)

        assert user.is_perspective_curator_for(perspective.id) is True

        other_perspective = PerspectiveFactory()
        assert user.is_perspective_curator_for(other_perspective.id) is False
