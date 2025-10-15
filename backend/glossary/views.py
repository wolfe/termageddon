from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.conf import settings
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from glossary.models import (
    Comment,
    Perspective,
    PerspectiveCurator,
    Entry,
    EntryDraft,
    Term,
)
from glossary.serializers import (
    CommentCreateSerializer,
    CommentListSerializer,
    PerspectiveCuratorSerializer,
    PerspectiveSerializer,
    EntryCreateSerializer,
    EntryListSerializer,
    EntryUpdateSerializer,
    EntryDraftCreateSerializer,
    EntryDraftListSerializer,
    EntryDraftReviewSerializer,
    EntryDraftUpdateSerializer,
    TermSerializer,
)


# Custom permissions
class IsStaffOrReadOnly(IsAuthenticated):
    """Allow read-only for authenticated users, write for staff"""

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        if request.method in ["GET", "HEAD", "OPTIONS"]:
            return True
        return request.user.is_staff


class IsPerspectiveCuratorOrStaff(IsAuthenticated):
    """Allow perspective curators or staff"""

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return (
            request.user.is_staff
            or PerspectiveCurator.objects.filter(user=request.user).exists()
        )


class PerspectiveViewSet(viewsets.ModelViewSet):
    """ViewSet for Perspective model"""

    queryset = Perspective.objects.all()
    serializer_class = PerspectiveSerializer
    permission_classes = [IsStaffOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "name_normalized", "created_at"]
    ordering = ["name_normalized"]


class TermViewSet(viewsets.ModelViewSet):
    """ViewSet for Term model"""

    queryset = Term.objects.all()
    serializer_class = TermSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["is_official"]
    search_fields = ["text", "text_normalized"]
    ordering_fields = ["text", "text_normalized", "created_at"]
    ordering = ["text_normalized"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        # Only staff can update is_official
        if (
            "is_official" in serializer.validated_data
            and not self.request.user.is_staff
        ):
            raise ValidationError("Only staff can update the is_official flag.")
        serializer.save(updated_by=self.request.user)


class EntryViewSet(viewsets.ModelViewSet):
    """ViewSet for Entry model"""

    queryset = Entry.objects.select_related(
        "term", "perspective", "active_draft"
    ).prefetch_related("active_draft__author", "active_draft__approvers")
    permission_classes = [IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["perspective", "is_official"]
    search_fields = ["term__text", "term__text_normalized"]
    ordering_fields = ["term__text", "term__text_normalized", "created_at", "updated_at"]
    ordering = ["term__text_normalized"]

    def get_queryset(self):
        """Override queryset to handle additional filtering"""
        queryset = super().get_queryset()
        
        # Only show entries with published drafts (approved and published)
        queryset = queryset.filter(
            active_draft__isnull=False,
            active_draft__is_published=True
        )
        
        # Handle author filtering
        author_id = self.request.query_params.get('author')
        if author_id:
            queryset = queryset.filter(active_draft__author_id=author_id)
        
        # Handle date range filtering
        created_after = self.request.query_params.get('created_after')
        if created_after:
            queryset = queryset.filter(created_at__gte=created_after)
        
        created_before = self.request.query_params.get('created_before')
        if created_before:
            queryset = queryset.filter(created_at__lte=created_before)
        
        return queryset

    def get_serializer_class(self):
        if self.action in ["create"]:
            return EntryCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return EntryUpdateSerializer
        return EntryListSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    @action(detail=True, methods=["post"], permission_classes=[IsPerspectiveCuratorOrStaff])
    def endorse(self, request, pk=None):
        """Endorse the active draft of an entry (requires perspective curator or staff)"""
        entry = self.get_object()

        # Check if user is perspective curator for this entry's perspective or is staff
        if not request.user.is_staff and not request.user.is_perspective_curator_for(
            entry.perspective.id
        ):
            return Response(
                {
                    "detail": "You must be a perspective curator or staff to endorse definitions."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Check if there's an active draft to endorse
        if not entry.active_draft:
            return Response(
                {"detail": "No active draft to endorse."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if already endorsed
        if entry.active_draft.is_endorsed:
            return Response(
                {"detail": "This draft is already endorsed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Endorse the draft
        from django.utils import timezone
        entry.active_draft.endorsed_by = request.user
        entry.active_draft.endorsed_at = timezone.now()
        entry.active_draft.save()

        serializer = self.get_serializer(entry)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def grouped_by_term(self, request):
        """Get entries grouped by term for simplified frontend display"""
        queryset = self.get_queryset()
        
        # Apply same filtering as list view
        queryset = self.filter_queryset(queryset)
        
        # Group entries by term
        grouped_entries = {}
        for entry in queryset:
            term_id = entry.term.id
            if term_id not in grouped_entries:
                grouped_entries[term_id] = {
                    'term': {
                        'id': entry.term.id,
                        'text': entry.term.text,
                        'text_normalized': entry.term.text_normalized,
                        'is_official': entry.term.is_official,
                    },
                    'entries': []
                }
            grouped_entries[term_id]['entries'].append(entry)
        
        # Convert to list format for easier frontend consumption
        result = []
        for term_data in grouped_entries.values():
            serializer = self.get_serializer(term_data['entries'], many=True)
            result.append({
                'term': term_data['term'],
                'entries': serializer.data
            })
        
        return Response(result)

    @action(detail=False, methods=["post"])
    def create_with_term(self, request):
        """Create a term and entry atomically in a single request"""
        from django.db import transaction
        
        term_text = request.data.get('term_text')
        perspective_id = request.data.get('perspective_id')
        is_official = request.data.get('is_official', False)
        
        if not term_text or not perspective_id:
            return Response(
                {"detail": "term_text and perspective_id are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        try:
            with transaction.atomic():
                # Create the term
                term = Term.objects.create(
                    text=term_text,
                    is_official=is_official,
                    created_by=request.user
                )
                
                # Create the entry
                entry = Entry.objects.create(
                    term=term,
                    perspective_id=perspective_id,
                    is_official=is_official,
                    created_by=request.user
                )
                
                # Return the created entry with full serialization
                serializer = self.get_serializer(entry)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
                
        except ValidationError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"detail": f"Failed to create term and entry: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class EntryDraftViewSet(viewsets.ModelViewSet):
    """ViewSet for EntryDraft model"""

    queryset = EntryDraft.objects.select_related("entry", "author").prefetch_related(
        "approvers"
    )
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["entry", "author"]
    ordering_fields = ["timestamp"]
    ordering = ["-timestamp"]
    http_method_names = [
        "get",
        "post",
        "patch",
        "put",
        "head",
        "options",
    ]  # Allow updates

    def get_queryset(self):
        """Override queryset to handle expansion and custom filtering"""
        queryset = super().get_queryset()

        # Handle is_approved filtering manually since it's a property
        is_approved = self.request.query_params.get("is_approved")
        if is_approved is not None:
            if is_approved.lower() == "true":
                # Filter for approved drafts (approval_count >= MIN_APPROVALS)
                from django.db.models import Count

                queryset = queryset.annotate(
                    approval_count_annotated=Count("approvers")
                ).filter(approval_count_annotated__gte=settings.MIN_APPROVALS)
            elif is_approved.lower() == "false":
                # Filter for unapproved drafts (approval_count < MIN_APPROVALS)
                from django.db.models import Count

                queryset = queryset.annotate(
                    approval_count_annotated=Count("approvers")
                ).filter(approval_count_annotated__lt=settings.MIN_APPROVALS)

        # Handle search parameter for full-text search
        search = self.request.query_params.get("search")
        if search:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(entry__term__text__icontains=search) |
                Q(entry__term__text_normalized__icontains=search) |
                Q(entry__perspective__name__icontains=search) |
                Q(entry__perspective__name_normalized__icontains=search) |
                Q(author__username__icontains=search) |
                Q(author__first_name__icontains=search) |
                Q(author__last_name__icontains=search) |
                Q(content__icontains=search)
            )

        # Handle eligibility filtering for current user
        eligibility = self.request.query_params.get("eligibility")
        show_all = self.request.query_params.get("show_all", "false").lower() == "true"
        
        # Apply eligibility filtering when specified
        # Special case: requested_or_approved with show_all=true ignores eligibility filtering
        if eligibility and self.request.user.is_authenticated and not (eligibility == "requested_or_approved" and show_all):
            from django.db.models import Q, Count
            
            if eligibility == "can_approve":
                # Drafts the user can approve (not own, not already approved by them, not fully approved)
                queryset = queryset.annotate(
                    approval_count_annotated=Count("approvers")
                ).filter(
                    ~Q(author=self.request.user),  # Not own drafts
                    ~Q(approvers=self.request.user),  # Not already approved by user
                    approval_count_annotated__lt=settings.MIN_APPROVALS  # Not approved yet
                )
            elif eligibility == "requested_or_approved":
                # Drafts the user was requested to review OR has already approved
                queryset = queryset.filter(
                    Q(requested_reviewers=self.request.user) | Q(approvers=self.request.user)
                ).distinct()
            elif eligibility == "own":
                # User's own drafts - only show latest draft per entry
                from django.db.models import Max
                queryset = queryset.filter(author=self.request.user)
                
                # Get the latest timestamp per entry for this user's drafts
                latest_timestamps = (
                    queryset.values('entry')
                    .annotate(latest_timestamp=Max('timestamp'))
                    .values_list('entry', 'latest_timestamp')
                )
                
                # Filter to only include drafts with the latest timestamp for each entry
                from django.db.models import Q
                latest_filter = Q()
                for entry_id, latest_timestamp in latest_timestamps:
                    latest_filter |= Q(entry_id=entry_id, timestamp=latest_timestamp)
                
                queryset = queryset.filter(latest_filter)
            elif eligibility == "already_approved":
                # Drafts already approved by user
                queryset = queryset.filter(approvers=self.request.user)
            elif eligibility == "all_except_own":
                # All drafts except user's own (for review page "show all")
                queryset = queryset.filter(~Q(author=self.request.user))

        # Handle show_all parameter for review filtering
        # Only apply filtering for list actions, not detail actions (like approve)
        
        # Always exclude published drafts from review (they're not drafts anymore)
        if self.action in ["list", "retrieve"]:
            queryset = queryset.filter(is_published=False)
        
        # Apply additional filtering when show_all is false, but respect eligibility parameter
        if (
            not show_all
            and self.request.user.is_authenticated
            and self.action in ["list", "retrieve"]
            and not eligibility  # Only apply default filtering if no specific eligibility is requested
        ):
            # Show only drafts the user should see:
            # 1. Drafts they authored
            # 2. Drafts they were requested to review
            # 3. Drafts for terms they have authored before
            from django.db.models import Q, Exists, OuterRef

            # Get terms the user has authored drafts for
            user_authored_terms = (
                EntryDraft.objects.filter(author=self.request.user, is_deleted=False)
                .values_list("entry__term", flat=True)
                .distinct()
            )

            queryset = queryset.filter(
                Q(author=self.request.user)  # Own drafts
                | Q(requested_reviewers=self.request.user)  # Requested to review
                | Q(entry__term__in=user_authored_terms)  # Related terms
            ).distinct()

        # Check if expand parameter is present
        expand = self.request.query_params.get("expand", "")
        if "entry" in expand:
            # Include entry with term and perspective for review
            queryset = queryset.select_related(
                "entry__term", "entry__perspective", "entry__active_draft", "replaces_draft", "replaces_draft__author"
            ).prefetch_related(
                "entry__active_draft__author", "entry__active_draft__approvers", "replaces_draft__approvers", "replaces_draft__requested_reviewers"
            )

        return queryset

    def get_serializer_class(self):
        if self.action == "create":
            return EntryDraftCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return EntryDraftUpdateSerializer

        # Use review serializer if expand parameter includes entry
        expand = self.request.query_params.get("expand", "")
        if "entry" in expand:
            return EntryDraftReviewSerializer

        return EntryDraftListSerializer

    def perform_create(self, serializer):
        # Set replaces_draft to the latest draft for this entry
        entry = serializer.validated_data['entry']
        latest_draft = EntryDraft.objects.filter(
            entry=entry,
            is_deleted=False
        ).order_by('-timestamp').first()
        
        if latest_draft:
            serializer.save(
                author=self.request.user, 
                created_by=self.request.user,
                replaces_draft=latest_draft
            )
        else:
            serializer.save(author=self.request.user, created_by=self.request.user)

    def update(self, request, *args, **kwargs):
        """Update an unpublished draft (only by author)"""
        draft = self.get_object()

        # Only allow updating unpublished drafts by the author
        if draft.is_published:
            return Response(
                {"detail": "Cannot update published drafts."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if draft.author != request.user:
            return Response(
                {"detail": "You can only update your own drafts."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        """Partial update an unpublished draft (only by author)"""
        draft = self.get_object()

        # Only allow updating unpublished drafts by the author
        if draft.is_published:
            return Response(
                {"detail": "Cannot update published drafts."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if draft.author != request.user:
            return Response(
                {"detail": "You can only update your own drafts."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().partial_update(request, *args, **kwargs)

    def perform_update(self, serializer):
        """Save the updated draft"""
        serializer.save(updated_by=self.request.user)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """Approve a draft (any authenticated user except author)"""
        draft = self.get_object()

        try:
            draft.approve(request.user)
            serializer = self.get_serializer(draft)
            return Response(serializer.data)
        except ValidationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def request_review(self, request, pk=None):
        """Request specific users to review this draft"""
        draft = self.get_object()
        reviewer_ids = request.data.get("reviewer_ids", [])

        try:
            reviewers = User.objects.filter(id__in=reviewer_ids)
            draft.request_review(request.user, reviewers)
            serializer = self.get_serializer(draft)
            return Response(serializer.data)
        except ValidationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        """Publish an approved draft"""
        draft = self.get_object()

        try:
            draft.publish(request.user)
            serializer = self.get_serializer(draft)
            return Response(serializer.data)
        except ValidationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"])
    def history(self, request):
        """Get draft history for an entry"""
        entry_id = request.query_params.get('entry')
        if not entry_id:
            return Response(
                {"detail": "entry parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            drafts = EntryDraft.objects.filter(
                entry_id=entry_id,
                is_deleted=False
            ).select_related(
                'author', 'entry__term', 'entry__perspective'
            ).prefetch_related(
                'approvers', 'requested_reviewers'
            ).order_by('-timestamp')
            
            serializer = self.get_serializer(drafts, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {"detail": f"Failed to get draft history: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CommentViewSet(viewsets.ModelViewSet):
    """ViewSet for Comment model"""

    queryset = Comment.objects.select_related("author", "parent").prefetch_related(
        "replies"
    )
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["content_type", "object_id", "is_resolved", "parent"]
    ordering_fields = ["created_at"]
    ordering = ["created_at"]

    def get_serializer_class(self):
        if self.action == "create":
            return CommentCreateSerializer
        return CommentListSerializer

    def create(self, request, *args, **kwargs):
        """Create comment and return with full author details"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Fetch the created comment with related author
        instance = Comment.objects.select_related('author').get(pk=serializer.instance.pk)
        
        # Return using CommentListSerializer to include nested author
        output_serializer = CommentListSerializer(instance, context={'request': request})
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        serializer.save(author=self.request.user, created_by=self.request.user)

    def perform_update(self, serializer):
        # Users can only update their own comments
        if (
            self.get_object().author != self.request.user
            and not self.request.user.is_staff
        ):
            raise ValidationError("You can only update your own comments.")
        serializer.save(updated_by=self.request.user)

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        """Resolve a comment (staff or author, top-level only)"""
        comment = self.get_object()

        if comment.parent:
            return Response(
                {"detail": "Only top-level comments can be resolved."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not request.user.is_staff and comment.author != request.user:
            return Response(
                {"detail": "Only staff or the comment author can resolve comments."},
                status=status.HTTP_403_FORBIDDEN,
            )

        comment.is_resolved = True
        comment.save()

        serializer = self.get_serializer(comment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def unresolve(self, request, pk=None):
        """Unresolve a comment"""
        comment = self.get_object()

        if comment.parent:
            return Response(
                {"detail": "Only top-level comments can be unresolved."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not request.user.is_staff and comment.author != request.user:
            return Response(
                {"detail": "Only staff or the comment author can unresolve comments."},
                status=status.HTTP_403_FORBIDDEN,
            )

        comment.is_resolved = False
        comment.save()

        serializer = self.get_serializer(comment)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def with_draft_positions(self, request):
        """Get comments with draft position indicators for an entry"""
        entry_id = request.query_params.get('entry')
        if not entry_id:
            return Response(
                {"detail": "entry parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get all drafts for this entry ordered by timestamp
            drafts = EntryDraft.objects.filter(
                entry_id=entry_id,
                is_deleted=False
            ).order_by('-timestamp')
            
            # Get the last published draft
            last_published_draft = drafts.filter(is_published=True).first()
            
            # Get comments from drafts created after the last published version
            if last_published_draft:
                relevant_drafts = drafts.filter(timestamp__gte=last_published_draft.timestamp)
            else:
                relevant_drafts = drafts
            
            # Get comments from these drafts
            from django.contrib.contenttypes.models import ContentType
            draft_content_type = ContentType.objects.get_for_model(EntryDraft)
            
            comments = Comment.objects.filter(
                content_type=draft_content_type,
                object_id__in=relevant_drafts.values_list('id', flat=True),
                is_resolved=False,
                parent__isnull=True  # Only top-level comments
            ).select_related('author').prefetch_related('replies')
            
            # Calculate draft positions for each comment
            comments_with_positions = []
            for comment in comments:
                comment_draft = drafts.filter(id=comment.object_id).first()
                if comment_draft:
                    # Calculate position relative to latest draft
                    latest_draft = drafts.first()
                    if latest_draft and comment_draft.id == latest_draft.id:
                        draft_position = "current draft"
                    elif comment_draft.is_published:
                        draft_position = "published"
                    else:
                        # Count how many drafts ago this was
                        drafts_after = drafts.filter(timestamp__gt=comment_draft.timestamp).count()
                        if drafts_after == 0:
                            draft_position = "current draft"
                        else:
                            draft_position = f"{drafts_after} drafts ago"
                    
                    comment_data = self.get_serializer(comment).data
                    comment_data['draft_position'] = draft_position
                    comment_data['draft_id'] = comment_draft.id
                    comment_data['draft_timestamp'] = comment_draft.timestamp
                    comments_with_positions.append(comment_data)
            
            return Response(comments_with_positions)
        except Exception as e:
            return Response(
                {"detail": f"Failed to get comments with draft positions: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PerspectiveCuratorViewSet(viewsets.ModelViewSet):
    """ViewSet for PerspectiveCurator model (staff only)"""

    queryset = PerspectiveCurator.objects.select_related("user", "perspective", "assigned_by")
    serializer_class = PerspectiveCuratorSerializer
    permission_classes = [IsStaffOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["user", "perspective"]
    http_method_names = ["get", "post", "delete", "head", "options"]  # No update

    def perform_create(self, serializer):
        serializer.save(assigned_by=self.request.user, created_by=self.request.user)


# Auth endpoints
class CustomAuthToken(ObtainAuthToken):
    """Custom login endpoint that returns token and user info"""

    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        token, created = Token.objects.get_or_create(user=user)

        from glossary.serializers import UserDetailSerializer

        return Response({"token": token.key, "user": UserDetailSerializer(user).data})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Logout endpoint - deletes user's token"""
    try:
        request.user.auth_token.delete()
        return Response(
            {"detail": "Successfully logged out."}, status=status.HTTP_200_OK
        )
    except Exception as e:
        return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def current_user_view(request):
    """Get current user info with computed fields"""
    from glossary.serializers import UserDetailSerializer

    serializer = UserDetailSerializer(request.user)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def users_list_view(request):
    """Get list of all users for reviewer selection"""
    from glossary.serializers import UserSerializer

    users = User.objects.filter(is_active=True).order_by("first_name", "last_name")
    serializer = UserSerializer(users, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def system_config_view(request):
    """Get system configuration values"""
    return Response({
        "MIN_APPROVALS": settings.MIN_APPROVALS,
        "DEBUG": settings.DEBUG,
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_test_database(request):
    """Reset test database - only works in TEST_MODE"""
    import os
    from django.core.management import call_command
    
    if os.getenv('TEST_MODE') != 'true':
        return Response(
            {"error": "This endpoint only works in TEST_MODE"},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        # Call management command to reset database
        call_command('reset_test_db')
        return Response({"status": "Database reset complete"})
    except Exception as e:
        return Response(
            {"error": f"Failed to reset database: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
