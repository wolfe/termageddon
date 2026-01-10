import html

from rest_framework import serializers

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.utils.html import strip_tags

from glossary.models import (
    Comment,
    Entry,
    EntryDraft,
    Notification,
    Perspective,
    PerspectiveCurator,
    Term,
)


class EntryDraftApprovalMixin:
    """Mixin providing common approval-related serializer methods for EntryDraft serializers"""

    def get_can_approve_by_current_user(self, obj):
        """Check if current user can approve this draft"""
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False

        # Cannot approve own drafts
        if obj.author.id == request.user.id:
            return False

        # Cannot approve if already approved this draft
        # Use prefetched approvers if available to avoid query
        if (
            hasattr(obj, "_prefetched_objects_cache")
            and "approvers" in obj._prefetched_objects_cache
        ):
            user_has_approved = any(
                approver.id == request.user.id for approver in obj.approvers.all()
            )
        else:
            user_has_approved = obj.approvers.filter(pk=request.user.pk).exists()
        if user_has_approved:
            return False

        # Can approve if status is pending
        return not obj.is_approved

    def get_approval_status_for_user(self, obj):
        """Get approval status from current user's perspective"""
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return "unknown"

        if obj.author.id == request.user.id:
            return "own_draft"

        # Use prefetched approvers if available to avoid query
        if (
            hasattr(obj, "_prefetched_objects_cache")
            and "approvers" in obj._prefetched_objects_cache
        ):
            user_has_approved = any(
                approver.id == request.user.id for approver in obj.approvers.all()
            )
        else:
            user_has_approved = obj.approvers.filter(pk=request.user.pk).exists()

        if user_has_approved:
            # User has approved this draft
            if obj.is_approved:
                return "already_approved_by_others"  # Draft is fully approved
            else:
                return "can_approve"  # User approved but draft needs more approvals

        if obj.is_approved:
            return "already_approved_by_others"

        return "can_approve"

    def get_user_has_approved(self, obj):
        """Check if current user has already approved this draft"""
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        # Use prefetched approvers if available to avoid query
        if (
            hasattr(obj, "_prefetched_objects_cache")
            and "approvers" in obj._prefetched_objects_cache
        ):
            return any(
                approver.id == request.user.id for approver in obj.approvers.all()
            )
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


# User serializers
class UserSerializer(serializers.ModelSerializer):
    """Basic user serializer"""

    is_test_user = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "is_staff",
            "is_test_user",
        ]

    def get_is_test_user(self, obj):
        """Get is_test_user from profile"""
        try:
            return obj.profile.is_test_user
        except AttributeError:
            return False


class UserDetailSerializer(serializers.ModelSerializer):
    """Detailed user serializer with perspective curator info"""

    perspective_curator_for = serializers.SerializerMethodField()
    is_test_user = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "is_staff",
            "perspective_curator_for",
            "is_test_user",
        ]

    def get_perspective_curator_for(self, obj):
        """Return list of perspective IDs the user is a curator for"""
        # Use prefetched curatorship if available to avoid query
        if (
            hasattr(obj, "_prefetched_objects_cache")
            and "curatorship" in obj._prefetched_objects_cache
        ):
            return [curator.perspective_id for curator in obj.curatorship.all()]
        return list(
            PerspectiveCurator.objects.filter(user=obj).values_list(
                "perspective_id", flat=True
            )
        )

    def get_is_test_user(self, obj):
        """Get is_test_user from profile"""
        try:
            return obj.profile.is_test_user
        except AttributeError:
            return False


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

    is_highlighted = serializers.SerializerMethodField()

    class Meta:
        model = Term
        fields = [
            "id",
            "text",
            "text_normalized",
            "is_official",
            "is_highlighted",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "text_normalized",
            "created_at",
            "updated_at",
            "is_highlighted",
        ]

    def get_is_highlighted(self, obj):
        """Check if term text starts with search query (case-insensitive)"""
        request = self.context.get("request")
        if not request:
            return False

        # Handle both DRF Request and Django WSGIRequest
        if hasattr(request, "query_params"):
            search_query = request.query_params.get("search", "").strip()
        else:
            search_query = request.GET.get("search", "").strip()

        if not search_query:
            return False

        # Case-insensitive prefix match
        return obj.text.lower().startswith(search_query.lower())


# EntryDraft serializers
class EntryDraftListSerializer(EntryDraftApprovalMixin, serializers.ModelSerializer):
    """EntryDraft serializer with nested user data"""

    author = UserSerializer(read_only=True)
    approvers = UserSerializer(many=True, read_only=True)
    requested_reviewers = UserSerializer(many=True, read_only=True)
    endorsed_by = UserSerializer(read_only=True)
    replaces_draft = serializers.PrimaryKeyRelatedField(read_only=True)
    is_approved = serializers.BooleanField(read_only=True)
    approval_count = serializers.IntegerField(read_only=True)
    is_published = serializers.BooleanField(read_only=True)
    is_endorsed = serializers.BooleanField(read_only=True)
    status = serializers.CharField(read_only=True)
    can_approve_by_current_user = serializers.SerializerMethodField()
    approval_status_for_user = serializers.SerializerMethodField()
    user_has_approved = serializers.SerializerMethodField()
    remaining_approvals = serializers.SerializerMethodField()
    approval_percentage = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()

    class Meta:
        model = EntryDraft
        fields = [
            "id",
            "entry",
            "content",
            "author",
            "approvers",
            "requested_reviewers",
            "endorsed_by",
            "endorsed_at",
            "published_at",
            "replaces_draft",
            "is_approved",
            "approval_count",
            "is_published",
            "is_endorsed",
            "status",
            "can_approve_by_current_user",
            "approval_status_for_user",
            "user_has_approved",
            "remaining_approvals",
            "approval_percentage",
            "comment_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_comment_count(self, obj):
        """Get the count of comments on this draft"""
        # Use prefetched comments if available to avoid query
        if (
            hasattr(obj, "_prefetched_objects_cache")
            and "comments" in obj._prefetched_objects_cache
        ):
            return len(obj.comments.all())
        return obj.comments.count()


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

    def create(self, validated_data):
        # Set author from request user
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            validated_data["author"] = request.user

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
        new_content = validated_data.get("content", old_content)

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
    active_draft = serializers.SerializerMethodField()
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
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False

        # Staff can always endorse
        if request.user.is_staff:
            return True

        # Perspective curators can endorse entries in their perspective
        return request.user.is_perspective_curator_for(obj.perspective.id)

    def get_active_draft(self, obj):
        """Get the latest published draft for this entry"""
        # Use prefetched published_drafts directly (prefetch is set up in EntryViewSet.get_queryset for list action)
        if hasattr(obj, "published_drafts") and obj.published_drafts:
            draft = obj.published_drafts[0]
        else:
            draft = None
        if draft:
            return EntryDraftListSerializer(draft).data
        return None

    def get_can_user_edit(self, obj):
        """Check if current user can edit this entry"""
        request = self.context.get("request")
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


class EntryDraftReviewSerializer(EntryDraftApprovalMixin, serializers.ModelSerializer):
    """EntryDraft serializer with expanded entry data for review"""

    author = UserSerializer(read_only=True)
    approvers = UserSerializer(many=True, read_only=True)
    requested_reviewers = UserSerializer(many=True, read_only=True)
    entry = EntryListSerializer(read_only=True)
    is_approved = serializers.BooleanField(read_only=True)
    approval_count = serializers.IntegerField(read_only=True)
    is_published = serializers.BooleanField(read_only=True)
    status = serializers.CharField(read_only=True)
    replaces_draft = serializers.PrimaryKeyRelatedField(read_only=True)
    can_approve_by_current_user = serializers.SerializerMethodField()
    approval_status_for_user = serializers.SerializerMethodField()
    user_has_approved = serializers.SerializerMethodField()
    remaining_approvals = serializers.SerializerMethodField()
    approval_percentage = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()

    class Meta:
        model = EntryDraft
        fields = [
            "id",
            "entry",
            "content",
            "author",
            "approvers",
            "requested_reviewers",
            "is_approved",
            "approval_count",
            "is_published",
            "published_at",
            "status",
            "replaces_draft",
            "can_approve_by_current_user",
            "approval_status_for_user",
            "user_has_approved",
            "remaining_approvals",
            "approval_percentage",
            "comment_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_comment_count(self, obj):
        """Get the count of comments on this draft"""
        # Use prefetched comments if available to avoid query
        if (
            hasattr(obj, "_prefetched_objects_cache")
            and "comments" in obj._prefetched_objects_cache
        ):
            return len(obj.comments.all())
        return obj.comments.count()


class EntryDetailSerializer(serializers.ModelSerializer):
    """Entry serializer for detailed retrieve operations with draft information"""

    term = TermSerializer(read_only=True)
    perspective = PerspectiveSerializer(read_only=True)
    active_draft = serializers.SerializerMethodField()
    all_drafts = serializers.SerializerMethodField()
    published_drafts = serializers.SerializerMethodField()
    unpublished_drafts = serializers.SerializerMethodField()
    can_user_endorse = serializers.SerializerMethodField()
    can_user_edit = serializers.SerializerMethodField()

    class Meta:
        model = Entry
        fields = [
            "id",
            "term",
            "perspective",
            "active_draft",
            "all_drafts",
            "published_drafts",
            "unpublished_drafts",
            "is_official",
            "can_user_endorse",
            "can_user_edit",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_can_user_endorse(self, obj):
        """Check if current user can endorse this entry"""
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False

        # Staff can always endorse
        if request.user.is_staff:
            return True

        # Perspective curators can endorse entries in their perspective
        return request.user.is_perspective_curator_for(obj.perspective.id)

    def get_active_draft(self, obj):
        """Get the latest draft for this entry"""
        # Use prefetched published_drafts directly (prefetch is set up in EntryViewSet.get_queryset for retrieve action)
        if hasattr(obj, "published_drafts") and obj.published_drafts:
            draft = obj.published_drafts[0]
        else:
            draft = None
        if draft:
            return EntryDraftListSerializer(draft, context=self.context).data
        return None

    def get_all_drafts(self, obj):
        """Get all drafts for this entry"""
        # Use prefetched data if available to avoid N+1 queries
        if hasattr(obj, "all_drafts_list"):
            drafts = obj.all_drafts_list
        else:
            from glossary.models import EntryDraft

            drafts = (
                EntryDraft.objects.filter(entry=obj, is_deleted=False)
                .select_related("author", "endorsed_by")
                .prefetch_related("approvers", "requested_reviewers", "comments")
                .order_by("-created_at")
            )
        return EntryDraftListSerializer(drafts, many=True, context=self.context).data

    def get_published_drafts(self, obj):
        """Get published drafts for this entry"""
        all_drafts = self.get_all_drafts(obj)
        return [draft for draft in all_drafts if draft["is_published"]]

    def get_unpublished_drafts(self, obj):
        """Get unpublished drafts for this entry"""
        all_drafts = self.get_all_drafts(obj)
        return [draft for draft in all_drafts if not draft["is_published"]]

    def get_can_user_edit(self, obj):
        """Check if current user can edit this entry"""
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False

        # Staff can always edit
        if request.user.is_staff:
            return True

        # Perspective curators can edit entries in their perspective
        return request.user.is_perspective_curator_for(obj.perspective.id)


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
    draft_id = serializers.IntegerField(source="draft.id", read_only=True)
    mentioned_users = UserSerializer(many=True, read_only=True)
    reaction_count = serializers.SerializerMethodField()
    user_has_reacted = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            "id",
            "draft_id",
            "parent",
            "text",
            "author",
            "mentioned_users",
            "is_resolved",
            "replies",
            "reaction_count",
            "user_has_reacted",
            "created_at",
            "updated_at",
            "edited_at",
        ]
        read_only_fields = ["created_at", "updated_at", "edited_at"]

    def get_reaction_count(self, obj):
        """Get the count of reactions on this comment"""
        # Use annotated count if available to avoid query (for list views)
        if hasattr(obj, "reaction_count_annotated"):
            return obj.reaction_count_annotated
        # Fall back to prefetched reactions if available
        if (
            hasattr(obj, "_prefetched_objects_cache")
            and "reactions" in obj._prefetched_objects_cache
        ):
            return len(obj.reactions.all())
        # Last resort: query the database
        return obj.reactions.count()

    def get_user_has_reacted(self, obj):
        """Check if current user has reacted to this comment"""
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        # Use prefetched reactions if available (filter in Python to avoid query)
        if (
            hasattr(obj, "_prefetched_objects_cache")
            and "reactions" in obj._prefetched_objects_cache
        ):
            return any(
                reaction.user_id == request.user.id for reaction in obj.reactions.all()
            )
        # Fall back to database query if not prefetched
        return obj.reactions.filter(user=request.user).exists()

    def get_replies(self, obj):
        """Recursively serialize replies"""
        # Use prefetched replies if available to avoid query
        if (
            hasattr(obj, "_prefetched_objects_cache")
            and "replies" in obj._prefetched_objects_cache
        ):
            replies = obj.replies.all()
        else:
            replies = obj.replies.all()
        if replies:
            return CommentListSerializer(replies, many=True, context=self.context).data
        return []


class CommentCreateSerializer(serializers.ModelSerializer):
    """Comment serializer for creation"""

    draft_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Comment
        fields = [
            "id",
            "draft_id",
            "parent",
            "text",
            "is_resolved",
        ]

    def create(self, validated_data):
        from glossary.models import EntryDraft

        request = self.context.get("request")
        draft_id = validated_data.pop("draft_id")
        text = validated_data.get("text", "")

        try:
            draft = EntryDraft.objects.get(id=draft_id)
        except EntryDraft.DoesNotExist:
            raise serializers.ValidationError({"draft_id": "Draft not found."})
        validated_data["draft"] = draft

        if request and hasattr(request, "user"):
            validated_data["author"] = request.user

        # Create comment first
        comment = super().create(validated_data)

        # Parse @mentions and add to mentioned_users
        mentioned_users = self._parse_mentions(text)
        if mentioned_users:
            comment.mentioned_users.set(mentioned_users)

        return comment

    def _parse_mentions(self, text: str) -> list:
        """Parse @mentions from comment text and return list of User objects"""
        import re

        from glossary.models import User

        # Pattern to match @username or @FirstName LastName
        # Matches @ followed by word characters or spaces
        pattern = r"@(\w+(?:\s+\w+)*)"
        matches = re.findall(pattern, text)

        if not matches:
            return []

        mentioned_users = []
        for match in matches:
            # Try to find user by username first
            user = User.objects.filter(username=match).first()

            # If not found, try to find by full name (first_name + last_name)
            if not user:
                name_parts = match.split()
                if len(name_parts) >= 2:
                    user = User.objects.filter(
                        first_name__iexact=name_parts[0],
                        last_name__iexact=" ".join(name_parts[1:]),
                    ).first()
                elif len(name_parts) == 1:
                    # Try first name or last name
                    user = (
                        User.objects.filter(first_name__iexact=name_parts[0]).first()
                        or User.objects.filter(last_name__iexact=name_parts[0]).first()
                    )

            if user:
                mentioned_users.append(user)

        # Remove duplicates while preserving order
        seen = set()
        unique_users = []
        for user in mentioned_users:
            if user.id not in seen:
                seen.add(user.id)
                unique_users.append(user)

        return unique_users


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


# Notification serializers
class NotificationSerializer(serializers.ModelSerializer):
    """Notification serializer"""

    class Meta:
        model = Notification
        fields = [
            "id",
            "type",
            "message",
            "related_draft",
            "related_comment",
            "is_read",
            "created_at",
        ]
        read_only_fields = ["created_at"]
