"""
Reports URL Configuration.

PHASE 16: REPORTS & ANALYTICS
"""

from django.urls import path

from .views import (
    # Inventory
    CurrentStockReportView,
    StockAgingReportView,
    StockMovementReportView,
    # Sales
    SalesSummaryView,
    ProductSalesReportView,
    SalesTrendsView,
    # Returns
    ReturnsSummaryView,
    AdjustmentsReportView,
    # Financial
    GrossProfitReportView,
    GSTSummaryReportView,
    # Dimension Reports
    CategoryWiseSalesView,
    BrandWiseSalesView,
    SizeWiseSalesView,
    SupplierWiseReportView,
    SupplierSalesReportView,
    WarehouseWiseSalesView,
)

urlpatterns = [
    # A. Inventory Reports
    path('inventory/current/', CurrentStockReportView.as_view(), name='current-stock'),
    path('inventory/aging/', StockAgingReportView.as_view(), name='stock-aging'),
    path('inventory/movements/', StockMovementReportView.as_view(), name='stock-movements'),
    
    # B. Sales Reports
    path('sales/summary/', SalesSummaryView.as_view(), name='sales-summary'),
    path('sales/by-product/', ProductSalesReportView.as_view(), name='product-sales'),
    path('sales/trends/', SalesTrendsView.as_view(), name='sales-trends'),
    
    # C. Returns & Adjustments
    path('returns/', ReturnsSummaryView.as_view(), name='returns-summary'),
    path('adjustments/', AdjustmentsReportView.as_view(), name='adjustments'),
    
    # D. Profit & Tax
    path('profit/', GrossProfitReportView.as_view(), name='gross-profit'),
    path('tax/gst/', GSTSummaryReportView.as_view(), name='gst-summary'),
    
    # E. Dimension Reports
    path('by-category/', CategoryWiseSalesView.as_view(), name='category-sales'),
    path('by-brand/', BrandWiseSalesView.as_view(), name='brand-sales'),
    path('by-size/', SizeWiseSalesView.as_view(), name='size-sales'),
    path('by-supplier/', SupplierWiseReportView.as_view(), name='supplier-report'),
    path('by-supplier-sales/', SupplierSalesReportView.as_view(), name='supplier-sales'),
    path('by-warehouse/', WarehouseWiseSalesView.as_view(), name='warehouse-sales'),
]
