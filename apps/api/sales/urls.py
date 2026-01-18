"""
Sales URL Configuration.

PHASE 15: Added returns and adjustments endpoints.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    BarcodeScanView,
    CheckoutView,
    SaleViewSet,
)
from .returns_views import (
    CreateReturnView,
    ReturnViewSet,
    StockAdjustmentView,
)

# Main sales router
router = DefaultRouter()
router.register(r'', SaleViewSet, basename='sale')

# Returns router
returns_router = DefaultRouter()
returns_router.register(r'', ReturnViewSet, basename='return')

urlpatterns = [
    # POS operations
    path('scan/', BarcodeScanView.as_view(), name='barcode-scan'),
    path('checkout/', CheckoutView.as_view(), name='checkout'),
    
    # Phase 15: Returns
    path('returns/', CreateReturnView.as_view(), name='create-return'),
    path('returns/', include(returns_router.urls)),
    
    # Phase 15: Stock adjustments
    path('adjustments/', StockAdjustmentView.as_view(), name='stock-adjustment'),
    
    # Sales history (read-only)
    path('', include(router.urls)),
]

