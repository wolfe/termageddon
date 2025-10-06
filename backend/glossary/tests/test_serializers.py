import pytest
from rest_framework.test import APIRequestFactory

from glossary.models import EntryVersion
from glossary.serializers import (
    DomainSerializer,
    EntryListSerializer,
    EntryVersionListSerializer,
    TermSerializer,
    UserDetailSerializer,
)
from glossary.tests.conftest import (
    DomainExpertFactory,
    DomainFactory,
    EntryFactory,
    EntryVersionFactory,
    TermFactory,
    UserFactory,
)


@pytest.mark.django_db
class TestUserSerializers:
    """Test User serializers"""

    def test_user_detail_serializer_includes_domain_expert_for(self):
        """Test that UserDetailSerializer includes domain_expert_for field"""
        user = UserFactory()
        domain = DomainFactory()
        DomainExpertFactory(user=user, domain=domain)

        serializer = UserDetailSerializer(user)
        data = serializer.data

        assert "domain_expert_for" in data
        assert domain.id in data["domain_expert_for"]


@pytest.mark.django_db
class TestDomainSerializer:
    """Test Domain serializer"""

    def test_domain_serialization(self):
        """Test basic domain serialization"""
        domain = DomainFactory(name="Finance", description="Financial terms")
        serializer = DomainSerializer(domain)
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
        """Test that EntryListSerializer includes nested term and domain"""
        entry = EntryFactory()
        serializer = EntryListSerializer(entry)
        data = serializer.data

        assert "term" in data
        assert "domain" in data
        assert data["term"]["id"] == entry.term.id
        assert data["domain"]["id"] == entry.domain.id

    def test_entry_list_serializer_includes_active_version(self):
        """Test that EntryListSerializer includes active_version"""
        entry = EntryFactory()
        version = EntryVersionFactory(entry=entry)
        entry.active_version = version
        entry.save()

        serializer = EntryListSerializer(entry)
        data = serializer.data

        assert "active_version" in data
        assert data["active_version"]["id"] == version.id


@pytest.mark.django_db
class TestEntryVersionSerializers:
    """Test EntryVersion serializers"""

    def test_entry_version_list_serializer_includes_approvals(self):
        """Test that EntryVersionListSerializer includes approval info"""
        version = EntryVersionFactory()
        user1 = UserFactory()
        version.approvers.add(user1)

        serializer = EntryVersionListSerializer(version)
        data = serializer.data

        assert "is_approved" in data
        assert "approval_count" in data
        assert data["approval_count"] == 1
        assert "approvers" in data
        assert len(data["approvers"]) == 1

    def test_entry_version_create_serializer(self):
        """Test EntryVersionCreateSerializer"""
        from glossary.serializers import EntryVersionCreateSerializer

        entry = EntryFactory()
        author = UserFactory()
        factory = APIRequestFactory()
        request = factory.post("/")
        request.user = author

        data = {
            "entry": entry.id,
            "content": "<p>Test content</p>",
            "author": author.id,
        }

        serializer = EntryVersionCreateSerializer(
            data=data, context={"request": request}
        )
        assert serializer.is_valid()

        version = serializer.save()
        assert version.entry == entry
        assert version.author == author
        assert version.content == "<p>Test content</p>"

    def test_entry_version_create_rejects_empty_quill_html(self):
        """Creation should reject content that's empty after stripping HTML."""
        from glossary.serializers import EntryVersionCreateSerializer

        entry = EntryFactory()
        author = UserFactory()
        factory = APIRequestFactory()
        request = factory.post("/")
        request.user = author

        data = {
            "entry": entry.id,
            "content": "<p><br></p>",
            "author": author.id,
        }

        serializer = EntryVersionCreateSerializer(
            data=data, context={"request": request}
        )
        assert not serializer.is_valid()
        assert "content" in serializer.errors

    def test_entry_version_update_rejects_empty_quill_html(self):
        """Update should reject content that's empty after stripping HTML."""
        from glossary.serializers import EntryVersionUpdateSerializer

        version = EntryVersionFactory()
        serializer = EntryVersionUpdateSerializer(
            instance=version, data={"content": "<p><br></p>"}, partial=True
        )
        assert not serializer.is_valid()
        assert "content" in serializer.errors
