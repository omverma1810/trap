"""
Inventory app admin configuration.
"""

from django.contrib import admin
from .models import Inventory, StockMovement, Supplier, PurchaseOrder, PurchaseOrderItem


@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    list_display = ['product', 'quantity', 'reorder_level', 'warehouse_location', 'stock_status']
    list_filter = ['warehouse_location']
    search_fields = ['product__name', 'product__sku']
    raw_id_fields = ['product']
    
    def stock_status(self, obj):
        return obj.stock_status
    stock_status.short_description = 'Status'


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ['product', 'movement_type', 'quantity', 'reference', 'created_by', 'created_at']
    list_filter = ['movement_type', 'reference_type']
    search_fields = ['product__name', 'reference']
    raw_id_fields = ['product', 'created_by']


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'contact_person', 'email', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'code', 'email']


class PurchaseOrderItemInline(admin.TabularInline):
    model = PurchaseOrderItem
    extra = 1
    raw_id_fields = ['product']


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'supplier', 'status', 'total', 'expected_date', 'created_at']
    list_filter = ['status', 'supplier']
    search_fields = ['order_number', 'supplier__name']
    raw_id_fields = ['supplier', 'created_by']
    inlines = [PurchaseOrderItemInline]
