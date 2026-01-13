import logging

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
    Notification,
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
    NotificationSerializer,
    PerspectiveCuratorSerializer,
    PerspectiveSerializer,
    TermSerializer,
)


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check_view(request):
    """Health check endpoint for ECS and load balancer"""
    import json
    import os

    from django.db import connection

    try:
        # Check database connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")

        # Load build info
        build_info = {"version": "unknown", "build_time": "unknown"}
        build_info_path = os.path.join(settings.BASE_DIR, "build_info.json")
        if os.path.exists(build_info_path):
            with open(build_info_path, "r") as f:
                build_info = json.load(f)

        return Response(
            {
                "status": "healthy",
                "database": "connected",
                "version": build_info.get("version", "unknown"),
                "build_time": build_info.get("build_time", "unknown"),
            },
            status=status.HTTP_200_OK,
        )
    except Exception as e:
        return Response(
            {"status": "unhealthy", "database": "disconnected", "error": str(e)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
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
        # Composite index: Term(is_deleted, text_normalized) optimizes search queries with soft-delete
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
    search_fields = [
        "term__text",
        "term__text_normalized",
        "drafts__content",
        "drafts__comments__text",
    ]
    ordering_fields = [
        "term__text",
        "term__text_normalized",
        "created_at",
        "updated_at",
    ]
    ordering = ["term__text_normalized"]

    def get_queryset(self):
        """Override queryset to handle additional filtering"""
        from django.db.models import Prefetch

        queryset = super().get_queryset()

        # For list view, only show entries with published drafts
        # Composite index: EntryDraft(entry, is_published, created_at) optimizes this query
        if self.action == "list":
            queryset = queryset.filter(drafts__is_published=True).distinct()
            # Prefetch latest published draft to avoid N+1 queries in serializer
            latest_published_draft = Prefetch(
                "drafts",
                queryset=EntryDraft.objects.filter(is_published=True, is_deleted=False)
                .select_related("author", "endorsed_by")
                .prefetch_related("approvers", "requested_reviewers")
                .order_by("-published_at"),
                to_attr="published_drafts",
            )
            queryset = queryset.prefetch_related(latest_published_draft)
        elif self.action == "retrieve":
            # Prefetch all drafts with related data to avoid N+1 queries in retrieve
            latest_published_draft = Prefetch(
                "drafts",
                queryset=EntryDraft.objects.filter(is_published=True, is_deleted=False)
                .select_related("author", "endorsed_by")
                .prefetch_related("approvers", "requested_reviewers")
                .order_by("-published_at"),
                to_attr="published_drafts",
            )
            all_drafts_prefetch = Prefetch(
                "drafts",
                queryset=EntryDraft.objects.filter(is_deleted=False)
                .select_related("author", "endorsed_by")
                .prefetch_related("approvers", "requested_reviewers", "comments")
                .order_by("-created_at"),
                to_attr="all_drafts_list",
            )
            queryset = queryset.prefetch_related(
                latest_published_draft, all_drafts_prefetch
            )
        elif self.action == "endorse":
            # Prefetch published draft for endorse action
            latest_published_draft = Prefetch(
                "drafts",
                queryset=EntryDraft.objects.filter(is_published=True, is_deleted=False)
                .select_related("author", "endorsed_by")
                .prefetch_related("approvers", "requested_reviewers")
                .order_by("-published_at"),
                to_attr="published_drafts",
            )
            queryset = queryset.prefetch_related(latest_published_draft)

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
        # Composite index: Entry(is_deleted, created_at) optimizes soft-delete + date queries
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
        # Prefetching is now handled in get_queryset() for retrieve action
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

        from django.db.models import F, OuterRef, Prefetch, Subquery

        # Get ordering parameter (default to -published_at)
        ordering = request.query_params.get("ordering", "-published_at")
        order_by_published_at = (
            "published_at" in ordering or "-published_at" in ordering
        )

        # Build base queryset for entries with published drafts
        entries_queryset = Entry.objects.filter(
            drafts__is_published=True, is_deleted=False
        ).select_related("term", "perspective")

        # Apply DRF filtering
        entries_queryset = self.filter_queryset(entries_queryset).distinct()

        # Prefetch latest published draft to avoid N+1 queries
        latest_published_draft = Prefetch(
            "drafts",
            queryset=EntryDraft.objects.filter(is_published=True, is_deleted=False)
            .select_related("author", "endorsed_by")
            .prefetch_related("approvers", "requested_reviewers")
            .order_by("-published_at"),
            to_attr="published_drafts",
        )
        entries_queryset = entries_queryset.prefetch_related(latest_published_draft)

        # Use database aggregation to group by term and get max published_at
        # This avoids Python-side grouping

        if order_by_published_at:
            # Annotate each entry with its term's latest published_at for ordering
            latest_published_subquery = (
                EntryDraft.objects.filter(
                    entry__term=OuterRef("term"),
                    is_published=True,
                    is_deleted=False,
                )
                .order_by("-published_at")
                .values("published_at")[:1]
            )
            entries_queryset = entries_queryset.annotate(
                term_latest_published_at=Subquery(latest_published_subquery)
            )
            if ordering.startswith("-"):
                entries_queryset = entries_queryset.order_by(
                    F("term_latest_published_at").desc(nulls_last=True),
                    "term__text_normalized",
                )
            else:
                entries_queryset = entries_queryset.order_by(
                    F("term_latest_published_at").asc(nulls_last=True),
                    "term__text_normalized",
                )
        else:
            # Apply other ordering
            if ordering.startswith("-"):
                field = ordering[1:]
            else:
                field = ordering

            if field == "term__text" or field == "term__text_normalized":
                entries_queryset = entries_queryset.order_by(
                    "-term__text_normalized"
                    if ordering.startswith("-")
                    else "term__text_normalized"
                )
            else:
                entries_queryset = entries_queryset.order_by("term__text_normalized")

        # Apply pagination
        paginator = PageNumberPagination()
        paginator.page_size = 50
        paginated_entries = paginator.paginate_queryset(entries_queryset, request)

        if not paginated_entries:
            return paginator.get_paginated_response([])

        # Group entries by term using database values() - more efficient than Python
        # Get unique terms from the paginated entries
        term_ids = list(set(entry.term_id for entry in paginated_entries))
        terms_dict = {
            term.id: term
            for term in Term.objects.filter(id__in=term_ids).only(
                "id", "text", "text_normalized", "is_official"
            )
        }

        # Group entries by term_id (already in memory, minimal Python work)
        entries_by_term = {}
        for entry in paginated_entries:
            term_id = entry.term_id
            if term_id not in entries_by_term:
                entries_by_term[term_id] = []
            entries_by_term[term_id].append(entry)

        # Build result - serialize all entries at once to avoid N+1
        result = []
        for term_id in term_ids:
            if term_id in entries_by_term:
                term = terms_dict[term_id]
                term_entries = entries_by_term[term_id]
                serializer = self.get_serializer(term_entries, many=True)
                result.append(
                    {
                        "term": {
                            "id": term.id,
                            "text": term.text,
                            "text_normalized": term.text_normalized,
                            "is_official": term.is_official,
                        },
                        "entries": serializer.data,
                    }
                )

        return paginator.get_paginated_response(result)

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
        "created_at",
        "updated_at",
        "published_at",
    ]
    ordering = ["-created_at"]
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

        # Exclude archived drafts by default
        queryset = queryset.filter(is_archived=False)

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
                # Composite index: EntryDraft(author, is_published, created_at) optimizes author filtering with ordering
                from django.db.models import Max

                queryset = queryset.filter(author=self.request.user)

                # Get the latest created_at per entry for this user's drafts
                latest_timestamps = (
                    queryset.values("entry")
                    .annotate(latest_timestamp=Max("created_at"))
                    .values_list("entry", "latest_timestamp")
                )

                # Filter to only include drafts with the latest created_at for each entry
                from django.db.models import Q

                latest_filter = Q()
                for entry_id, latest_timestamp in latest_timestamps:
                    latest_filter |= Q(entry_id=entry_id, created_at=latest_timestamp)

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
        # Also exclude drafts that come before the latest published draft for each entry
        # Only apply this filter for list actions, not for individual draft retrieval
        # Composite index: EntryDraft(is_published, created_at) optimizes this common filter+order pattern
        if self.action == "list":
            queryset = queryset.filter(is_published=False)

            # Filter out drafts that come before the latest published draft for each entry
            # This ensures we only show drafts after the currently published version
            from django.db.models import OuterRef, Subquery

            # For each draft, get the latest published draft's created_at for the same entry
            # If there's a published draft and this draft's created_at <= it, exclude this draft
            latest_published_timestamp = (
                EntryDraft.objects.filter(
                    entry=OuterRef("entry"),
                    is_published=True,
                    is_deleted=False,
                )
                .order_by("-created_at")
                .values("created_at")[:1]
            )

            # Exclude drafts that have a created_at <= the latest published draft's created_at
            # Only exclude when there is actually a published draft (subquery is not null)
            queryset = queryset.exclude(
                created_at__lte=Subquery(latest_published_timestamp),
                entry__drafts__is_published=True,
            ).distinct()

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

        # Prefetch related data to avoid N+1 queries in serializer
        # Always prefetch these relationships as they're used in EntryDraftListSerializer
        queryset = queryset.select_related(
            "author", "endorsed_by", "entry__term", "entry__perspective"
        ).prefetch_related("approvers", "requested_reviewers", "comments")

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
            .order_by("-created_at")
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
            # Composite index: EntryDraft(entry, is_deleted, created_at) optimizes history queries
            drafts = (
                EntryDraft.objects.filter(entry_id=entry_id, is_deleted=False)
                .select_related("author", "entry__term", "entry__perspective")
                .prefetch_related("approvers", "requested_reviewers")
                .order_by("-created_at")
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

    queryset = Comment.objects.select_related(
        "author", "parent", "draft"
    ).prefetch_related("reactions", "mentioned_users")
    # Note: "replies" is prefetched in get_queryset() override to avoid conflicts
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["draft", "is_resolved", "parent"]
    ordering_fields = ["created_at"]
    ordering = ["created_at"]
    # Composite index: Comment(parent, created_at) optimizes reply ordering

    def get_queryset(self):
        """Override to add recursive prefetching for replies and reaction annotations"""
        from django.db.models import Count, Prefetch

        # Get the base queryset from DRF (this calls .all() on the queryset)
        # DRF will apply filter_backends automatically, so we don't need to call filter_queryset here
        queryset = super().get_queryset()

        # Only apply annotations for list views to avoid breaking get_object() lookups
        # For detail/action views, we'll rely on prefetched data
        if self.action == "list":
            # Annotate reaction count to avoid N+1 queries
            # Use distinct() to ensure annotations don't cause duplicate rows
            queryset = queryset.annotate(
                reaction_count_annotated=Count("reactions", distinct=True)
            )

        # Prefetch replies recursively to avoid N+1 queries
        # This prefetches nested replies with their author and reactions
        # Use Comment.objects to ensure soft-delete filtering is preserved
        recursive_replies_prefetch = Prefetch(
            "replies",
            queryset=Comment.objects.select_related("author")
            .prefetch_related("reactions", "mentioned_users")
            .order_by("created_at"),
        )

        # Add recursive replies prefetch
        # Note: "replies" is NOT in the base queryset's prefetch_related to avoid conflicts
        return queryset.prefetch_related(recursive_replies_prefetch)

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
        comment = self.get_object()
        if comment.author != self.request.user and not self.request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("You can only update your own comments.")
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

    @action(detail=True, methods=["post"])
    def react(self, request, pk=None):
        """Add a reaction to a comment"""
        import logging

        from django.db import IntegrityError

        from glossary.models import Reaction

        logger = logging.getLogger(__name__)
        comment = self.get_object()
        reaction_type = request.data.get("reaction_type", "thumbs_up")

        # Check if user already reacted
        existing_reaction = Reaction.objects.filter(
            comment=comment, user=request.user, reaction_type=reaction_type
        ).first()

        if existing_reaction:
            # User already reacted - return current state instead of error
            # This handles race conditions where multiple requests come in
            comment.refresh_from_db()
            if hasattr(comment, "_prefetched_objects_cache"):
                comment._prefetched_objects_cache = {}
            serializer = self.get_serializer(comment)
            return Response(serializer.data)

        # Create reaction with created_by set
        # Use get_or_create to handle race conditions gracefully
        try:
            reaction, created = Reaction.objects.get_or_create(
                comment=comment,
                user=request.user,
                reaction_type=reaction_type,
                defaults={"created_by": request.user},
            )
            if not created:
                # Reaction already exists (race condition)
                comment.refresh_from_db()
                if hasattr(comment, "_prefetched_objects_cache"):
                    comment._prefetched_objects_cache = {}
                serializer = self.get_serializer(comment)
                return Response(serializer.data)
        except IntegrityError:
            # Handle unique constraint violation (race condition)
            comment.refresh_from_db()
            if hasattr(comment, "_prefetched_objects_cache"):
                comment._prefetched_objects_cache = {}
            serializer = self.get_serializer(comment)
            return Response(serializer.data)

        # Refresh comment from DB and clear prefetch cache to get updated reaction data
        comment.refresh_from_db()
        # Clear the prefetched reactions cache to ensure fresh data
        if hasattr(comment, "_prefetched_objects_cache"):
            comment._prefetched_objects_cache = {}

        serializer = self.get_serializer(comment)
        response_data = serializer.data

        # Log the response for debugging
        logger.info(
            f"Reaction added: comment_id={comment.id}, user={request.user.username}, "
            f"reaction_count={response_data.get('reaction_count')}, "
            f"user_has_reacted={response_data.get('user_has_reacted')}"
        )

        return Response(response_data)

    @action(detail=True, methods=["post"])
    def unreact(self, request, pk=None):
        """Remove a reaction from a comment"""
        import logging

        from glossary.models import Reaction

        logger = logging.getLogger(__name__)
        comment = self.get_object()
        reaction_type = request.data.get("reaction_type", "thumbs_up")

        # Find and delete reaction
        reaction = Reaction.objects.filter(
            comment=comment, user=request.user, reaction_type=reaction_type
        ).first()

        if not reaction:
            # User hasn't reacted - return current state instead of error
            # This handles race conditions where multiple requests come in
            comment.refresh_from_db()
            if hasattr(comment, "_prefetched_objects_cache"):
                comment._prefetched_objects_cache = {}
            serializer = self.get_serializer(comment)
            return Response(serializer.data)

        reaction.delete()

        # Refresh comment from DB and clear prefetch cache to get updated reaction data
        comment.refresh_from_db()
        # Clear the prefetched reactions cache to ensure fresh data
        if hasattr(comment, "_prefetched_objects_cache"):
            comment._prefetched_objects_cache = {}

        serializer = self.get_serializer(comment)
        response_data = serializer.data

        # Log the response for debugging
        logger.info(
            f"Reaction removed: comment_id={comment.id}, user={request.user.username}, "
            f"reaction_count={response_data.get('reaction_count')}, "
            f"user_has_reacted={response_data.get('user_has_reacted')}"
        )

        return Response(response_data)

    def _get_relevant_drafts(self, entry_id):
        """Get drafts relevant for comment loading (after last published or all if none published)"""
        drafts = EntryDraft.objects.filter(
            entry_id=entry_id, is_deleted=False
        ).order_by("-created_at")

        last_published_draft = drafts.filter(is_published=True).first()
        if last_published_draft:
            # Only show comments on drafts created after the last published draft
            return drafts.filter(created_at__gt=last_published_draft.created_at)
        return drafts

    def _calculate_draft_comment_position(self, comment_draft, drafts, latest_draft):
        """Calculate draft position for a comment on a draft"""
        if latest_draft and comment_draft.id == latest_draft.id:
            return "current draft"
        if comment_draft.is_published:
            return "published"

        # Count how many drafts ago this was
        drafts_after = drafts.filter(created_at__gt=comment_draft.created_at).count()
        if drafts_after == 0:
            return "current draft"
        return f"{drafts_after} drafts ago"

    @action(detail=False, methods=["get"])
    def with_draft_positions(self, request):
        """Get comments with draft position indicators for an entry (paginated)"""
        from rest_framework.pagination import PageNumberPagination

        entry_id = request.query_params.get("entry")
        draft_id = request.query_params.get("draft_id")  # For version history view
        show_resolved = (
            request.query_params.get("show_resolved", "false").lower() == "true"
        )

        if not entry_id:
            return Response(
                {"detail": "entry parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Get relevant drafts (drafts since last published, or all if none published)
            drafts = self._get_relevant_drafts(entry_id)
            latest_draft = drafts.first() if drafts.exists() else None

            # Build comment query with all necessary prefetching to avoid N+1 queries
            from django.db.models import Count, Prefetch

            # Prefetch replies recursively with all needed data
            recursive_replies_prefetch = Prefetch(
                "replies",
                queryset=Comment.objects.select_related("author")
                .prefetch_related("reactions", "mentioned_users")
                .annotate(reaction_count_annotated=Count("reactions"))
                .order_by("created_at"),
            )

            comment_query = (
                Comment.objects.filter(
                    draft__entry_id=entry_id,
                    draft__is_deleted=False,
                    parent__isnull=True,  # Only top-level comments
                )
                .select_related("author", "draft")
                .prefetch_related(
                    recursive_replies_prefetch,
                    "reactions",
                    "mentioned_users",
                )
                .annotate(reaction_count_annotated=Count("reactions"))
            )

            # If viewing a specific draft in version history, filter to that draft
            if draft_id:
                comment_query = comment_query.filter(draft_id=draft_id)
            else:
                # Otherwise, only show comments on relevant drafts
                relevant_draft_ids = list(drafts.values_list("id", flat=True))
                comment_query = comment_query.filter(draft_id__in=relevant_draft_ids)

            # Filter resolved comments based on context
            if not show_resolved:
                comment_query = comment_query.filter(is_resolved=False)

            comments = list(comment_query.order_by("-created_at"))

            # Process comments to add draft position info
            # All data is prefetched, so this is just Python-side processing
            comments_with_positions = []
            serializer = self.get_serializer(comments, many=True)
            for i, comment in enumerate(comments):
                draft_position = self._calculate_draft_comment_position(
                    comment.draft, drafts, latest_draft
                )
                comment_data = serializer.data[i]
                comment_data["draft_position"] = draft_position
                comment_data["draft_id"] = comment.draft.id
                comment_data["draft_timestamp"] = comment.draft.created_at.isoformat()
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
        logger = logging.getLogger(__name__)
        data_keys = (
            list(request.data.keys()) if hasattr(request.data, "keys") else "N/A"
        )
        logger.info(f"CustomAuthToken: Received login request. Data keys: {data_keys}")

        serializer = self.serializer_class(
            data=request.data, context={"request": request}
        )

        if not serializer.is_valid():
            logger.warning(
                f"CustomAuthToken: Validation failed. Errors: {serializer.errors}"
            )
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.validated_data["user"]
        token, created = Token.objects.get_or_create(user=user)
        logger.info(f"CustomAuthToken: Login successful for user: {user.username}")

        from glossary.serializers import UserDetailSerializer

        return Response({"token": token.key, "user": UserDetailSerializer(user).data})


@api_view(["POST"])
@permission_classes([AllowAny])
def okta_login_view(request):
    """Okta OAuth login endpoint - exchanges Okta token for Django token"""
    logger = logging.getLogger(__name__)
    logger.info("okta_login_view: Received Okta login request")

    from glossary.okta_auth import (
        OktaTokenError,
        get_or_create_user_from_okta_token,
        verify_okta_token,
    )
    from glossary.serializers import UserDetailSerializer

    okta_token = request.data.get("okta_token")
    if not okta_token:
        logger.error("okta_login_view: No okta_token in request")
        return Response(
            {"detail": "okta_token is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    logger.info("okta_login_view: Verifying Okta token")
    try:
        # Verify and decode Okta token
        token_data = verify_okta_token(okta_token)
        logger.info(
            f"okta_login_view: Token verified for user: {token_data.get('sub')}"
        )

        # Get or create Django user
        user = get_or_create_user_from_okta_token(token_data)
        logger.info(f"okta_login_view: User retrieved/created: {user.username}")

        # Create or get Django token
        token, created = Token.objects.get_or_create(user=user)
        logger.info(
            f"okta_login_view: Django token {'created' if created else 'retrieved'}"
        )

        # Prefetch curatorship to avoid N+1 query in serializer
        user = (
            User.objects.filter(pk=user.pk)
            .select_related("profile")
            .prefetch_related("curatorship__perspective")
            .first()
        )
        return Response({"token": token.key, "user": UserDetailSerializer(user).data})

    except OktaTokenError as e:
        logger.error(f"okta_login_view: OktaTokenError: {str(e)}")
        return Response(
            {"detail": str(e)},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    except Exception as e:
        logger.exception("okta_login_view: Unexpected error during Okta login")
        return Response(
            {"detail": f"Authentication failed: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


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


# Store last archiving check time in memory (module-level)
_last_archiving_check = None


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def current_user_view(request):
    """Get current user info with computed fields"""
    from datetime import timedelta

    from django.core.management import call_command
    from django.utils import timezone

    from glossary.serializers import UserDetailSerializer

    # Check if we need to run archiving (at least once per day)
    global _last_archiving_check
    now = timezone.now()

    if _last_archiving_check is None or (now - _last_archiving_check) >= timedelta(
        days=1
    ):
        try:
            call_command("archive_old_drafts", verbosity=0)
            _last_archiving_check = now
        except Exception:
            # Silently fail - don't break the /me endpoint if archiving fails
            pass

    # Prefetch curatorship to avoid N+1 query in serializer
    user = (
        User.objects.filter(pk=request.user.pk)
        .select_related("profile")
        .prefetch_related("curatorship__perspective")
        .first()
    )
    serializer = UserDetailSerializer(user)
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

    # Prefetch curatorship to avoid N+1 query in serializer
    target_user = (
        User.objects.filter(pk=target_user.pk)
        .select_related("profile")
        .prefetch_related("curatorship__perspective")
        .first()
    )
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


@api_view(["GET"])
@permission_classes([AllowAny])
def okta_config_view(request):
    """Get Okta OAuth configuration for frontend"""
    return Response(
        {
            "client_id": settings.OKTA_CLIENT_ID,
            "issuer_uri": settings.OKTA_ISSUER_URI,
            "redirect_uri": settings.OKTA_REDIRECT_URI,
        }
    )


class NotificationViewSet(viewsets.ModelViewSet):
    """ViewSet for Notification model"""

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["type", "is_read"]

    def get_queryset(self):
        """Return notifications for the current user"""
        return Notification.objects.filter(user=self.request.user).select_related(
            "related_draft", "related_comment"
        )

    @action(detail=True, methods=["patch"])
    def mark_read(self, request, pk=None):
        """Mark a notification as read"""
        # get_object() filters by user, so if notification doesn't exist or belongs to another user, it raises 404
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        serializer = self.get_serializer(notification)
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        """Mark all notifications as read for the current user"""
        Notification.objects.filter(user=request.user, is_read=False).update(
            is_read=True
        )
        return Response({"detail": "All notifications marked as read."})


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
