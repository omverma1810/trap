"""
Analytics Services Package.
"""

from .inventory import get_inventory_overview, get_low_stock_items, get_dead_stock_items
from .sales import get_sales_summary, get_sales_trends, get_top_selling_products
from .revenue import get_revenue_overview, get_revenue_by_product, get_revenue_by_warehouse
from .discounts import get_discount_overview
from .performance import get_performance_overview
from .summary import get_analytics_summary

__all__ = [
    # Inventory
    'get_inventory_overview',
    'get_low_stock_items',
    'get_dead_stock_items',
    # Sales
    'get_sales_summary',
    'get_sales_trends',
    'get_top_selling_products',
    # Revenue
    'get_revenue_overview',
    'get_revenue_by_product',
    'get_revenue_by_warehouse',
    # Discounts
    'get_discount_overview',
    # Performance
    'get_performance_overview',
    # Summary
    'get_analytics_summary',
]
