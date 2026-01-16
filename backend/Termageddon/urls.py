"""
URL configuration for Termageddon project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.generic import TemplateView

from glossary.admin import csv_upload_view
from glossary.views import health_check_view

# Configure admin site URL for "VIEW SITE" link
# In development, point to frontend (port 4200), in production use same domain
if settings.DEBUG:
    admin.site.site_url = "http://localhost:4200"
else:
    # In production, frontend is served from same domain as backend
    admin.site.site_url = None  # None means use same domain as admin

urlpatterns = [
    path("admin/glossary/upload-csv/", csv_upload_view, name="glossary_upload_csv"),
    path("admin/", admin.site.urls),
    path("health/", health_check_view, name="health-check"),
    path("api/", include("glossary.urls")),
    # API Documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    # Serve Angular frontend - catch-all route (must be last)
    # Excludes: admin, api, health, static files, and common file extensions
    re_path(
        r"^(?!admin|api|health|static|favicon\.ico|"
        r".*\.(ico|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot|json|xml|txt|pdf|zip|tar|gz)$).*$",
        TemplateView.as_view(template_name="index.html"),
        name="frontend",
    ),
]
