"""
TRAP Inventory API URL Configuration.
"""

from django.contrib import admin
from django.urls import path, include
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
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
