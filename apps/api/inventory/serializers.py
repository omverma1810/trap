"""
Inventory Serializers for TRAP Inventory System.

HARDENING RULES:
- Price updates blocked if stock > 0
- StockLedger is read-only
- All fields properly validated
"""

from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from .models import Warehouse, Product, ProductVariant, StockLedger, StockSnapshot


class WarehouseSerializer(serializers.ModelSerializer):
    """Serializer for Warehouse model."""
    
    class Meta:
        model = Warehouse
        fields = ['id', 'name', 'code', 'address', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class WarehouseStockSerializer(serializers.Serializer):
    """Serializer for warehouse stock breakdown."""
    warehouse_id = serializers.UUIDField()
    warehouse_name = serializers.CharField()
    warehouse_code = serializers.CharField()
    quantity = serializers.IntegerField()
    last_updated = serializers.DateTimeField()


class ProductVariantSerializer(serializers.ModelSerializer):
    """Serializer for ProductVariant with stock information."""
    
    total_stock = serializers.SerializerMethodField()
    warehouse_stock = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductVariant
        fields = [
            'id', 'sku', 'size', 'color', 'cost_price', 'selling_price',
            'reorder_threshold', 'is_active', 'total_stock', 'warehouse_stock',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'total_stock', 'warehouse_stock']
    
    @extend_schema_field(serializers.IntegerField())
    def get_total_stock(self, obj):
        """Get total stock across all warehouses."""
        return obj.get_total_stock()
    
    @extend_schema_field(WarehouseStockSerializer(many=True))
    def get_warehouse_stock(self, obj):
        """Get warehouse-wise stock breakdown."""
        from .services import get_variant_stock_breakdown
        return get_variant_stock_breakdown(obj)


class ProductVariantCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating ProductVariant."""
    
    class Meta:
        model = ProductVariant
        fields = ['sku', 'size', 'color', 'cost_price', 'selling_price', 'reorder_threshold']


class ProductVariantUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating ProductVariant.
    
    HARDENING: Price changes blocked if stock exists.
    """
    
    class Meta:
        model = ProductVariant
        fields = ['sku', 'size', 'color', 'cost_price', 'selling_price', 'reorder_threshold', 'is_active']
    
    def validate(self, attrs):
        """Block price changes if stock exists."""
        instance = self.instance
        
        if instance:
            current_stock = instance.get_total_stock()
            
            # Check if price fields are being modified
            cost_price_changed = (
                'cost_price' in attrs and 
                attrs['cost_price'] != instance.cost_price
            )
            selling_price_changed = (
                'selling_price' in attrs and 
                attrs['selling_price'] != instance.selling_price
            )
            
            if current_stock > 0 and (cost_price_changed or selling_price_changed):
                raise serializers.ValidationError({
                    "error": "Cannot modify price while stock exists",
                    "current_stock": current_stock,
                    "message": "Reduce stock to 0 before changing prices, or create a new variant"
                })
        
        return attrs


class ProductSerializer(serializers.ModelSerializer):
    """Serializer for Product with nested variants."""
    
    variants = ProductVariantSerializer(many=True, read_only=True)
    total_stock = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'brand', 'category', 'description',
            'is_active', 'variants', 'total_stock', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'total_stock']
    
    @extend_schema_field(serializers.IntegerField())
    def get_total_stock(self, obj):
        """Get total stock across all variants and warehouses."""
        total = 0
        for variant in obj.variants.all():
            total += variant.get_total_stock()
        return total


class ProductCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a Product with variants."""
    
    variants = ProductVariantCreateSerializer(many=True, required=False)
    
    class Meta:
        model = Product
        fields = ['name', 'brand', 'category', 'description', 'is_active', 'variants']
    
    def create(self, validated_data):
        variants_data = validated_data.pop('variants', [])
        product = Product.objects.create(**validated_data)
        
        for variant_data in variants_data:
            ProductVariant.objects.create(product=product, **variant_data)
        
        return product


class ProductUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating a Product.
    
    HARDENING: Cannot update variants with stock through this serializer.
    Use the variant-specific endpoints for variant updates.
    """
    
    class Meta:
        model = Product
        fields = ['name', 'brand', 'category', 'description', 'is_active']


class PurchaseStockSerializer(serializers.Serializer):
    """Serializer for recording a stock purchase."""
    
    warehouse_id = serializers.UUIDField()
    variant_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1)
    reference_id = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate_warehouse_id(self, value):
        try:
            Warehouse.objects.get(id=value, is_active=True)
        except Warehouse.DoesNotExist:
            raise serializers.ValidationError("Warehouse not found or inactive")
        return value
    
    def validate_variant_id(self, value):
        try:
            ProductVariant.objects.get(id=value, is_active=True)
        except ProductVariant.DoesNotExist:
            raise serializers.ValidationError("Product variant not found or inactive")
        return value
    
    def validate_quantity(self, value):
        if value == 0:
            raise serializers.ValidationError("Quantity cannot be zero")
        if value < 0:
            raise serializers.ValidationError("Quantity must be positive for purchases")
        return value


class AdjustStockSerializer(serializers.Serializer):
    """Serializer for stock adjustment (admin only)."""
    
    warehouse_id = serializers.UUIDField()
    variant_id = serializers.UUIDField()
    quantity = serializers.IntegerField(
        help_text="Positive to add, negative to subtract"
    )
    notes = serializers.CharField(required=True, min_length=10)
    allow_negative = serializers.BooleanField(default=False)
    
    def validate_warehouse_id(self, value):
        try:
            Warehouse.objects.get(id=value, is_active=True)
        except Warehouse.DoesNotExist:
            raise serializers.ValidationError("Warehouse not found or inactive")
        return value
    
    def validate_variant_id(self, value):
        try:
            ProductVariant.objects.get(id=value, is_active=True)
        except ProductVariant.DoesNotExist:
            raise serializers.ValidationError("Product variant not found or inactive")
        return value
    
    def validate_quantity(self, value):
        if value == 0:
            raise serializers.ValidationError("Quantity cannot be zero")
        return value
    
    def validate_notes(self, value):
        if not value or len(value.strip()) < 10:
            raise serializers.ValidationError(
                "Notes are required for adjustments (minimum 10 characters)"
            )
        return value


class StockLedgerSerializer(serializers.ModelSerializer):
    """
    Serializer for StockLedger entries.
    
    HARDENING: This serializer is READ-ONLY.
    - All fields are read-only
    - No create/update/delete operations allowed
    - Ledger entries are immutable
    """
    
    variant_sku = serializers.CharField(source='variant.sku', read_only=True)
    warehouse_code = serializers.CharField(source='warehouse.code', read_only=True)
    
    class Meta:
        model = StockLedger
        fields = [
            'id', 'variant', 'variant_sku', 'warehouse', 'warehouse_code',
            'event_type', 'quantity', 'reference_type', 'reference_id',
            'notes', 'created_by', 'created_at'
        ]
        read_only_fields = fields  # ALL fields are read-only
    
    def create(self, validated_data):
        """Block direct creation - use stock operation endpoints instead."""
        raise serializers.ValidationError(
            "Ledger entries cannot be created directly. Use /stock/purchase/ or /stock/adjust/"
        )
    
    def update(self, instance, validated_data):
        """Block updates - ledger is immutable."""
        raise serializers.ValidationError(
            "Ledger entries are immutable and cannot be updated. Create an ADJUSTMENT entry instead."
        )


class LowStockItemSerializer(serializers.Serializer):
    """Serializer for low stock items."""
    variant_id = serializers.CharField()
    sku = serializers.CharField()
    product_name = serializers.CharField()
    quantity = serializers.IntegerField()
    threshold = serializers.IntegerField(required=False)


class StockSummarySerializer(serializers.Serializer):
    """Serializer for stock summary response."""
    total_stock = serializers.IntegerField()
    total_variants = serializers.IntegerField()
    low_stock_count = serializers.IntegerField()
    out_of_stock_count = serializers.IntegerField()
    low_stock_items = LowStockItemSerializer(many=True)
    out_of_stock_items = LowStockItemSerializer(many=True)
