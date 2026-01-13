"""
Analytics URL Configuration.
"""

from django.urls import path

from .views import (
    # Inventory
    InventoryOverviewView,
    LowStockView,
    DeadStockView,
    # Sales
    SalesSummaryView,
    SalesTrendsView,
    TopProductsView,
    # Revenue
    RevenueOverviewView,
    RevenueByProductView,
    RevenueByWarehouseView,
    # Discounts
    DiscountOverviewView,
    # Performance
    PerformanceOverviewView,
)

urlpatterns = [
    # Inventory Analytics
    path('inventory/overview/', InventoryOverviewView.as_view(), name='inventory-overview'),
    path('inventory/low-stock/', LowStockView.as_view(), name='low-stock'),
    path('inventory/dead-stock/', DeadStockView.as_view(), name='dead-stock'),
    
    # Sales Analytics
    path('sales/summary/', SalesSummaryView.as_view(), name='sales-summary'),
    path('sales/trends/', SalesTrendsView.as_view(), name='sales-trends'),
    path('sales/top-products/', TopProductsView.as_view(), name='top-products'),
    
    # Revenue Analytics
    path('revenue/overview/', RevenueOverviewView.as_view(), name='revenue-overview'),
    path('revenue/by-product/', RevenueByProductView.as_view(), name='revenue-by-product'),
    path('revenue/by-warehouse/', RevenueByWarehouseView.as_view(), name='revenue-by-warehouse'),
    
    # Discount Analytics
    path('discounts/overview/', DiscountOverviewView.as_view(), name='discount-overview'),
    
    # Performance Analytics
    path('performance/overview/', PerformanceOverviewView.as_view(), name='performance-overview'),
]
