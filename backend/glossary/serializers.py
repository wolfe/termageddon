from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.utils.html import strip_tags
import html
from rest_framework import serializers

from glossary.models import (
    Comment,
    Domain,
    DomainExpert,
    Entry,
    EntryVersion,
    Term,
)


# User serializers
class UserSerializer(serializers.ModelSerializer):
    """Basic user serializer"""

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "is_staff"]


class UserDetailSerializer(serializers.ModelSerializer):
    """Detailed user serializer with domain expert info"""

    domain_expert_for = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "is_staff",
            "domain_expert_for",
        ]

    def get_domain_expert_for(self, obj):
        """Return list of domain IDs the user is an expert for"""
        return list(
            DomainExpert.objects.filter(user=obj).values_list("domain_id", flat=True)
        )


# Domain serializers
class DomainSerializer(serializers.ModelSerializer):
    """Domain serializer"""

    class Meta:
        model = Domain
        fields = ["id", "name", "description", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]


# Term serializers
class TermSerializer(serializers.ModelSerializer):
    """Term serializer"""

    class Meta:
        model = Term
        fields = [
            "id",
            "text",
            "text_normalized",
            "is_official",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["text_normalized", "created_at", "updated_at"]


# EntryVersion serializers
class EntryVersionListSerializer(serializers.ModelSerializer):
    """EntryVersion serializer with nested user data"""

    author = UserSerializer(read_only=True)
    approvers = UserSerializer(many=True, read_only=True)
    requested_reviewers = UserSerializer(many=True, read_only=True)
    endorsed_by = UserSerializer(read_only=True)
    is_approved = serializers.BooleanField(read_only=True)
    approval_count = serializers.IntegerField(read_only=True)
    is_published = serializers.BooleanField(read_only=True)
    is_endorsed = serializers.BooleanField(read_only=True)

    class Meta:
        model = EntryVersion
        fields = [
            "id",
            "entry",
            "content",
            "author",
            "timestamp",
            "approvers",
            "requested_reviewers",
            "endorsed_by",
            "endorsed_at",
            "is_approved",
            "approval_count",
            "is_published",
            "is_endorsed",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["timestamp", "created_at", "updated_at"]


class EntryVersionCreateSerializer(serializers.Serializer):
    """EntryVersion serializer for creation (uses IDs)"""

    id = serializers.IntegerField(read_only=True)
    entry = serializers.PrimaryKeyRelatedField(queryset=Entry.objects.all())
    content = serializers.CharField(help_text="Rich HTML content (sanitized on save)")
    def validate_content(self, value: str) -> str:
        """Reject content that is effectively empty after stripping HTML.

        Quill often submits empty content as '<p><br></p>' (or similar). We
        unescape HTML entities and strip tags before checking for non-whitespace
        characters.
        """
        # Unescape entities like &nbsp;
        unescaped = html.unescape(value or "")
        # Strip HTML tags
        text_only = strip_tags(unescaped)
        # Replace non-breaking spaces and trim
        normalized = text_only.replace("\xa0", " ").strip()
        if not normalized:
            raise serializers.ValidationError("Content cannot be empty.")
        return value
    author = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())

    def create(self, validated_data):
        # Set created_by from request user
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            validated_data["created_by"] = request.user

        try:
            return EntryVersion.objects.create(**validated_data)
        except ValidationError as e:
            raise serializers.ValidationError(e.message_dict)


class EntryVersionUpdateSerializer(serializers.ModelSerializer):
    """EntryVersion serializer for updates (only content can be updated)"""

    class Meta:
        model = EntryVersion
        fields = ["content"]

    def update(self, instance, validated_data):
        # Only allow updating content for unpublished versions
        if instance.is_published:
            raise serializers.ValidationError("Cannot update published versions.")

        return super().update(instance, validated_data)

    def validate_content(self, value: str) -> str:
        """Same empty-content rule as creation."""
        unescaped = html.unescape(value or "")
        text_only = strip_tags(unescaped)
        normalized = text_only.replace("\xa0", " ").strip()
        if not normalized:
            raise serializers.ValidationError("Content cannot be empty.")
        return value


# Entry serializers
class EntryListSerializer(serializers.ModelSerializer):
    """Entry serializer with nested data for list/retrieve"""

    term = TermSerializer(read_only=True)
    domain = DomainSerializer(read_only=True)
    active_version = EntryVersionListSerializer(read_only=True)

    class Meta:
        model = Entry
        fields = [
            "id",
            "term",
            "domain",
            "active_version",
            "is_official",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class EntryCreateSerializer(serializers.ModelSerializer):
    """Entry serializer for creation (uses IDs)"""

    class Meta:
        model = Entry
        fields = ["id", "term", "domain", "is_official"]

    def create(self, validated_data):
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            validated_data["created_by"] = request.user
        return super().create(validated_data)


class EntryVersionReviewSerializer(serializers.ModelSerializer):
    """EntryVersion serializer with expanded entry data for review"""

    author = UserSerializer(read_only=True)
    approvers = UserSerializer(many=True, read_only=True)
    requested_reviewers = UserSerializer(many=True, read_only=True)
    entry = EntryListSerializer(read_only=True)
    is_approved = serializers.BooleanField(read_only=True)
    approval_count = serializers.IntegerField(read_only=True)
    is_published = serializers.BooleanField(read_only=True)
    replaces_version = serializers.SerializerMethodField()

    class Meta:
        model = EntryVersion
        fields = [
            "id",
            "entry",
            "content",
            "author",
            "timestamp",
            "approvers",
            "requested_reviewers",
            "is_approved",
            "approval_count",
            "is_published",
            "replaces_version",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["timestamp", "created_at", "updated_at"]

    def get_replaces_version(self, obj):
        """Get the currently active version that this version would replace"""
        if obj.entry.active_version and obj.entry.active_version.id != obj.id:
            return EntryVersionListSerializer(obj.entry.active_version).data
        return None


class EntryUpdateSerializer(serializers.ModelSerializer):
    """Entry serializer for updates"""

    class Meta:
        model = Entry
        fields = ["id", "is_official"]
        read_only_fields = ["id"]


# Comment serializers
class CommentListSerializer(serializers.ModelSerializer):
    """Comment serializer with nested user data"""

    author = UserSerializer(read_only=True)
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            "id",
            "content_type",
            "object_id",
            "parent",
            "text",
            "author",
            "is_resolved",
            "replies",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_replies(self, obj):
        """Recursively serialize replies"""
        if obj.replies.exists():
            return CommentListSerializer(obj.replies.all(), many=True).data
        return []


class CommentCreateSerializer(serializers.ModelSerializer):
    """Comment serializer for creation"""

    class Meta:
        model = Comment
        fields = [
            "id",
            "content_type",
            "object_id",
            "parent",
            "text",
            "author",
            "is_resolved",
        ]

    def create(self, validated_data):
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            validated_data["created_by"] = request.user
        return super().create(validated_data)


# DomainExpert serializers
class DomainExpertSerializer(serializers.ModelSerializer):
    """DomainExpert serializer"""

    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source="user", write_only=True
    )
    domain = DomainSerializer(read_only=True)
    domain_id = serializers.PrimaryKeyRelatedField(
        queryset=Domain.objects.all(), source="domain", write_only=True
    )
    assigned_by = UserSerializer(read_only=True)

    class Meta:
        model = DomainExpert
        fields = [
            "id",
            "user",
            "user_id",
            "domain",
            "domain_id",
            "assigned_by",
            "created_at",
        ]
        read_only_fields = ["created_at", "assigned_by"]

    def create(self, validated_data):
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            validated_data["assigned_by"] = request.user
            validated_data["created_by"] = request.user
        return super().create(validated_data)
