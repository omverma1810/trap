"""
Sales Admin Configuration.

IMMUTABILITY: Sales and SaleItems are read-only in admin.
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import Sale, SaleItem


class SaleItemInline(admin.TabularInline):
    """Inline display of sale items."""
    model = SaleItem
    extra = 0
    readonly_fields = [
        'id', 'variant', 'quantity', 'selling_price', 'line_total'
    ]
    fields = ['variant', 'quantity', 'selling_price', 'line_total']
    
    def has_add_permission(self, request, obj=None):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    """
    Read-only admin for Sales.
    
    IMMUTABILITY:
    - No add permission
    - No change permission
    - No delete permission
    """
    list_display = [
        'sale_number', 'warehouse', 'total_amount_display',
        'total_items', 'payment_method', 'status_badge', 'created_at'
    ]
    list_filter = ['payment_method', 'status', 'warehouse', 'created_at']
    search_fields = ['sale_number', 'created_by']
    readonly_fields = [
        'id', 'sale_number', 'warehouse', 'total_amount', 'total_items',
        'payment_method', 'status', 'created_by', 'created_at'
    ]
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    inlines = [SaleItemInline]
    
    @admin.display(description='Total')
    def total_amount_display(self, obj):
        return format_html('₹{:,.2f}', obj.total_amount)
    
    @admin.display(description='Status')
    def status_badge(self, obj):
        if obj.status == Sale.Status.COMPLETED:
            return format_html('<span style="color: green;">✓ Completed</span>')
        return format_html('<span style="color: red;">✗ Cancelled</span>')
    
    def has_add_permission(self, request):
        """Prevent adding sales through admin."""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Prevent editing sales through admin."""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Prevent deleting sales through admin."""
        return False


@admin.register(SaleItem)
class SaleItemAdmin(admin.ModelAdmin):
    """
    Read-only admin for SaleItems.
    """
    list_display = [
        'sale', 'variant', 'quantity', 'selling_price', 'line_total'
    ]
    list_filter = ['sale__payment_method', 'sale__created_at']
    search_fields = ['sale__sale_number', 'variant__sku']
    readonly_fields = [
        'id', 'sale', 'variant', 'quantity', 'selling_price', 'line_total'
    ]
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False
