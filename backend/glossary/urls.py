from django.urls import include, path
from rest_framework.routers import DefaultRouter

from glossary.views import (
    CommentViewSet,
    CustomAuthToken,
    PerspectiveCuratorViewSet,
    PerspectiveViewSet,
    EntryDraftViewSet,
    EntryViewSet,
    TermViewSet,
    current_user_view,
    logout_view,
    reset_test_database,
    system_config_view,
    users_list_view,
)

# Create a router and register viewsets
router = DefaultRouter()
router.register(r"perspectives", PerspectiveViewSet, basename="perspective")
router.register(r"terms", TermViewSet, basename="term")
router.register(r"entries", EntryViewSet, basename="entry")
router.register(r"entry-drafts", EntryDraftViewSet, basename="entrydraft")
router.register(r"comments", CommentViewSet, basename="comment")
router.register(r"perspective-curators", PerspectiveCuratorViewSet, basename="perspectivecurator")

urlpatterns = [
    # Auth endpoints
    path("auth/login/", CustomAuthToken.as_view(), name="auth-login"),
    path("auth/logout/", logout_view, name="auth-logout"),
    path("auth/me/", current_user_view, name="auth-me"),
    # API endpoints
    path("users/", users_list_view, name="users-list"),
    path("system-config/", system_config_view, name="system-config"),
    # Test endpoints
    path("test/reset-database/", reset_test_database, name="reset-test-database"),
    path("", include(router.urls)),
]
