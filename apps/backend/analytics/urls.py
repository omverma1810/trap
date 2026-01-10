"""
Analytics app URLs.
"""

from django.urls import path

from .views import (
    DashboardView,
    SalesAnalyticsView,
    InventoryAnalyticsView,
    ProfitAnalyticsView,
)

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('sales/', SalesAnalyticsView.as_view(), name='sales_analytics'),
    path('inventory/', InventoryAnalyticsView.as_view(), name='inventory_analytics'),
    path('profit/', ProfitAnalyticsView.as_view(), name='profit_analytics'),
]
