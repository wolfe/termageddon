from rest_framework.routers import DefaultRouter

from django.urls import include, path

from glossary.views import (
    CommentViewSet,
    CustomAuthToken,
    EntryDraftViewSet,
    EntryViewSet,
    NotificationViewSet,
    PerspectiveCuratorViewSet,
    PerspectiveViewSet,
    TermViewSet,
    current_user_view,
    health_check_view,
    logout_view,
    okta_config_view,
    okta_login_view,
    reset_test_database,
    switch_test_user_view,
    system_config_view,
    test_users_exist_view,
    users_list_view,
)

# Create a router and register viewsets
router = DefaultRouter()
router.register(r"perspectives", PerspectiveViewSet, basename="perspective")
router.register(r"terms", TermViewSet, basename="term")
router.register(r"entries", EntryViewSet, basename="entry")
router.register(r"entry-drafts", EntryDraftViewSet, basename="entrydraft")
router.register(r"comments", CommentViewSet, basename="comment")
router.register(
    r"perspective-curators", PerspectiveCuratorViewSet, basename="perspectivecurator"
)
router.register(r"notifications", NotificationViewSet, basename="notification")

urlpatterns = [
    # Health check (no auth required)
    path("health/", health_check_view, name="health-check"),
    # Auth endpoints
    path("auth/login/", CustomAuthToken.as_view(), name="auth-login"),
    path("auth/okta-login/", okta_login_view, name="auth-okta-login"),
    path("auth/okta-config/", okta_config_view, name="auth-okta-config"),
    path("auth/logout/", logout_view, name="auth-logout"),
    path("auth/me/", current_user_view, name="auth-me"),
    path("auth/switch-test-user/", switch_test_user_view, name="switch-test-user"),
    # API endpoints
    path("users/", users_list_view, name="users-list"),
    path("system-config/", system_config_view, name="system-config"),
    path("test-users-exist/", test_users_exist_view, name="test-users-exist"),
    # Test endpoints
    path("test/reset-database/", reset_test_database, name="reset-test-database"),
    path("", include(router.urls)),
]
