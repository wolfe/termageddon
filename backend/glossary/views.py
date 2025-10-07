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
    Domain,
    DomainExpert,
    Entry,
    EntryVersion,
    Term,
)
from glossary.serializers import (
    CommentCreateSerializer,
    CommentListSerializer,
    DomainExpertSerializer,
    DomainSerializer,
    EntryCreateSerializer,
    EntryListSerializer,
    EntryUpdateSerializer,
    EntryVersionCreateSerializer,
    EntryVersionListSerializer,
    EntryVersionReviewSerializer,
    EntryVersionUpdateSerializer,
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


class IsDomainExpertOrStaff(IsAuthenticated):
    """Allow domain experts or staff"""

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return (
            request.user.is_staff
            or DomainExpert.objects.filter(user=request.user).exists()
        )


class DomainViewSet(viewsets.ModelViewSet):
    """ViewSet for Domain model"""

    queryset = Domain.objects.all()
    serializer_class = DomainSerializer
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
        "term", "domain", "active_version"
    ).prefetch_related("active_version__author", "active_version__approvers")
    permission_classes = [IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["domain", "is_official"]
    search_fields = ["term__text", "term__text_normalized"]
    ordering_fields = ["term__text", "term__text_normalized", "created_at", "updated_at"]
    ordering = ["term__text_normalized"]

    def get_queryset(self):
        """Override queryset to handle additional filtering"""
        queryset = super().get_queryset()
        
        # Only show entries with published versions (approved and published)
        queryset = queryset.filter(
            active_version__isnull=False,
            active_version__is_published=True
        )
        
        # Handle author filtering
        author_id = self.request.query_params.get('author')
        if author_id:
            queryset = queryset.filter(active_version__author_id=author_id)
        
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

    @action(detail=True, methods=["post"], permission_classes=[IsDomainExpertOrStaff])
    def endorse(self, request, pk=None):
        """Endorse the active version of an entry (requires domain expert or staff)"""
        entry = self.get_object()

        # Check if user is domain expert for this entry's domain or is staff
        if not request.user.is_staff and not request.user.is_domain_expert_for(
            entry.domain.id
        ):
            return Response(
                {
                    "detail": "You must be a domain expert or staff to endorse definitions."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Check if there's an active version to endorse
        if not entry.active_version:
            return Response(
                {"detail": "No active version to endorse."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if already endorsed
        if entry.active_version.is_endorsed:
            return Response(
                {"detail": "This version is already endorsed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Endorse the version
        from django.utils import timezone
        entry.active_version.endorsed_by = request.user
        entry.active_version.endorsed_at = timezone.now()
        entry.active_version.save()

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
        domain_id = request.data.get('domain_id')
        is_official = request.data.get('is_official', False)
        
        if not term_text or not domain_id:
            return Response(
                {"detail": "term_text and domain_id are required."},
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
                    domain_id=domain_id,
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


class EntryVersionViewSet(viewsets.ModelViewSet):
    """ViewSet for EntryVersion model"""

    queryset = EntryVersion.objects.select_related("entry", "author").prefetch_related(
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
                # Filter for approved versions (approval_count >= MIN_APPROVALS)
                from django.db.models import Count

                queryset = queryset.annotate(
                    approval_count_annotated=Count("approvers")
                ).filter(approval_count_annotated__gte=settings.MIN_APPROVALS)
            elif is_approved.lower() == "false":
                # Filter for unapproved versions (approval_count < MIN_APPROVALS)
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
                Q(entry__domain__name__icontains=search) |
                Q(entry__domain__name_normalized__icontains=search) |
                Q(author__username__icontains=search) |
                Q(author__first_name__icontains=search) |
                Q(author__last_name__icontains=search) |
                Q(content__icontains=search)
            )

        # Handle eligibility filtering for current user
        eligibility = self.request.query_params.get("eligibility")
        if eligibility and self.request.user.is_authenticated:
            from django.db.models import Q, Count
            
            if eligibility == "can_approve":
                # Versions the user can approve (not own, not already approved, not approved)
                queryset = queryset.annotate(
                    approval_count_annotated=Count("approvers")
                ).filter(
                    ~Q(author=self.request.user),  # Not own versions
                    ~Q(approvers=self.request.user),  # Not already approved by user
                    approval_count_annotated__lt=settings.MIN_APPROVALS  # Not approved yet
                )
            elif eligibility == "own":
                # User's own versions
                queryset = queryset.filter(author=self.request.user)
            elif eligibility == "already_approved":
                # Versions already approved by user
                queryset = queryset.filter(approvers=self.request.user)

        # Handle show_all parameter for review filtering
        # Only apply filtering for list actions, not detail actions (like approve)
        show_all = self.request.query_params.get("show_all", "false").lower() == "true"
        
        # By default, exclude published versions from review unless show_all is true
        if not show_all and self.action in ["list", "retrieve"]:
            queryset = queryset.filter(is_published=False)
        
        if (
            not show_all
            and self.request.user.is_authenticated
            and self.action in ["list", "retrieve"]
            and not eligibility  # Don't apply relevance filtering if eligibility is specified
        ):
            # Show only versions the user should see:
            # 1. Versions they authored
            # 2. Versions they were requested to review
            # 3. Versions for terms they have authored before
            from django.db.models import Q, Exists, OuterRef

            # Get terms the user has authored versions for
            user_authored_terms = (
                EntryVersion.objects.filter(author=self.request.user, is_deleted=False)
                .values_list("entry__term", flat=True)
                .distinct()
            )

            queryset = queryset.filter(
                Q(author=self.request.user)  # Own versions
                | Q(requested_reviewers=self.request.user)  # Requested to review
                | Q(entry__term__in=user_authored_terms)  # Related terms
            ).distinct()

        # Check if expand parameter is present
        expand = self.request.query_params.get("expand", "")
        if "entry" in expand:
            # Include entry with term and domain for review
            queryset = queryset.select_related(
                "entry__term", "entry__domain", "entry__active_version"
            ).prefetch_related(
                "entry__active_version__author", "entry__active_version__approvers"
            )

        return queryset

    def get_serializer_class(self):
        if self.action == "create":
            return EntryVersionCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return EntryVersionUpdateSerializer

        # Use review serializer if expand parameter includes entry
        expand = self.request.query_params.get("expand", "")
        if "entry" in expand:
            return EntryVersionReviewSerializer

        return EntryVersionListSerializer

    def perform_create(self, serializer):
        serializer.save(author=self.request.user, created_by=self.request.user)

    def update(self, request, *args, **kwargs):
        """Update an unpublished version (only by author)"""
        version = self.get_object()

        # Only allow updating unpublished versions by the author
        if version.is_published:
            return Response(
                {"detail": "Cannot update published versions."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if version.author != request.user:
            return Response(
                {"detail": "You can only update your own versions."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        """Partial update an unpublished version (only by author)"""
        version = self.get_object()

        # Only allow updating unpublished versions by the author
        if version.is_published:
            return Response(
                {"detail": "Cannot update published versions."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if version.author != request.user:
            return Response(
                {"detail": "You can only update your own versions."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().partial_update(request, *args, **kwargs)

    def perform_update(self, serializer):
        """Save the updated version"""
        serializer.save(updated_by=self.request.user)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """Approve a version (any authenticated user except author)"""
        version = self.get_object()

        try:
            version.approve(request.user)
            serializer = self.get_serializer(version)
            return Response(serializer.data)
        except ValidationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def request_review(self, request, pk=None):
        """Request specific users to review this version"""
        version = self.get_object()
        reviewer_ids = request.data.get("reviewer_ids", [])

        try:
            reviewers = User.objects.filter(id__in=reviewer_ids)
            version.request_review(request.user, reviewers)
            serializer = self.get_serializer(version)
            return Response(serializer.data)
        except ValidationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        """Publish an approved version"""
        version = self.get_object()

        try:
            version.publish(request.user)
            serializer = self.get_serializer(version)
            return Response(serializer.data)
        except ValidationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


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


class DomainExpertViewSet(viewsets.ModelViewSet):
    """ViewSet for DomainExpert model (staff only)"""

    queryset = DomainExpert.objects.select_related("user", "domain", "assigned_by")
    serializer_class = DomainExpertSerializer
    permission_classes = [IsStaffOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["user", "domain"]
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
