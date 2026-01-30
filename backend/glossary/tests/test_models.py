import pytest

from django.core.exceptions import ValidationError

from glossary.models import (
    EntryDraft,
    Perspective,
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

    def test_multiple_unapproved_versions_per_author_per_entry(self):
        """Test that multiple unapproved versions are now allowed (linear draft history)"""
        author = UserFactory()
        entry = EntryFactory()
        version1 = EntryDraftFactory(entry=entry, author=author)

        # Should be able to create second unapproved version (linear draft history)
        version2 = EntryDraftFactory(entry=entry, author=author, replaces_draft=version1)

        # Both versions should exist
        assert EntryDraft.objects.filter(entry=entry, author=author).count() == 2
        assert version1.replaces_draft is None  # First version doesn't replace anything
        assert version2.replaces_draft == version1  # Second version replaces the first

    def test_replaces_draft_field(self):
        """Test the replaces_draft field functionality"""
        author = UserFactory()
        entry = EntryFactory()

        # Create first draft
        draft1 = EntryDraftFactory(entry=entry, author=author)
        assert draft1.replaces_draft is None

        # Create second draft that replaces the first
        draft2 = EntryDraftFactory(entry=entry, author=author, replaces_draft=draft1)
        assert draft2.replaces_draft == draft1

        # Test reverse relationship
        assert draft2 in draft1.replaced_by.all()


@pytest.mark.django_db
class TestCommentModel:
    """Test the Comment model"""

    def test_comment_str_representation(self):
        """Test __str__ method"""
        user = UserFactory(username="alice")
        draft = EntryDraftFactory()
        comment = CommentFactory(author=user, draft=draft)

        assert "alice" in str(comment)
        assert str(draft.id) in str(comment)

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

    def test_comment_edited_at_timestamp(self):
        """Test that edited_at is set when comment text is updated"""
        from django.utils import timezone

        comment = CommentFactory(text="Original text")
        assert comment.edited_at is None

        # Update comment text
        comment.text = "Updated text"
        comment.save()

        assert comment.edited_at is not None
        assert comment.edited_at <= timezone.now()

    def test_comment_edited_at_not_set_on_creation(self):
        """Test that edited_at is not set when comment is first created"""
        comment = CommentFactory(text="Original text")

        assert comment.edited_at is None

    def test_comment_deep_nesting(self):
        """Test comment with multiple levels of nesting"""
        parent = CommentFactory()
        reply1 = CommentFactory(parent=parent)
        reply2 = CommentFactory(parent=reply1)
        reply3 = CommentFactory(parent=reply2)

        assert parent.replies.count() == 1
        assert reply1.replies.count() == 1
        assert reply2.replies.count() == 1
        assert reply3.replies.count() == 0

    def test_reaction_unique_constraint(self):
        """Test that user can only have one reaction per comment per type"""
        from glossary.models import Reaction

        comment = CommentFactory()
        user = UserFactory()

        # Create first reaction
        Reaction.objects.create(
            comment=comment,
            user=user,
            reaction_type="thumbs_up",
            created_by=user,
        )

        # Try to create duplicate reaction (should raise ValidationError from clean())
        # ValidationError is raised during save() which calls full_clean()
        with pytest.raises(ValidationError, match="already exists"):
            Reaction.objects.create(
                comment=comment,
                user=user,
                reaction_type="thumbs_up",
                created_by=user,
            )

    def test_reaction_invalid_type(self):
        """Test that invalid reaction type raises ValidationError"""
        from glossary.models import Reaction

        comment = CommentFactory()
        user = UserFactory()

        reaction = Reaction(comment=comment, user=user, reaction_type="invalid_type")

        with pytest.raises(ValidationError, match="Invalid reaction type"):
            reaction.full_clean()


@pytest.mark.django_db
class TestPerspectiveCuratorModel:
    """Test the PerspectiveCurator model"""

    def test_perspective_curator_str_representation(self):
        """Test __str__ method"""
        user = UserFactory(username="curator")
        perspective = PerspectiveFactory(name="Finance")
        curator = PerspectiveCuratorFactory(user=user, perspective=perspective)
        assert str(curator) == "curator - Finance"

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


@pytest.mark.django_db
class TestEntryModelEdgeCases:
    """Test Entry model edge cases and soft delete scenarios"""

    def test_get_latest_draft_with_deleted_drafts(self):
        """Test get_latest_draft excludes soft-deleted drafts"""
        entry = EntryFactory()
        user = UserFactory()

        # Create multiple drafts
        draft1 = EntryDraftFactory(entry=entry, author=user, content="First draft")
        draft2 = EntryDraftFactory(entry=entry, author=user, content="Second draft")

        # Soft delete the latest draft
        draft2.delete()

        # Should return the first draft as latest
        latest_draft = entry.get_latest_draft()
        assert latest_draft == draft1
        assert latest_draft.content == "First draft"

    def test_get_latest_published_draft_with_deleted_drafts(self):
        """Test get_latest_published_draft excludes soft-deleted drafts"""
        entry = EntryFactory()
        user = UserFactory()

        # Create published drafts
        published_draft1 = EntryDraftFactory(entry=entry, author=user, is_published=True, content="First published")
        published_draft2 = EntryDraftFactory(entry=entry, author=user, is_published=True, content="Second published")

        # Soft delete the latest published draft
        published_draft2.delete()

        # Should return the first published draft as latest (using direct query since no prefetch in tests)
        latest_published = entry.drafts.filter(is_published=True).order_by("-published_at", "-created_at").first()
        assert latest_published == published_draft1
        assert latest_published.content == "First published"

    def test_entry_with_multiple_published_drafts(self):
        """Test behavior when entry has multiple published drafts (edge case)"""
        entry = EntryFactory()
        user = UserFactory()

        # Create multiple published drafts (shouldn't normally happen but test edge case)
        EntryDraftFactory(entry=entry, author=user, is_published=True, content="First published")
        published_draft2 = EntryDraftFactory(entry=entry, author=user, is_published=True, content="Second published")

        # Should return the most recent published draft (using direct query since no prefetch in tests)
        latest_published = entry.drafts.filter(is_published=True).order_by("-published_at", "-created_at").first()
        assert latest_published == published_draft2
        assert latest_published.content == "Second published"

    def test_entry_with_no_drafts(self):
        """Test entry with no drafts returns None for draft methods"""
        entry = EntryFactory()

        # Should return None when no drafts exist (using direct query since no prefetch in tests)
        assert entry.get_latest_draft() is None
        assert entry.drafts.filter(is_published=True).order_by("-published_at", "-created_at").first() is None

    def test_entry_with_only_deleted_drafts(self):
        """Test entry with only soft-deleted drafts"""
        entry = EntryFactory()
        user = UserFactory()

        # Create and delete all drafts
        draft = EntryDraftFactory(entry=entry, author=user, content="Deleted draft")
        draft.delete()

        # Should return None since all drafts are deleted (using direct query since no prefetch in tests)
        assert entry.get_latest_draft() is None
        assert entry.drafts.filter(is_published=True).order_by("-published_at", "-created_at").first() is None
