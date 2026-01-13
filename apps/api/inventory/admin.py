"""
Inventory Admin Configuration.
"""

from django.contrib import admin
from .models import Warehouse, Product, ProductVariant, StockLedger, StockSnapshot


@admin.register(Warehouse)
class WarehouseAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name', 'code']
    readonly_fields = ['id', 'created_at', 'updated_at']


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 0
    readonly_fields = ['id', 'created_at']
    fields = ['sku', 'size', 'color', 'cost_price', 'selling_price', 'reorder_threshold', 'is_active']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'brand', 'category', 'is_active', 'created_at']
    list_filter = ['brand', 'category', 'is_active']
    search_fields = ['name', 'brand', 'category']
    readonly_fields = ['id', 'created_at', 'updated_at']
    inlines = [ProductVariantInline]


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ['sku', 'product', 'size', 'color', 'cost_price', 'selling_price', 'is_active']
    list_filter = ['product__brand', 'product__category', 'is_active']
    search_fields = ['sku', 'product__name']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(StockLedger)
class StockLedgerAdmin(admin.ModelAdmin):
    """
    Read-only admin for StockLedger.
    Ledger entries are immutable - no add/change/delete allowed through admin.
    """
    list_display = ['variant', 'warehouse', 'event_type', 'quantity', 'reference_type', 'created_at']
    list_filter = ['event_type', 'reference_type', 'warehouse', 'created_at']
    search_fields = ['variant__sku', 'reference_id', 'notes']
    readonly_fields = [
        'id', 'variant', 'warehouse', 'event_type', 'quantity',
        'reference_type', 'reference_id', 'notes', 'created_by', 'created_at'
    ]
    date_hierarchy = 'created_at'
    
    def has_add_permission(self, request):
        """Prevent adding ledger entries through admin."""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Prevent editing ledger entries through admin."""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Prevent deleting ledger entries through admin."""
        return False


@admin.register(StockSnapshot)
class StockSnapshotAdmin(admin.ModelAdmin):
    """
    Read-only admin for StockSnapshot.
    Snapshots are derived from ledger - edits not allowed.
    """
    list_display = ['variant', 'warehouse', 'quantity', 'last_updated']
    list_filter = ['warehouse']
    search_fields = ['variant__sku']
    readonly_fields = ['id', 'variant', 'warehouse', 'quantity', 'last_updated']
    
    def has_add_permission(self, request):
        """Prevent adding snapshots through admin."""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Prevent editing snapshots through admin."""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Prevent deleting snapshots through admin."""
        return False
