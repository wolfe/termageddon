from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DomainViewSet, TermViewSet, DefinitionViewSet, ValidateUrlView

router = DefaultRouter()
router.register(r'domains', DomainViewSet)
router.register(r'terms', TermViewSet)
router.register(r'definitions', DefinitionViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('validate-url/', ValidateUrlView.as_view(), name='validate-url'),
] 