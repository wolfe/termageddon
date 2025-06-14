from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DomainViewSet, TermViewSet, DefinitionViewSet

router = DefaultRouter()
router.register(r'domains', DomainViewSet)
router.register(r'terms', TermViewSet)
router.register(r'definitions', DefinitionViewSet)

urlpatterns = [
    path('', include(router.urls)),
] 