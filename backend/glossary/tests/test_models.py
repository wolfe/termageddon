import pytest
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError

from glossary.models import (
    Comment,
    Domain,
    DomainExpert,
    Entry,
    EntryVersion,
    Term,
)
from glossary.tests.conftest import (
    CommentFactory,
    DomainExpertFactory,
    DomainFactory,
    EntryFactory,
    EntryVersionFactory,
    TermFactory,
    UserFactory,
)


@pytest.mark.django_db
class TestAuditedModelAndSoftDelete:
    """Test the AuditedModel base class and soft delete functionality"""

    def test_soft_delete_excludes_from_default_manager(self):
        """Test that soft deleted objects are excluded from default manager"""
        domain = DomainFactory()
        assert Domain.objects.count() == 1

        domain.delete()  # Soft delete
        assert Domain.objects.count() == 0
        assert Domain.all_objects.count() == 1
        assert domain.is_deleted is True

    def test_hard_delete_actually_deletes(self):
        """Test that hard_delete removes object from database"""
        domain = DomainFactory()
        assert Domain.all_objects.count() == 1

        domain.hard_delete()
        assert Domain.all_objects.count() == 0

    def test_audit_fields_are_set(self):
        """Test that audit fields are automatically populated"""
        user = UserFactory()
        domain = DomainFactory(created_by=user)

        assert domain.created_at is not None
        assert domain.updated_at is not None
        assert domain.created_by == user


@pytest.mark.django_db
class TestDomainModel:
    """Test the Domain model"""

    def test_domain_str_representation(self):
        """Test __str__ method"""
        domain = DomainFactory(name="Finance")
        assert str(domain) == "Finance"

    def test_domain_uniqueness_validation(self):
        """Test that domain names must be unique among non-deleted records"""
        DomainFactory(name="Finance")

        with pytest.raises(ValidationError):
            DomainFactory(name="Finance")

    def test_domain_can_reuse_deleted_name(self):
        """Test that we can create a domain with same name as soft-deleted one"""
        domain1 = DomainFactory(name="Finance")
        domain1.delete()  # Soft delete

        # This should work now
        domain2 = DomainFactory(name="Finance")
        assert domain2.name == "Finance"


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
        domain = DomainFactory(name="Technology")
        entry = EntryFactory(term=term, domain=domain)
        assert str(entry) == "API (Technology)"

    def test_entry_term_domain_uniqueness(self):
        """Test that term+domain combination must be unique"""
        term = TermFactory()
        domain = DomainFactory()
        EntryFactory(term=term, domain=domain)

        with pytest.raises(ValidationError):
            EntryFactory(term=term, domain=domain)

    def test_entry_same_term_different_domains(self):
        """Test that same term can exist in different domains"""
        term = TermFactory()
        domain1 = DomainFactory()
        domain2 = DomainFactory()

        entry1 = EntryFactory(term=term, domain=domain1)
        entry2 = EntryFactory(term=term, domain=domain2)

        assert entry1.term == entry2.term
        assert entry1.domain != entry2.domain


@pytest.mark.django_db
class TestEntryVersionModel:
    """Test the EntryVersion model"""

    def test_entry_version_str_representation(self):
        """Test __str__ method"""
        user = UserFactory(username="john")
        entry = EntryFactory()
        version = EntryVersionFactory(entry=entry, author=user)
        assert "john" in str(version)

    def test_approval_count_property(self):
        """Test the approval_count property"""
        version = EntryVersionFactory()
        assert version.approval_count == 0

        user1 = UserFactory()
        version.approvers.add(user1)
        assert version.approval_count == 1

    def test_is_approved_property(self):
        """Test the is_approved property (requires MIN_APPROVALS=2)"""
        version = EntryVersionFactory()
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
        version = EntryVersionFactory(author=author)
        approver = UserFactory()

        version.approve(approver)
        assert version.approvers.filter(pk=approver.pk).exists()

    def test_approve_method_rejects_author(self):
        """Test that authors cannot approve their own versions"""
        author = UserFactory()
        version = EntryVersionFactory(author=author)

        with pytest.raises(ValidationError, match="cannot approve their own"):
            version.approve(author)

    def test_approve_method_rejects_duplicate(self):
        """Test that users can't approve twice"""
        version = EntryVersionFactory()
        approver = UserFactory()

        version.approve(approver)

        with pytest.raises(ValidationError, match="already approved"):
            version.approve(approver)

    def test_one_unapproved_version_per_author_per_entry(self):
        """Test validation that prevents multiple unapproved versions"""
        author = UserFactory()
        entry = EntryFactory()
        version1 = EntryVersionFactory(entry=entry, author=author)

        # Should not be able to create second unapproved version
        with pytest.raises(
            ValidationError, match="already have an unpublished version"
        ):
            EntryVersionFactory(entry=entry, author=author)


@pytest.mark.django_db
class TestEntryVersionSignal:
    """Test the auto-activation signal for EntryVersion"""

    def test_approved_version_becomes_active(self):
        """Test that approved versions automatically become active"""
        entry = EntryFactory()
        version = EntryVersionFactory(entry=entry)

        # Add 2 approvers to meet MIN_APPROVALS=2
        user1 = UserFactory()
        user2 = UserFactory()
        version.approvers.add(user1, user2)

        # Refresh entry from DB
        entry.refresh_from_db()
        assert entry.active_version == version

    def test_newer_approved_version_replaces_older(self):
        """Test that newer approved versions replace older ones"""
        entry = EntryFactory()
        version1 = EntryVersionFactory(entry=entry)

        # Approve version1
        user1 = UserFactory()
        user2 = UserFactory()
        version1.approvers.add(user1, user2)
        entry.refresh_from_db()
        assert entry.active_version == version1

        # Create and approve version2
        # Need different author since only 1 unapproved version per author
        different_author = UserFactory()
        version2 = EntryVersionFactory(entry=entry, author=different_author)
        user3 = UserFactory()
        version2.approvers.add(user1, user3)

        entry.refresh_from_db()
        assert entry.active_version == version2


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
class TestDomainExpertModel:
    """Test the DomainExpert model"""

    def test_domain_expert_str_representation(self):
        """Test __str__ method"""
        user = UserFactory(username="expert")
        domain = DomainFactory(name="Finance")
        expert = DomainExpertFactory(user=user, domain=domain)
        assert str(expert) == "expert - Finance"

    def test_domain_expert_user_domain_uniqueness(self):
        """Test that user+domain must be unique"""
        user = UserFactory()
        domain = DomainFactory()
        DomainExpertFactory(user=user, domain=domain)

        with pytest.raises(ValidationError, match="already a domain expert"):
            DomainExpertFactory(user=user, domain=domain)

    def test_user_helper_method_is_domain_expert_for(self):
        """Test the monkey-patched User.is_domain_expert_for method"""
        user = UserFactory()
        domain = DomainFactory()
        DomainExpertFactory(user=user, domain=domain)

        assert user.is_domain_expert_for(domain.id) is True

        other_domain = DomainFactory()
        assert user.is_domain_expert_for(other_domain.id) is False
