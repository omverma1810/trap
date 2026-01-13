"""
Sales URL Configuration.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    BarcodeScanView,
    CheckoutView,
    SaleViewSet,
)

router = DefaultRouter()
router.register(r'', SaleViewSet, basename='sale')

urlpatterns = [
    # POS operations
    path('scan/', BarcodeScanView.as_view(), name='barcode-scan'),
    path('checkout/', CheckoutView.as_view(), name='checkout'),
    
    # Sales history (read-only)
    path('', include(router.urls)),
]
