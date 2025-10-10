from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.utils.html import strip_tags
import html
from rest_framework import serializers

from glossary.models import (
    Comment,
    Perspective,
    PerspectiveCurator,
    Entry,
    EntryDraft,
    Term,
)


# User serializers
class UserSerializer(serializers.ModelSerializer):
    """Basic user serializer"""

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "is_staff"]


class UserDetailSerializer(serializers.ModelSerializer):
    """Detailed user serializer with perspective curator info"""

    perspective_curator_for = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "is_staff",
            "perspective_curator_for",
        ]

    def get_perspective_curator_for(self, obj):
        """Return list of perspective IDs the user is a curator for"""
        return list(
            PerspectiveCurator.objects.filter(user=obj).values_list("perspective_id", flat=True)
        )


# Perspective serializers
class PerspectiveSerializer(serializers.ModelSerializer):
    """Perspective serializer"""

    class Meta:
        model = Perspective
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


# EntryDraft serializers
class EntryDraftListSerializer(serializers.ModelSerializer):
    """EntryDraft serializer with nested user data"""

    author = UserSerializer(read_only=True)
    approvers = UserSerializer(many=True, read_only=True)
    requested_reviewers = UserSerializer(many=True, read_only=True)
    endorsed_by = UserSerializer(read_only=True)
    is_approved = serializers.BooleanField(read_only=True)
    approval_count = serializers.IntegerField(read_only=True)
    is_published = serializers.BooleanField(read_only=True)
    is_endorsed = serializers.BooleanField(read_only=True)
    can_approve_by_current_user = serializers.SerializerMethodField()
    approval_status_for_user = serializers.SerializerMethodField()
    user_has_approved = serializers.SerializerMethodField()
    remaining_approvals = serializers.SerializerMethodField()
    approval_percentage = serializers.SerializerMethodField()

    class Meta:
        model = EntryDraft
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
            "can_approve_by_current_user",
            "approval_status_for_user",
            "user_has_approved",
            "remaining_approvals",
            "approval_percentage",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["timestamp", "created_at", "updated_at"]

    def get_can_approve_by_current_user(self, obj):
        """Check if current user can approve this draft"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        
        # Cannot approve own drafts
        if obj.author.id == request.user.id:
            return False
        
        # Cannot approve if already approved this draft
        if obj.approvers.filter(pk=request.user.pk).exists():
            return False
        
        # Can approve if status is pending
        return not obj.is_approved

    def get_approval_status_for_user(self, obj):
        """Get approval status from current user's perspective"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 'unknown'
        
        if obj.author.id == request.user.id:
            return 'own_draft'
        
        if obj.approvers.filter(pk=request.user.pk).exists():
            return 'already_approved'
        
        if obj.is_approved:
            return 'already_approved_by_others'
        
        return 'can_approve'

    def get_user_has_approved(self, obj):
        """Check if current user has already approved this draft"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.approvers.filter(pk=request.user.pk).exists()

    def get_remaining_approvals(self, obj):
        """Calculate remaining approvals needed"""
        from django.conf import settings
        return max(0, settings.MIN_APPROVALS - obj.approval_count)

    def get_approval_percentage(self, obj):
        """Calculate approval percentage for progress indicators"""
        from django.conf import settings
        if settings.MIN_APPROVALS == 0:
            return 100
        return min(100, (obj.approval_count / settings.MIN_APPROVALS) * 100)


class EntryDraftCreateSerializer(serializers.Serializer):
    """EntryDraft serializer for creation (uses IDs)"""

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
            return EntryDraft.objects.create(**validated_data)
        except ValidationError as e:
            raise serializers.ValidationError(e.message_dict)


class EntryDraftUpdateSerializer(serializers.ModelSerializer):
    """EntryDraft serializer for updates (only content can be updated)"""

    class Meta:
        model = EntryDraft
        fields = ["content"]

    def update(self, instance, validated_data):
        # Only allow updating content for unpublished drafts
        if instance.is_published:
            raise serializers.ValidationError("Cannot update published drafts.")

        # Check if content has changed
        old_content = instance.content
        new_content = validated_data.get('content', old_content)
        
        # If content has changed, clear approvals and requested reviewers
        if old_content != new_content:
            instance.clear_approvals()

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
    perspective = PerspectiveSerializer(read_only=True)
    active_draft = EntryDraftListSerializer(read_only=True)
    can_user_endorse = serializers.SerializerMethodField()
    can_user_edit = serializers.SerializerMethodField()

    class Meta:
        model = Entry
        fields = [
            "id",
            "term",
            "perspective",
            "active_draft",
            "is_official",
            "can_user_endorse",
            "can_user_edit",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_can_user_endorse(self, obj):
        """Check if current user can endorse this entry"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        
        # Staff can always endorse
        if request.user.is_staff:
            return True
        
        # Perspective curators can endorse entries in their perspective
        return request.user.is_perspective_curator_for(obj.perspective.id)

    def get_can_user_edit(self, obj):
        """Check if current user can edit this entry"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        
        # Staff can always edit
        if request.user.is_staff:
            return True
        
        # Perspective curators can edit entries in their perspective
        return request.user.is_perspective_curator_for(obj.perspective.id)


class EntryCreateSerializer(serializers.ModelSerializer):
    """Entry serializer for creation (uses IDs)"""

    class Meta:
        model = Entry
        fields = ["id", "term", "perspective", "is_official"]

    def create(self, validated_data):
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            validated_data["created_by"] = request.user
        return super().create(validated_data)


class EntryDraftReviewSerializer(serializers.ModelSerializer):
    """EntryDraft serializer with expanded entry data for review"""

    author = UserSerializer(read_only=True)
    approvers = UserSerializer(many=True, read_only=True)
    requested_reviewers = UserSerializer(many=True, read_only=True)
    entry = EntryListSerializer(read_only=True)
    is_approved = serializers.BooleanField(read_only=True)
    approval_count = serializers.IntegerField(read_only=True)
    is_published = serializers.BooleanField(read_only=True)
    replaces_draft = serializers.SerializerMethodField()
    can_approve_by_current_user = serializers.SerializerMethodField()
    approval_status_for_user = serializers.SerializerMethodField()
    user_has_approved = serializers.SerializerMethodField()
    remaining_approvals = serializers.SerializerMethodField()
    approval_percentage = serializers.SerializerMethodField()

    class Meta:
        model = EntryDraft
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
            "replaces_draft",
            "can_approve_by_current_user",
            "approval_status_for_user",
            "user_has_approved",
            "remaining_approvals",
            "approval_percentage",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["timestamp", "created_at", "updated_at"]

    def get_replaces_draft(self, obj):
        """Get the currently active draft that this draft would replace"""
        if obj.entry.active_draft and obj.entry.active_draft.id != obj.id:
            return EntryDraftListSerializer(obj.entry.active_draft).data
        return None

    def get_can_approve_by_current_user(self, obj):
        """Check if current user can approve this draft"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        
        # Cannot approve own drafts
        if obj.author.id == request.user.id:
            return False
        
        # Cannot approve if already approved this draft
        if obj.approvers.filter(pk=request.user.pk).exists():
            return False
        
        # Can approve if status is pending
        return not obj.is_approved

    def get_approval_status_for_user(self, obj):
        """Get approval status from current user's perspective"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 'unknown'
        
        if obj.author.id == request.user.id:
            return 'own_draft'
        
        if obj.approvers.filter(pk=request.user.pk).exists():
            return 'already_approved'
        
        if obj.is_approved:
            return 'already_approved_by_others'
        
        return 'can_approve'

    def get_user_has_approved(self, obj):
        """Check if current user has already approved this draft"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.approvers.filter(pk=request.user.pk).exists()

    def get_remaining_approvals(self, obj):
        """Calculate remaining approvals needed"""
        from django.conf import settings
        return max(0, settings.MIN_APPROVALS - obj.approval_count)

    def get_approval_percentage(self, obj):
        """Calculate approval percentage for progress indicators"""
        from django.conf import settings
        if settings.MIN_APPROVALS == 0:
            return 100
        return min(100, (obj.approval_count / settings.MIN_APPROVALS) * 100)


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


# PerspectiveCurator serializers
class PerspectiveCuratorSerializer(serializers.ModelSerializer):
    """PerspectiveCurator serializer"""

    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source="user", write_only=True
    )
    perspective = PerspectiveSerializer(read_only=True)
    perspective_id = serializers.PrimaryKeyRelatedField(
        queryset=Perspective.objects.all(), source="perspective", write_only=True
    )
    assigned_by = UserSerializer(read_only=True)

    class Meta:
        model = PerspectiveCurator
        fields = [
            "id",
            "user",
            "user_id",
            "perspective",
            "perspective_id",
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
