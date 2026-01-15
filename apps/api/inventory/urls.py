"""
Inventory URL Configuration.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    WarehouseViewSet,
    ProductViewSet,
    StockLedgerViewSet,
    PurchaseStockView,
    AdjustStockView,
    StockSummaryView,
    BarcodeImageView,
    POSProductsView,
)

router = DefaultRouter()
router.register(r'warehouses', WarehouseViewSet, basename='warehouse')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'ledger', StockLedgerViewSet, basename='ledger')

urlpatterns = [
    # Stock operations
    path('stock/purchase/', PurchaseStockView.as_view(), name='stock-purchase'),
    path('stock/adjust/', AdjustStockView.as_view(), name='stock-adjust'),
    path('stock/summary/', StockSummaryView.as_view(), name='stock-summary'),
    
    # POS products - flattened variants for POS grid
    path('pos/products/', POSProductsView.as_view(), name='pos-products'),
    
    # Barcode image generation
    path('barcodes/<str:barcode>/image/', BarcodeImageView.as_view(), name='barcode-image'),
    
    # ViewSet routes
    path('', include(router.urls)),
]
