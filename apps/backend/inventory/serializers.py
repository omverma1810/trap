"""
Inventory app serializers.
"""

from rest_framework import serializers
from .models import Inventory, StockMovement, Supplier, PurchaseOrder, PurchaseOrderItem
from products.serializers import ProductListSerializer


class InventorySerializer(serializers.ModelSerializer):
    """Inventory serializer."""
    
    product = ProductListSerializer(read_only=True)
    stock_status = serializers.CharField(read_only=True)
    available_quantity = serializers.IntegerField(read_only=True)
    needs_reorder = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Inventory
        fields = [
            'id', 'product', 'quantity', 'reserved_quantity',
            'available_quantity', 'reorder_level', 'reorder_quantity',
            'warehouse_location', 'bin_location', 'stock_status',
            'needs_reorder', 'last_restocked', 'last_sold',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class InventoryUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating inventory settings."""
    
    class Meta:
        model = Inventory
        fields = [
            'reorder_level', 'reorder_quantity',
            'warehouse_location', 'bin_location'
        ]


class StockAdjustmentSerializer(serializers.Serializer):
    """Serializer for stock adjustments."""
    
    quantity = serializers.IntegerField(required=True)
    movement_type = serializers.ChoiceField(choices=StockMovement.MovementType.choices)
    reference = serializers.CharField(max_length=100, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class StockMovementSerializer(serializers.ModelSerializer):
    """Stock movement serializer."""
    
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = StockMovement
        fields = [
            'id', 'product', 'product_name', 'product_sku',
            'movement_type', 'quantity', 'quantity_before',
            'quantity_after', 'reference', 'reference_type',
            'notes', 'cost_per_unit', 'created_by',
            'created_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at']


class SupplierSerializer(serializers.ModelSerializer):
    """Supplier serializer."""
    
    class Meta:
        model = Supplier
        fields = [
            'id', 'name', 'code', 'contact_person', 'email',
            'phone', 'address', 'is_active', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    """Purchase order item serializer."""
    
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    
    class Meta:
        model = PurchaseOrderItem
        fields = [
            'id', 'product', 'product_name', 'product_sku',
            'quantity', 'received_quantity', 'unit_cost', 'total'
        ]
        read_only_fields = ['id', 'total']


class PurchaseOrderSerializer(serializers.ModelSerializer):
    """Purchase order serializer."""
    
    items = PurchaseOrderItemSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'order_number', 'supplier', 'supplier_name',
            'status', 'items', 'subtotal', 'tax_amount', 'total',
            'expected_date', 'received_date', 'notes',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']
