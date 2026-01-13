"""
Sales Serializers for TRAP Inventory System.

PHASE 3.1 ADDITIONS:
- idempotency_key field for checkout requests
- Extended status enum documentation
"""

from rest_framework import serializers
from .models import Sale, SaleItem


class SaleItemSerializer(serializers.ModelSerializer):
    """Serializer for SaleItem (read-only)."""
    
    variant_sku = serializers.CharField(source='variant.sku', read_only=True)
    variant_barcode = serializers.CharField(source='variant.barcode', read_only=True)
    product_name = serializers.CharField(source='variant.product.name', read_only=True)
    size = serializers.CharField(source='variant.size', read_only=True)
    color = serializers.CharField(source='variant.color', read_only=True)
    
    class Meta:
        model = SaleItem
        fields = [
            'id', 'variant', 'variant_sku', 'variant_barcode', 'product_name',
            'size', 'color', 'quantity', 'selling_price', 'line_total'
        ]
        read_only_fields = fields


class SaleSerializer(serializers.ModelSerializer):
    """Serializer for Sale (read-only)."""
    
    items = SaleItemSerializer(many=True, read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    warehouse_code = serializers.CharField(source='warehouse.code', read_only=True)
    
    class Meta:
        model = Sale
        fields = [
            'id', 'idempotency_key', 'sale_number', 'warehouse', 'warehouse_name',
            'warehouse_code', 'total_amount', 'total_items', 'payment_method',
            'status', 'failure_reason', 'created_by', 'created_at', 'items'
        ]
        read_only_fields = fields


class SaleListSerializer(serializers.ModelSerializer):
    """Compact serializer for sale list."""
    
    warehouse_code = serializers.CharField(source='warehouse.code', read_only=True)
    
    class Meta:
        model = Sale
        fields = [
            'id', 'idempotency_key', 'sale_number', 'warehouse_code', 'total_amount',
            'total_items', 'payment_method', 'status', 'created_at'
        ]
        read_only_fields = fields


class BarcodeScanSerializer(serializers.Serializer):
    """Serializer for barcode scan request."""
    
    barcode = serializers.CharField(max_length=50)
    warehouse_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1, default=1)


class BarcodeScanResponseSerializer(serializers.Serializer):
    """Serializer for barcode scan response."""
    
    variant_id = serializers.CharField()
    barcode = serializers.CharField()
    sku = serializers.CharField()
    product_name = serializers.CharField()
    size = serializers.CharField(allow_null=True)
    color = serializers.CharField(allow_null=True)
    selling_price = serializers.CharField()
    available_stock = serializers.IntegerField()
    requested_quantity = serializers.IntegerField()
    can_fulfill = serializers.BooleanField()
    warehouse_id = serializers.CharField()
    warehouse_name = serializers.CharField()


class SaleItemInputSerializer(serializers.Serializer):
    """Serializer for individual sale item input."""
    
    barcode = serializers.CharField(max_length=50)
    quantity = serializers.IntegerField(min_value=1, default=1)


class CheckoutSerializer(serializers.Serializer):
    """
    Serializer for checkout request.
    
    IDEMPOTENCY:
    - idempotency_key is REQUIRED
    - Must be a valid UUID v4
    - Same key returns same sale (no duplicate processing)
    
    STATUS LIFECYCLE:
    - Sale starts as PENDING
    - Transitions to COMPLETED on success
    - Transitions to FAILED on exception
    """
    
    idempotency_key = serializers.UUIDField(
        required=True,
        help_text=(
            "Client-generated UUID for idempotency. "
            "If a sale exists with this key, it will be returned instead of creating a new one."
        )
    )
    items = SaleItemInputSerializer(many=True)
    warehouse_id = serializers.UUIDField()
    payment_method = serializers.ChoiceField(
        choices=Sale.PaymentMethod.choices
    )
    
    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one item is required")
        return value


class CheckoutResponseSerializer(serializers.Serializer):
    """
    Serializer for checkout response.
    
    STATUS VALUES:
    - PENDING: Checkout in progress
    - COMPLETED: Checkout successful
    - FAILED: Checkout failed
    - CANCELLED: Voided (future)
    """
    
    success = serializers.BooleanField()
    idempotency_key = serializers.UUIDField()
    is_duplicate = serializers.BooleanField(
        help_text="True if this was an idempotent hit (existing sale returned)"
    )
    sale_id = serializers.CharField()
    sale_number = serializers.CharField()
    total_amount = serializers.CharField()
    total_items = serializers.IntegerField()
    payment_method = serializers.CharField()
    status = serializers.CharField()
    message = serializers.CharField()
