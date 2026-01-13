"""
TRAP Inventory API URL Configuration.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)
from .health import health_check


urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # Health endpoints (both / and /health/ return the same response)
    path('', health_check, name='health-root'),
    path('health/', health_check, name='health'),
    
    # API v1 - Inventory
    path('api/v1/inventory/', include('inventory.urls')),
    
    # API v1 - Sales
    path('api/v1/sales/', include('sales.urls')),
    
    # API v1 - Invoices
    path('api/v1/invoices/', include('invoices.urls')),
    
    # API v1 - Analytics (read-only)
    path('api/v1/analytics/', include('analytics.urls')),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
