from django.urls import include, path
from rest_framework.routers import DefaultRouter

from glossary import views
from glossary.views import (
    CommentViewSet,
    CustomAuthToken,
    DomainExpertViewSet,
    DomainViewSet,
    EntryVersionViewSet,
    EntryViewSet,
    TermViewSet,
    current_user_view,
    logout_view,
    users_list_view,
)

# Create a router and register viewsets
router = DefaultRouter()
router.register(r"domains", DomainViewSet, basename="domain")
router.register(r"terms", TermViewSet, basename="term")
router.register(r"entries", EntryViewSet, basename="entry")
router.register(r"entry-versions", EntryVersionViewSet, basename="entryversion")
router.register(r"comments", CommentViewSet, basename="comment")
router.register(r"domain-experts", DomainExpertViewSet, basename="domainexpert")

urlpatterns = [
    # Auth endpoints
    path("auth/login/", CustomAuthToken.as_view(), name="auth-login"),
    path("auth/logout/", logout_view, name="auth-logout"),
    path("auth/me/", current_user_view, name="auth-me"),
    # API endpoints
    path("users/", users_list_view, name="users-list"),
    path("", include(router.urls)),
]
