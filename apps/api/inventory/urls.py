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
    # Phase 11: Inventory Ledger
    InventoryMovementViewSet,
    ProductStockView,
    # Phase 12: Opening Stock
    OpeningStockView,
    # Purchase Orders
    SupplierViewSet,
    PurchaseOrderViewSet,
    # Stores and Stock Transfers
    StoreViewSet,
    StockTransferViewSet,
)

router = DefaultRouter()
router.register(r'warehouses', WarehouseViewSet, basename='warehouse')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'ledger', StockLedgerViewSet, basename='ledger')
# Phase 11: Inventory movements
router.register(r'movements', InventoryMovementViewSet, basename='movement')
# Purchase Orders
router.register(r'suppliers', SupplierViewSet, basename='supplier')
router.register(r'purchase-orders', PurchaseOrderViewSet, basename='purchase-order')
# Stores and Stock Transfers
router.register(r'stores', StoreViewSet, basename='store')
router.register(r'stock-transfers', StockTransferViewSet, basename='stock-transfer')

urlpatterns = [
    # Stock operations
    path('stock/purchase/', PurchaseStockView.as_view(), name='stock-purchase'),
    path('stock/adjust/', AdjustStockView.as_view(), name='stock-adjust'),
    path('stock/summary/', StockSummaryView.as_view(), name='stock-summary'),
    
    # Phase 11: Derived product stock
    path('stock/', ProductStockView.as_view(), name='product-stock'),
    
    # Phase 12: Opening stock
    path('opening-stock/', OpeningStockView.as_view(), name='opening-stock'),
    
    # POS products - flattened variants for POS grid
    path('pos/products/', POSProductsView.as_view(), name='pos-products'),
    
    # Barcode image generation
    path('barcodes/<str:barcode>/image/', BarcodeImageView.as_view(), name='barcode-image'),
    
    # ViewSet routes
    path('', include(router.urls)),
]
