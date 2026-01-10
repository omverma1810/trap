"""
Inventory app URLs.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    InventoryViewSet,
    StockMovementViewSet,
    SupplierViewSet,
    PurchaseOrderViewSet,
    ScanBarcodeView,
)

router = DefaultRouter()
router.register(r'inventory', InventoryViewSet)
router.register(r'stock-movements', StockMovementViewSet)
router.register(r'suppliers', SupplierViewSet)
router.register(r'purchase-orders', PurchaseOrderViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('scan/', ScanBarcodeView.as_view(), name='scan_barcode'),
]
