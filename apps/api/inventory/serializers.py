"""
Inventory Serializers for TRAP Inventory System.

HARDENING RULES:
- Price updates blocked if stock > 0
- StockLedger is read-only
- All fields properly validated
- Barcode is immutable after creation
- SKU is immutable after creation
- Margin percentage is computed, read-only
- Attributes must be a valid JSON object (Phase 10.1)
"""

from decimal import Decimal
from typing import Any
from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from .models import (
    Warehouse, Product, ProductVariant, StockLedger, StockSnapshot,
    ProductPricing, ProductImage
)


# =============================================================================
# PHASE 10.1: ATTRIBUTE VALIDATION
# =============================================================================

def validate_product_attributes(attrs: Any) -> dict:
    """
    Validate the attributes field for a Product.
    
    Phase 10.1 Rules:
    - Must be a dict (JSON object)
    - Keys must be strings
    - Values must be: string, number, or list of strings
    - No nested objects
    - No mixed-type arrays
    - Null is NOT allowed (use empty dict instead)
    
    Valid Example:
        {
            "sizes": ["S", "M", "L"],
            "colors": ["Black", "White"],
            "pattern": "Solid",
            "fit": "Slim",
            "material": "Cotton"
        }
    
    Args:
        attrs: The attributes value to validate
    
    Returns:
        Validated attributes dict
    
    Raises:
        serializers.ValidationError: If validation fails
    """
    # Allow empty dict
    if attrs is None:
        raise serializers.ValidationError(
            "Invalid attributes format: null is not allowed. Use empty object {} instead."
        )
    
    # Must be a dict
    if not isinstance(attrs, dict):
        raise serializers.ValidationError(
            f"Invalid attributes format: expected object, got {type(attrs).__name__}. "
            "Attributes must be a JSON object like {\"sizes\": [\"S\", \"M\"], \"color\": \"Blue\"}."
        )
    
    # Validate each key-value pair
    for key, value in attrs.items():
        # Keys must be strings
        if not isinstance(key, str):
            raise serializers.ValidationError(
                f"Invalid attributes format: key '{key}' must be a string."
            )
        
        # Validate value type
        if value is None:
            # Allow null values for optional attributes
            continue
        elif isinstance(value, str):
            # String value - OK
            continue
        elif isinstance(value, (int, float)) and not isinstance(value, bool):
            # Number value - OK (but not bool which is subclass of int)
            continue
        elif isinstance(value, list):
            # Must be list of strings only
            if not value:
                # Empty list - OK
                continue
            
            # Check for mixed types
            first_type = type(value[0])
            for i, item in enumerate(value):
                if not isinstance(item, str):
                    raise serializers.ValidationError(
                        f"Invalid attributes format: '{key}' array must contain only strings. "
                        f"Found {type(item).__name__} at index {i}."
                    )
        elif isinstance(value, dict):
            # Nested objects not allowed
            raise serializers.ValidationError(
                f"Invalid attributes format: nested objects not allowed. "
                f"Key '{key}' contains an object."
            )
        else:
            raise serializers.ValidationError(
                f"Invalid attributes format: value for '{key}' must be string, number, or array of strings. "
                f"Got {type(value).__name__}."
            )
    
    return attrs


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
    barcode_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductVariant
        fields = [
            'id', 'sku', 'barcode', 'barcode_image_url', 'size', 'color', 'cost_price', 'selling_price',
            'reorder_threshold', 'is_active', 'total_stock', 'warehouse_stock',
            'created_at'
        ]
        read_only_fields = ['id', 'barcode', 'barcode_image_url', 'created_at', 'total_stock', 'warehouse_stock']
    
    @extend_schema_field(serializers.IntegerField())
    def get_total_stock(self, obj):
        """
        Get total stock from InventoryMovement ledger.
        Phase 11.2: Stock = SUM(inventory_movements.quantity)
        """
        from . import services
        return services.get_product_stock(obj.product_id)
    
    @extend_schema_field(WarehouseStockSerializer(many=True))
    def get_warehouse_stock(self, obj):
        """
        Get warehouse-wise stock breakdown.
        Phase 11.2: Returns empty list since ledger is product-level.
        """
        # Phase 12 will add warehouse-level breakdown
        return []
    
    @extend_schema_field(serializers.CharField())
    def get_barcode_image_url(self, obj):
        """Get URL for barcode image."""
        if obj.barcode:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(f'/api/v1/inventory/barcodes/{obj.barcode}/image/')
            return f'/api/v1/inventory/barcodes/{obj.barcode}/image/'
        return None


class ProductVariantCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating ProductVariant with optional initial stock."""
    
    initial_stock = serializers.IntegerField(
        required=False,
        default=0,
        min_value=0,
        help_text="Initial stock quantity to add (requires warehouse_id in parent)"
    )
    
    class Meta:
        model = ProductVariant
        fields = ['sku', 'size', 'color', 'cost_price', 'selling_price', 'reorder_threshold', 'initial_stock']


class ProductVariantUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating ProductVariant.
    
    HARDENING: Price changes blocked if stock exists.
    """
    
    class Meta:
        model = ProductVariant
        fields = ['sku', 'size', 'color', 'cost_price', 'selling_price', 'reorder_threshold', 'is_active']
    
    def validate(self, attrs):
        """
        Block price changes if stock exists.
        Phase 11.2: Uses ledger-derived stock.
        """
        instance = self.instance
        
        if instance:
            from . import services
            # Phase 11.2: Get stock from InventoryMovement ledger
            current_stock = services.get_product_stock(instance.product_id)
            
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


# =============================================================================
# PHASE 10A: PRODUCT MASTER SERIALIZERS
# =============================================================================

class ProductPricingSerializer(serializers.ModelSerializer):
    """
    Serializer for ProductPricing.
    
    margin_percentage is READ-ONLY and computed from cost_price and selling_price.
    """
    margin_percentage = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        read_only=True,
        help_text="Computed: ((selling_price - cost_price) / cost_price) * 100"
    )
    profit_amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True,
        help_text="Computed: selling_price - cost_price"
    )
    gst_amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True,
        help_text="Computed GST amount based on selling price"
    )
    
    class Meta:
        model = ProductPricing
        fields = [
            'id', 'cost_price', 'mrp', 'selling_price', 'gst_percentage',
            'margin_percentage', 'profit_amount', 'gst_amount',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'margin_percentage', 'profit_amount', 'gst_amount',
            'created_at', 'updated_at'
        ]


class ProductImageSerializer(serializers.ModelSerializer):
    """Serializer for ProductImage."""
    
    class Meta:
        model = ProductImage
        fields = ['id', 'image_url', 'is_primary', 'created_at']
        read_only_fields = ['id', 'created_at']


class ProductSerializer(serializers.ModelSerializer):
    """
    Serializer for Product with nested variants, pricing, and images.
    
    Phase 10A includes:
    - SKU and barcode at product level
    - JSONB attributes for flexible apparel data
    - Nested pricing with computed margin
    - Product images
    - Soft delete via is_deleted flag
    """
    
    variants = ProductVariantSerializer(many=True, read_only=True)
    pricing = ProductPricingSerializer(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    total_stock = serializers.SerializerMethodField()
    barcode_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'sku', 'barcode_value', 'barcode_image_url',
            'brand', 'brand_id', 'category', 'category_id', 'description',
            'country_of_origin', 'attributes',
            'gender', 'material', 'season',
            'is_active', 'is_deleted',
            'pricing', 'images', 'variants', 'total_stock',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'sku', 'barcode_value', 'barcode_image_url',
            'created_at', 'updated_at', 'total_stock'
        ]
    
    @extend_schema_field(serializers.IntegerField())
    def get_total_stock(self, obj):
        """
        Get total stock derived from InventoryMovement ledger.
        
        Phase 11.1: Stock = SUM(inventory_movements.quantity)
        
        Uses annotated field if available, otherwise queries ledger.
        """
        # Check for annotated field (from queryset annotation)
        if hasattr(obj, 'available_stock'):
            return obj.available_stock or 0
        
        # Fall back to service function
        from . import services
        return services.get_product_stock(obj.id)
    
    @extend_schema_field(serializers.CharField())
    def get_barcode_image_url(self, obj):
        """Get URL for barcode image."""
        if obj.barcode_value:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(f'/api/v1/inventory/barcodes/{obj.barcode_value}/image/')
            return f'/api/v1/inventory/barcodes/{obj.barcode_value}/image/'
        return obj.barcode_image_url


class ProductCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a Product with variants and optional initial stock.
    
    To add initial stock on create:
    1. Include warehouse_id at the root level
    2. Include initial_stock in each variant
    """
    
    variants = ProductVariantCreateSerializer(many=True, required=False)
    warehouse_id = serializers.UUIDField(
        required=False,
        write_only=True,
        help_text="Warehouse to add initial stock to (required if any variant has initial_stock > 0)"
    )
    
    class Meta:
        model = Product
        fields = [
            'name', 'brand', 'category', 'description',
            'country_of_origin', 'attributes',
            'gender', 'material', 'season',
            'is_active', 'variants', 'warehouse_id'
        ]
    
    def validate_attributes(self, value):
        """Phase 10.1: Validate attributes JSON structure."""
        if value is None:
            return {}
        return validate_product_attributes(value)
    
    def validate(self, attrs):
        """Validate that warehouse_id is provided if initial_stock is specified."""
        variants_data = attrs.get('variants', [])
        warehouse_id = attrs.get('warehouse_id')
        
        has_initial_stock = any(
            v.get('initial_stock', 0) > 0 for v in variants_data
        )
        
        if has_initial_stock and not warehouse_id:
            raise serializers.ValidationError({
                'warehouse_id': 'Warehouse is required when adding initial stock'
            })
        
        if warehouse_id:
            try:
                Warehouse.objects.get(id=warehouse_id, is_active=True)
            except Warehouse.DoesNotExist:
                raise serializers.ValidationError({
                    'warehouse_id': 'Warehouse not found or inactive'
                })
        
        return attrs
    
    def create(self, validated_data):
        from . import services
        
        variants_data = validated_data.pop('variants', [])
        warehouse_id = validated_data.pop('warehouse_id', None)
        product = Product.objects.create(**validated_data)
        
        warehouse = None
        if warehouse_id:
            warehouse = Warehouse.objects.get(id=warehouse_id)
        
        for variant_data in variants_data:
            initial_stock = variant_data.pop('initial_stock', 0)
            variant = ProductVariant.objects.create(product=product, **variant_data)
            
            # Add initial stock if specified
            if initial_stock > 0 and warehouse:
                request = self.context.get('request')
                created_by = request.user.username if request and request.user.is_authenticated else 'system'
                
                services.record_purchase(
                    variant=variant,
                    warehouse=warehouse,
                    quantity=initial_stock,
                    reference_id=f"INITIAL-{product.id}",
                    notes=f"Initial stock on product creation",
                    created_by=created_by
                )
        
        return product


class ProductUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating a Product.
    
    HARDENING:
    - Cannot update SKU or barcode (immutable)
    - Cannot update variants with stock through this serializer
    - Use the variant-specific endpoints for variant updates
    """
    
    pricing = ProductPricingSerializer(required=False)
    
    class Meta:
        model = Product
        fields = [
            'name', 'brand', 'brand_id', 'category', 'category_id', 'description',
            'country_of_origin', 'attributes',
            'gender', 'material', 'season',
            'is_active', 'pricing'
        ]
    
    def validate_attributes(self, value):
        """Phase 10.1: Validate attributes JSON structure."""
        if value is None:
            return {}
        return validate_product_attributes(value)
    
    def validate(self, attrs):
        """
        Phase 10.1 validation:
        - SKU immutability enforced in model.save()
        - Barcode immutability enforced in model.save()
        """
        return attrs
    
    def update(self, instance, validated_data):
        """Handle nested pricing update."""
        pricing_data = validated_data.pop('pricing', None)
        
        # Update product fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update pricing if provided
        if pricing_data:
            pricing, created = ProductPricing.objects.get_or_create(
                product=instance,
                defaults=pricing_data
            )
            if not created:
                for attr, value in pricing_data.items():
                    setattr(pricing, attr, value)
                pricing.save()
        
        return instance


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
    """Serializer for low/out of stock items (Phase 11.1: product-level)."""
    product_id = serializers.CharField()
    sku = serializers.CharField()
    product_name = serializers.CharField()
    quantity = serializers.IntegerField()
    threshold = serializers.IntegerField(required=False)


class StockSummarySerializer(serializers.Serializer):
    """
    Serializer for stock summary response.
    Phase 11.1: Stock derived from InventoryMovement ledger.
    """
    total_stock = serializers.IntegerField()
    total_products = serializers.IntegerField()
    low_stock_count = serializers.IntegerField()
    out_of_stock_count = serializers.IntegerField()
    low_stock_items = LowStockItemSerializer(many=True)
    out_of_stock_items = LowStockItemSerializer(many=True)


class POSVariantSerializer(serializers.Serializer):
    """
    Serializer for POS product grid - flattened variant view.
    Returns variants as sellable units with product info included.
    """
    id = serializers.UUIDField()
    name = serializers.CharField()  # Combined product name + variant info
    product_name = serializers.CharField()
    brand = serializers.CharField()
    category = serializers.CharField()
    sku = serializers.CharField()
    barcode = serializers.CharField()
    size = serializers.CharField(allow_null=True)
    color = serializers.CharField(allow_null=True)
    selling_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    cost_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    stock = serializers.IntegerField()  # Total stock across warehouses
    stock_status = serializers.CharField()  # IN_STOCK, LOW_STOCK, OUT_OF_STOCK
    reorder_threshold = serializers.IntegerField()
    barcode_image_url = serializers.CharField(allow_null=True)


# =============================================================================
# PHASE 11: INVENTORY LEDGER SERIALIZERS
# =============================================================================

from .models import InventoryMovement


class InventoryMovementSerializer(serializers.ModelSerializer):
    """
    Read serializer for InventoryMovement.
    Used for listing and retrieving movement records.
    """
    product_id = serializers.UUIDField(source='product.id', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = InventoryMovement
        fields = [
            'id',
            'product_id',
            'product_name',
            'product_sku',
            'warehouse_id',
            'movement_type',
            'quantity',
            'reference_type',
            'reference_id',
            'remarks',
            'created_by',
            'created_by_name',
            'created_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at']
    
    @extend_schema_field(serializers.CharField)
    def get_created_by_name(self, obj) -> str:
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.username
        return ""


class InventoryMovementCreateSerializer(serializers.Serializer):
    """
    Write serializer for creating InventoryMovement records.
    Validates business rules and delegates to service layer.
    """
    product_id = serializers.UUIDField(required=True)
    warehouse_id = serializers.UUIDField(required=False, allow_null=True)
    movement_type = serializers.ChoiceField(
        choices=InventoryMovement.MovementType.choices,
        required=True
    )
    quantity = serializers.IntegerField(required=True)
    reference_type = serializers.CharField(required=False, allow_blank=True, default="")
    reference_id = serializers.UUIDField(required=False, allow_null=True)
    remarks = serializers.CharField(required=False, allow_blank=True, default="")
    
    def validate(self, data):
        """
        Validate movement type and quantity sign.
        """
        movement_type = data.get('movement_type')
        quantity = data.get('quantity')
        
        # Validate quantity sign based on movement type
        if movement_type in InventoryMovement.POSITIVE_ONLY_TYPES and quantity <= 0:
            raise serializers.ValidationError({
                'quantity': f'{movement_type} movements must have positive quantity'
            })
        
        if movement_type in InventoryMovement.NEGATIVE_ONLY_TYPES and quantity >= 0:
            raise serializers.ValidationError({
                'quantity': f'{movement_type} movements must have negative quantity'
            })
        
        if quantity == 0:
            raise serializers.ValidationError({
                'quantity': 'Quantity cannot be zero'
            })
        
        return data
    
    def create(self, validated_data):
        """
        Create movement using service layer.
        """
        from . import services
        
        user = self.context.get('request').user
        
        try:
            movement = services.create_inventory_movement(
                product_id=validated_data['product_id'],
                movement_type=validated_data['movement_type'],
                quantity=validated_data['quantity'],
                user=user,
                warehouse_id=validated_data.get('warehouse_id'),
                reference_type=validated_data.get('reference_type', ''),
                reference_id=validated_data.get('reference_id'),
                remarks=validated_data.get('remarks', '')
            )
            return movement
        except services.InvalidMovementError as e:
            raise serializers.ValidationError({'detail': str(e)})
        except services.InsufficientProductStockError as e:
            raise serializers.ValidationError({'detail': str(e)})


class ProductStockSerializer(serializers.Serializer):
    """
    Read serializer for derived product stock.
    Stock is calculated from sum of movements, not stored.
    """
    product_id = serializers.UUIDField()
    available_stock = serializers.IntegerField()

