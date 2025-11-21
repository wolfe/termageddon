from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from django.conf import settings
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError

from glossary.models import (
    Comment,
    Entry,
    EntryDraft,
    Perspective,
    PerspectiveCurator,
    Term,
)
from glossary.serializers import (
    CommentCreateSerializer,
    CommentListSerializer,
    EntryCreateSerializer,
    EntryDetailSerializer,
    EntryDraftCreateSerializer,
    EntryDraftListSerializer,
    EntryDraftReviewSerializer,
    EntryDraftUpdateSerializer,
    EntryListSerializer,
    EntryUpdateSerializer,
    PerspectiveCuratorSerializer,
    PerspectiveSerializer,
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

    def get_queryset(self):
        """Override to ensure ALL terms are returned, including those with only drafts"""
        # Start with all terms
        queryset = Term.objects.all()

        # Apply any DRF filtering (search, ordering, etc.)
        queryset = self.filter_queryset(queryset)

        return queryset

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

    queryset = Entry.objects.select_related("term", "perspective")
    serializer_class = EntryListSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["term", "perspective", "is_official"]
    search_fields = ["term__text", "term__text_normalized"]
    ordering_fields = [
        "term__text",
        "term__text_normalized",
        "created_at",
        "updated_at",
    ]
    ordering = ["term__text_normalized"]

    def get_queryset(self):
        """Override queryset to handle additional filtering"""
        queryset = super().get_queryset()

        # For list view, only show entries with published drafts
        if self.action == "list":
            queryset = queryset.filter(drafts__is_published=True).distinct()

        # Handle term_text filtering (exact match, case-insensitive)
        term_text = self.request.query_params.get("term_text")
        if term_text:
            from unidecode import unidecode

            term_text_normalized = unidecode(term_text.lower())
            queryset = queryset.filter(term__text_normalized=term_text_normalized)

        # Handle author filtering
        author_id = self.request.query_params.get("author")
        if author_id:
            queryset = queryset.filter(drafts__author_id=author_id).distinct()

        # Handle date range filtering
        created_after = self.request.query_params.get("created_after")
        if created_after:
            queryset = queryset.filter(created_at__gte=created_after)

        created_before = self.request.query_params.get("created_before")
        if created_before:
            queryset = queryset.filter(created_at__lte=created_before)

        return queryset

    def get_serializer_class(self):
        """Select serializer based on action"""
        if self.action == "retrieve":
            return EntryDetailSerializer
        elif self.action in ["create"]:
            return EntryCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return EntryUpdateSerializer
        return EntryListSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        """Enhanced retrieve to include all draft information"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(
        detail=True, methods=["post"], permission_classes=[IsPerspectiveCuratorOrStaff]
    )
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

        # Check if there's a published draft to endorse
        published_draft = entry.get_latest_published_draft()
        if not published_draft:
            return Response(
                {"detail": "No published draft to endorse."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if already endorsed
        if published_draft.is_endorsed:
            return Response(
                {"detail": "This draft is already endorsed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Endorse the draft
        from django.utils import timezone

        published_draft.endorsed_by = request.user
        published_draft.endorsed_at = timezone.now()
        published_draft.save()

        serializer = self.get_serializer(entry)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="grouped-by-term")
    def grouped_by_term(self, request):
        """Get entries grouped by term for simplified frontend display (paginated)"""
        from rest_framework.pagination import PageNumberPagination

        # Start with base queryset (no published filter yet)
        queryset = Entry.objects.select_related("term", "perspective")

        # Apply DRF filtering first
        queryset = self.filter_queryset(queryset)

        # Then apply published-only filter for glossary display
        queryset = queryset.filter(drafts__is_published=True).distinct()

        # Group entries by term
        grouped_entries = {}
        for entry in queryset:
            term_id = entry.term.id
            if term_id not in grouped_entries:
                grouped_entries[term_id] = {
                    "term": {
                        "id": entry.term.id,
                        "text": entry.term.text,
                        "text_normalized": entry.term.text_normalized,
                        "is_official": entry.term.is_official,
                    },
                    "entries": [],
                }
            grouped_entries[term_id]["entries"].append(entry)

        # Convert to list format for easier frontend consumption
        result = []
        for term_data in grouped_entries.values():
            serializer = self.get_serializer(term_data["entries"], many=True)
            result.append({"term": term_data["term"], "entries": serializer.data})

        # Apply pagination to the grouped results
        paginator = PageNumberPagination()
        paginator.page_size = 50  # Same as default PAGE_SIZE
        paginated_result = paginator.paginate_queryset(result, request)
        return paginator.get_paginated_response(paginated_result)

    @action(detail=False, methods=["post"], url_path="create-with-term")
    def create_with_term(self, request):
        """Create a term and entry atomically in a single request"""
        from django.db import transaction

        term_text = request.data.get("term_text")
        perspective_id = request.data.get("perspective_id")
        is_official = request.data.get("is_official", False)

        if not term_text or not perspective_id:
            return Response(
                {"detail": "term_text and perspective_id are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate term text length
        if len(term_text) > 255:
            return Response(
                {"detail": "Term text cannot exceed 255 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                # Create the term
                term = Term.objects.create(
                    text=term_text, is_official=is_official, created_by=request.user
                )

                # Create the entry
                entry = Entry.objects.create(
                    term=term,
                    perspective_id=perspective_id,
                    is_official=is_official,
                    created_by=request.user,
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

    @action(detail=False, methods=["post"], url_path="lookup-or-create-entry")
    def lookup_or_create_entry(self, request):  # noqa: C901
        """
        Look up or create an entry for term+perspective.
        Returns: {
            'entry_id': int or None,
            'has_published_draft': bool,
            'has_unpublished_draft': bool,
            'unpublished_draft_author_id': int or None,
            'is_new': bool,
            'term': {...},
            'perspective': {...},
            'entry': {...} or None
        }
        """
        term_id = request.data.get("term_id")
        term_text = request.data.get("term_text")
        perspective_id = request.data.get("perspective_id")

        if not perspective_id:
            return Response(
                {"detail": "perspective_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not term_id and not term_text:
            return Response(
                {"detail": "Either term_id or term_text is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Get or create term
            if term_id:
                try:
                    term = Term.objects.get(id=term_id)
                except Term.DoesNotExist:
                    return Response(
                        {"detail": "Term not found."},
                        status=status.HTTP_404_NOT_FOUND,
                    )
            else:
                # Validate term text length
                if len(term_text) > 255:
                    return Response(
                        {"detail": "Term text cannot exceed 255 characters."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Look up existing term by text, or create new one
                try:
                    term = Term.objects.get(text=term_text)
                except Term.DoesNotExist:
                    # Create new term
                    term = Term.objects.create(text=term_text, created_by=request.user)

            # Get perspective
            try:
                perspective = Perspective.objects.get(id=perspective_id)
            except Perspective.DoesNotExist:
                return Response(
                    {"detail": "Perspective not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Check if entry exists
            try:
                entry = Entry.objects.select_related("term", "perspective").get(
                    term=term, perspective=perspective
                )
                is_new = False
            except Entry.DoesNotExist:
                # Create new entry
                entry = Entry.objects.create(
                    term=term, perspective=perspective, created_by=request.user
                )
                is_new = True

            # Check draft status
            has_published_draft = False
            has_unpublished_draft = False
            unpublished_draft_author_id = None

            latest_draft = entry.get_latest_draft()
            if latest_draft:
                if latest_draft.is_published:
                    has_published_draft = True
                else:
                    has_unpublished_draft = True
                    unpublished_draft_author_id = latest_draft.author.id

            # Serialize response
            from glossary.serializers import PerspectiveSerializer, TermSerializer

            response_data = {
                "entry_id": entry.id,
                "has_published_draft": has_published_draft,
                "has_unpublished_draft": has_unpublished_draft,
                "unpublished_draft_author_id": unpublished_draft_author_id,
                "is_new": is_new,
                "term": TermSerializer(term).data,
                "perspective": PerspectiveSerializer(perspective).data,
                "entry": self.get_serializer(entry).data if not is_new else None,
            }

            return Response(response_data)

        except Exception as e:
            return Response(
                {"detail": f"Failed to lookup or create entry: {str(e)}"},
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
    ordering_fields = [
        "entry__term__text_normalized",
        "timestamp",
        "updated_at",
        "published_at",
    ]
    ordering = ["-timestamp"]
    http_method_names = [
        "get",
        "post",
        "patch",
        "put",
        "delete",
        "head",
        "options",
    ]  # Allow updates

    def get_queryset(self):  # noqa: C901
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

        # Handle search parameter - only search terms
        search = self.request.query_params.get("search")
        if search:
            from django.db.models import Q

            queryset = queryset.filter(
                Q(entry__term__text__icontains=search)
                | Q(entry__term__text_normalized__icontains=search)
            )

        # Handle perspective filtering
        perspective_id = self.request.query_params.get("perspective")
        if perspective_id:
            queryset = queryset.filter(entry__perspective_id=perspective_id)

        # Handle eligibility filtering for current user
        eligibility = self.request.query_params.get("eligibility")
        show_all = self.request.query_params.get("show_all", "false").lower() == "true"

        # Apply eligibility filtering when specified
        # Special case: requested_or_approved with show_all=true ignores eligibility filtering
        if (
            eligibility
            and self.request.user.is_authenticated
            and not (eligibility == "requested_or_approved" and show_all)
        ):
            from django.db.models import Count, Q

            if eligibility == "can_approve":
                # Drafts the user can approve (not own, not already approved by them, not fully approved)
                queryset = queryset.annotate(
                    approval_count_annotated=Count("approvers")
                ).filter(
                    ~Q(author=self.request.user),  # Not own drafts
                    ~Q(approvers=self.request.user),  # Not already approved by user
                    approval_count_annotated__lt=settings.MIN_APPROVALS,  # Not approved yet
                )
            elif eligibility == "requested_or_approved":
                # Drafts the user was requested to review OR has already approved
                queryset = queryset.filter(
                    Q(requested_reviewers=self.request.user)
                    | Q(approvers=self.request.user)
                ).distinct()
            elif eligibility == "own":
                # User's own drafts - only show latest draft per entry
                from django.db.models import Max

                queryset = queryset.filter(author=self.request.user)

                # Get the latest timestamp per entry for this user's drafts
                latest_timestamps = (
                    queryset.values("entry")
                    .annotate(latest_timestamp=Max("timestamp"))
                    .values_list("entry", "latest_timestamp")
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
        # Only apply this filter for list actions, not for individual draft retrieval
        if self.action == "list":
            queryset = queryset.filter(is_published=False)

        # Apply additional filtering when show_all is false, but respect eligibility parameter
        # Only apply default filtering for list actions, not for individual draft retrieval
        if (
            not show_all
            and self.request.user.is_authenticated
            and self.action == "list"
            and not eligibility  # Only apply default filtering if no specific eligibility is requested
        ):
            # Show only drafts the user should see:
            # 1. Drafts they authored
            # 2. Drafts they were requested to review
            # 3. Drafts for terms they have authored before
            from django.db.models import Q

            # Get terms the user has authored drafts for
            user_authored_terms = (
                EntryDraft.objects.filter(author=self.request.user, is_deleted=False)
                .values_list("entry__term", flat=True)
                .distinct()
            )

            queryset = queryset.filter(
                Q(author=self.request.user)  # Own drafts
                | Q(requested_reviewers=self.request.user)  # Requested to review
                | Q(approvers=self.request.user)  # Already approved by user
                | Q(entry__term__in=user_authored_terms)  # Related terms
            ).distinct()

        # Check if expand parameter is present
        expand = self.request.query_params.get("expand", "")
        if "entry" in expand:
            # Include entry with term and perspective for review
            queryset = queryset.select_related(
                "entry__term",
                "entry__perspective",
                "replaces_draft",
                "replaces_draft__author",
            ).prefetch_related(
                "replaces_draft__approvers", "replaces_draft__requested_reviewers"
            )

        # Handle custom ordering for published_at with nulls last
        ordering = self.request.query_params.get("ordering")
        if ordering and "published_at" in ordering:
            from django.db.models import F

            if ordering.startswith("-"):
                # Descending: published drafts first, then unpublished
                queryset = queryset.order_by(F("published_at").desc(nulls_last=True))
            else:
                # Ascending: unpublished drafts first, then published
                queryset = queryset.order_by(F("published_at").asc(nulls_last=False))

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
        entry = serializer.validated_data["entry"]
        latest_draft = (
            EntryDraft.objects.filter(entry=entry, is_deleted=False)
            .order_by("-timestamp")
            .first()
        )

        if latest_draft:
            serializer.save(
                author=self.request.user,
                created_by=self.request.user,
                replaces_draft=latest_draft,
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

    def destroy(self, request, *args, **kwargs):
        """Delete a draft (only author can delete their own drafts)"""
        draft = self.get_object()

        # Check if user is the author of the draft
        if draft.author != request.user:
            return Response(
                {"detail": "You can only delete your own drafts."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Delete the draft
        self.perform_destroy(draft)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def retrieve(self, request, *args, **kwargs):
        """Enhanced retrieve to include full entry information"""
        instance = self.get_object()

        # Use review serializer if expand parameter includes entry
        expand = request.query_params.get("expand", "")
        if "entry" in expand:
            serializer = EntryDraftReviewSerializer(instance)
        else:
            serializer = self.get_serializer(instance)

        return Response(serializer.data)

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

    @action(detail=True, methods=["post"], url_path="request-review")
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
        """Get draft history for an entry (paginated)"""
        from rest_framework.pagination import PageNumberPagination

        entry_id = request.query_params.get("entry")
        if not entry_id:
            return Response(
                {"detail": "entry parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            drafts = (
                EntryDraft.objects.filter(entry_id=entry_id, is_deleted=False)
                .select_related("author", "entry__term", "entry__perspective")
                .prefetch_related("approvers", "requested_reviewers")
                .order_by("-timestamp")
            )

            # Apply pagination
            paginator = PageNumberPagination()
            paginator.page_size = 50
            paginated_drafts = paginator.paginate_queryset(drafts, request)
            serializer = self.get_serializer(paginated_drafts, many=True)
            return paginator.get_paginated_response(serializer.data)
        except Exception as e:
            return Response(
                {"detail": f"Failed to get draft history: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
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
        instance = Comment.objects.select_related("author").get(
            pk=serializer.instance.pk
        )

        # Return using CommentListSerializer to include nested author
        output_serializer = CommentListSerializer(
            instance, context={"request": request}
        )
        headers = self.get_success_headers(output_serializer.data)
        return Response(
            output_serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )

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

    def _get_relevant_drafts(self, entry_id):
        """Get drafts relevant for comment loading (after last published or all if none published)"""
        drafts = EntryDraft.objects.filter(
            entry_id=entry_id, is_deleted=False
        ).order_by("-timestamp")

        last_published_draft = drafts.filter(is_published=True).first()
        if last_published_draft:
            return drafts.filter(timestamp__gte=last_published_draft.timestamp)
        return drafts

    def _get_comment_ids(self, entry_id, relevant_drafts):
        """Get comment IDs from both drafts and entry"""
        from django.contrib.contenttypes.models import ContentType

        draft_content_type = ContentType.objects.get_for_model(EntryDraft)
        entry_content_type = ContentType.objects.get_for_model(Entry)

        # Get comments on drafts
        draft_comment_ids = list(
            Comment.objects.filter(
                content_type=draft_content_type,
                object_id__in=relevant_drafts.values_list("id", flat=True),
                is_resolved=False,
                parent__isnull=True,
            ).values_list("id", flat=True)
        )

        # Get comments on the entry itself
        entry_comment_ids = list(
            Comment.objects.filter(
                content_type=entry_content_type,
                object_id=entry_id,
                is_resolved=False,
                parent__isnull=True,
            ).values_list("id", flat=True)
        )

        return (
            draft_comment_ids + entry_comment_ids,
            draft_content_type,
            entry_content_type,
        )

    def _calculate_draft_comment_position(
        self, comment, comment_draft, drafts, latest_draft
    ):
        """Calculate draft position for a comment on a draft"""
        if latest_draft and comment_draft.id == latest_draft.id:
            return "current draft"
        if comment_draft.is_published:
            return "published"

        # Count how many drafts ago this was
        drafts_after = drafts.filter(timestamp__gt=comment_draft.timestamp).count()
        if drafts_after == 0:
            return "current draft"
        return f"{drafts_after} drafts ago"

    def _calculate_entry_comment_position(self, latest_draft):
        """Calculate draft position for a comment on an entry"""
        if not latest_draft:
            return "entry", None, None
        if latest_draft.is_published:
            return "published", latest_draft.id, latest_draft.timestamp
        return "current draft", latest_draft.id, latest_draft.timestamp

    def _process_draft_comment(self, comment, drafts, latest_draft, draft_content_type):
        """Process a comment that's on a draft"""
        comment_draft = drafts.filter(id=comment.object_id).first()
        if not comment_draft:
            return None

        draft_position = self._calculate_draft_comment_position(
            comment, comment_draft, drafts, latest_draft
        )
        comment_data = self.get_serializer(comment).data
        comment_data["draft_position"] = draft_position
        comment_data["draft_id"] = comment_draft.id
        comment_data["draft_timestamp"] = comment_draft.timestamp
        return comment_data

    def _process_entry_comment(self, comment, latest_draft):
        """Process a comment that's on an entry"""
        draft_position, draft_id, draft_timestamp = (
            self._calculate_entry_comment_position(latest_draft)
        )
        comment_data = self.get_serializer(comment).data
        comment_data["draft_position"] = draft_position
        comment_data["draft_id"] = draft_id
        comment_data["draft_timestamp"] = draft_timestamp
        return comment_data

    @action(detail=False, methods=["get"])
    def with_draft_positions(self, request):
        """Get comments with draft position indicators for an entry (paginated)"""
        from rest_framework.pagination import PageNumberPagination

        entry_id = request.query_params.get("entry")
        if not entry_id:
            return Response(
                {"detail": "entry parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            drafts = self._get_relevant_drafts(entry_id)
            all_comment_ids, draft_content_type, entry_content_type = (
                self._get_comment_ids(entry_id, drafts)
            )

            comments = (
                Comment.objects.filter(id__in=all_comment_ids)
                .select_related("author")
                .prefetch_related("replies")
                .order_by("-created_at")
            )

            comments_with_positions = []
            latest_draft = drafts.first() if drafts.exists() else None

            for comment in comments:
                if comment.content_type == draft_content_type:
                    comment_data = self._process_draft_comment(
                        comment, drafts, latest_draft, draft_content_type
                    )
                elif comment.content_type == entry_content_type:
                    comment_data = self._process_entry_comment(comment, latest_draft)
                else:
                    continue

                if comment_data:
                    comments_with_positions.append(comment_data)

            # Apply pagination to the processed comments
            paginator = PageNumberPagination()
            paginator.page_size = 50
            paginated_comments = paginator.paginate_queryset(
                comments_with_positions, request
            )
            return paginator.get_paginated_response(paginated_comments)
        except Exception as e:
            return Response(
                {"detail": f"Failed to get comments with draft positions: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class PerspectiveCuratorViewSet(viewsets.ModelViewSet):
    """ViewSet for PerspectiveCurator model (staff only)"""

    queryset = PerspectiveCurator.objects.select_related(
        "user", "perspective", "assigned_by"
    )
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


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def switch_test_user_view(request):  # noqa: C901
    """Switch to a test user account"""
    from glossary.serializers import UserDetailSerializer

    user_id = request.data.get("user_id")
    if not user_id:
        return Response(
            {"detail": "user_id is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {"detail": "Target user not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Validate current user is a test user
    try:
        if not request.user.profile.is_test_user:
            return Response(
                {"detail": "Only test users can switch accounts."},
                status=status.HTTP_403_FORBIDDEN,
            )
    except AttributeError:
        return Response(
            {"detail": "User profile not found."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate target user is a test user
    try:
        if not target_user.profile.is_test_user:
            return Response(
                {"detail": "Can only switch to test users."},
                status=status.HTTP_403_FORBIDDEN,
            )
    except AttributeError:
        return Response(
            {"detail": "Target user profile not found."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Delete current user's token
    try:
        request.user.auth_token.delete()
    except AttributeError:
        pass  # Token might not exist

    # Create/retrieve token for target user
    token, created = Token.objects.get_or_create(user=target_user)

    # Return new token and user data (same format as login)
    return Response(
        {"token": token.key, "user": UserDetailSerializer(target_user).data}
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def users_list_view(request):
    """Get list of all users for reviewer selection (paginated)"""
    from rest_framework.pagination import PageNumberPagination

    from glossary.serializers import UserSerializer

    users = User.objects.filter(is_active=True).order_by("first_name", "last_name")

    # Filter for test users only if requested
    test_users_only = request.query_params.get("test_users_only")
    if test_users_only and test_users_only.lower() == "true":
        users = users.filter(profile__is_test_user=True)

    # Apply pagination
    paginator = PageNumberPagination()
    paginator.page_size = 50
    paginated_users = paginator.paginate_queryset(users, request)
    serializer = UserSerializer(paginated_users, many=True)
    return paginator.get_paginated_response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def system_config_view(request):
    """Get system configuration values"""
    return Response(
        {
            "MIN_APPROVALS": settings.MIN_APPROVALS,
            "DEBUG": settings.DEBUG,
        }
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def reset_test_database(request):
    """Reset test database - only works in TEST_MODE"""
    import os

    from django.core.management import call_command

    if os.getenv("TEST_MODE") != "true":
        return Response(
            {"error": "This endpoint only works in TEST_MODE"},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        # Call management command to reset database
        call_command("reset_test_db")
        return Response({"status": "Database reset complete"})
    except Exception as e:
        return Response(
            {"error": f"Failed to reset database: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
