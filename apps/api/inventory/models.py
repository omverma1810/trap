"""
Inventory Models for TRAP Inventory System.
Implements ledger-based stock management with immutable audit trail.
"""

import uuid
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal


class Warehouse(models.Model):
    """
    Represents a physical warehouse or storage location.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    address = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Warehouses'

    def __str__(self):
        return f"{self.name} ({self.code})"


class Product(models.Model):
    """
    Represents a product in the inventory.
    Products can have multiple variants (size, color, etc.)
    
    PHASE 10A - PRODUCT MASTER UPGRADE:
    - SKU: Unique product identifier (auto-generated if not provided)
    - barcode_value: Code128 barcode (auto-generated, immutable)
    - attributes: Flexible JSONB for apparel data (sizes, colors, etc.)
    - is_deleted: Soft delete flag (separate from is_active)
    
    APPAREL ATTRIBUTES:
    - gender: Target gender for the product
    - material: Primary material/fabric
    - season: Season collection (optional)
    """
    
    class Gender(models.TextChoices):
        MENS = 'MENS', "Men's"
        WOMENS = 'WOMENS', "Women's"
        UNISEX = 'UNISEX', 'Unisex'
        KIDS = 'KIDS', 'Kids'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    
    # Phase 10A: SKU and Barcode at product level
    sku = models.CharField(
        max_length=100,
        unique=True,
        blank=True,
        null=True,
        db_index=True,
        help_text="Unique product SKU (auto-generated if not provided)"
    )
    barcode_value = models.CharField(
        max_length=128,
        unique=True,
        blank=True,
        null=True,
        db_index=True,
        help_text="Code128 barcode value (auto-generated, immutable)"
    )
    barcode_image_url = models.TextField(
        blank=True,
        null=True,
        help_text="URL to barcode SVG image"
    )
    
    # Brand and Category (keep existing CharFields, add optional UUID refs for future)
    brand = models.CharField(max_length=100)
    brand_id = models.UUIDField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Optional reference to Brand entity"
    )
    category = models.CharField(max_length=100)
    category_id = models.UUIDField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Optional reference to Category entity"
    )
    
    description = models.TextField(blank=True, null=True)
    country_of_origin = models.CharField(max_length=100, blank=True)
    
    # Phase 10A: Flexible JSONB attributes for apparel
    attributes = models.JSONField(
        default=dict,
        blank=True,
        help_text="Flexible attributes: sizes, colors, pattern, fit, material, season, etc."
    )
    
    # Apparel-specific fields (kept for backward compatibility)
    gender = models.CharField(
        max_length=50,
        choices=Gender.choices,
        default=Gender.UNISEX,
        blank=True,
        null=True,
        help_text="Target gender for the product"
    )
    material = models.CharField(
        max_length=100,
        blank=True,
        help_text="Primary material/fabric (e.g., 100% Cotton, Cotton/Polyester Blend)"
    )
    season = models.CharField(
        max_length=50,
        blank=True,
        help_text="Season collection (e.g., SS24, FW23)"
    )
    
    # Status flags
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Soft delete flag. Deleted products hidden from POS, visible in admin."
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['is_active', 'is_deleted']),
            models.Index(fields=['brand', 'category']),
        ]

    def __str__(self):
        return f"{self.brand} - {self.name}"
    
    def save(self, *args, **kwargs):
        """
        Override save to:
        1. Auto-generate SKU if not provided
        2. Auto-generate barcode if not provided
        3. Prevent barcode modification after creation
        """
        from .barcode_utils import generate_sku, generate_barcode_value, generate_barcode_svg
        
        is_new = self._state.adding
        
        # Auto-generate SKU on creation if not provided
        if not self.sku:
            self.sku = generate_sku(self.name, self.brand)
            # Ensure uniqueness
            counter = 1
            original_sku = self.sku
            while Product.objects.filter(sku=self.sku).exclude(pk=self.pk).exists():
                self.sku = f"{original_sku}-{counter}"
                counter += 1
        
        # Auto-generate barcode on creation if not provided
        if is_new and not self.barcode_value:
            self.barcode_value = generate_barcode_value()
            # Ensure uniqueness
            while Product.objects.filter(barcode_value=self.barcode_value).exists():
                self.barcode_value = generate_barcode_value()
            
            # Generate barcode SVG image
            try:
                self.barcode_image_url = generate_barcode_svg(self.barcode_value)
            except Exception:
                pass  # Barcode image generation is optional
        
        # Prevent barcode modification after creation
        elif not is_new:
            try:
                old_instance = Product.objects.get(pk=self.pk)
                if old_instance.barcode_value and self.barcode_value != old_instance.barcode_value:
                    raise ValueError("Barcode cannot be modified after creation.")
            except Product.DoesNotExist:
                pass
        
        super().save(*args, **kwargs)


class ProductVariant(models.Model):
    """
    Represents a specific variant of a product (e.g., size/color combination).
    Stock is NOT stored here - it's calculated from StockLedger.
    
    BARCODE RULES:
    - Each variant has a unique barcode
    - Barcode is auto-generated on creation
    - Barcode is immutable (cannot be changed after creation)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name='variants'
    )
    sku = models.CharField(max_length=50, unique=True)
    barcode = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        blank=True,
        null=True,
        help_text="Unique barcode for POS scanning. Auto-generated on creation."
    )
    size = models.CharField(max_length=20, blank=True, null=True)
    color = models.CharField(max_length=50, blank=True, null=True)
    cost_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    selling_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    reorder_threshold = models.PositiveIntegerField(default=10)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sku']

    def __str__(self):
        variant_info = []
        if self.size:
            variant_info.append(self.size)
        if self.color:
            variant_info.append(self.color)
        variant_str = " / ".join(variant_info) if variant_info else "Default"
        return f"{self.product.name} - {variant_str} ({self.sku})"

    def save(self, *args, **kwargs):
        """Auto-generate barcode on creation, prevent barcode changes."""
        is_new = self._state.adding
        
        if is_new and not self.barcode:
            # Auto-generate barcode on creation
            self.barcode = self._generate_barcode()
        elif not is_new:
            # Check if barcode is being changed
            try:
                old_instance = ProductVariant.objects.get(pk=self.pk)
                if old_instance.barcode and old_instance.barcode != self.barcode:
                    raise ValueError("Barcode cannot be modified after creation.")
            except ProductVariant.DoesNotExist:
                pass
        
        super().save(*args, **kwargs)
    
    def _generate_barcode(self):
        """
        Generate a unique EAN-13 style barcode.
        Format: 2 (internal) + 11 random digits + check digit = 13 digits
        """
        import random
        import time
        
        # Use timestamp + random for uniqueness
        timestamp_part = str(int(time.time() * 1000))[-6:]
        random_part = ''.join([str(random.randint(0, 9)) for _ in range(5)])
        
        # EAN-13 prefix "2" indicates internal use (12 digits before check)
        base = f"2{timestamp_part}{random_part}"
        
        # Calculate EAN-13 check digit
        check_digit = self._calculate_ean13_check_digit(base)
        barcode = f"{base}{check_digit}"
        
        # Ensure uniqueness
        while ProductVariant.objects.filter(barcode=barcode).exists():
            random_part = ''.join([str(random.randint(0, 9)) for _ in range(5)])
            base = f"2{timestamp_part}{random_part}"
            check_digit = self._calculate_ean13_check_digit(base)
            barcode = f"{base}{check_digit}"
        
        return barcode
    
    @staticmethod
    def _calculate_ean13_check_digit(code):
        """Calculate EAN-13 check digit."""
        total = 0
        for i, digit in enumerate(code[:12]):
            if i % 2 == 0:
                total += int(digit)
            else:
                total += int(digit) * 3
        check_digit = (10 - (total % 10)) % 10
        return str(check_digit)

    def get_total_stock(self):
        """Get total stock across all warehouses from snapshot."""
        from django.db.models import Sum
        result = self.stock_snapshots.aggregate(total=Sum('quantity'))
        return result['total'] or 0
    
    def get_stock_in_warehouse(self, warehouse):
        """Get stock for a specific warehouse."""
        try:
            from .models import StockSnapshot
            snapshot = StockSnapshot.objects.get(variant=self, warehouse=warehouse)
            return snapshot.quantity
        except StockSnapshot.DoesNotExist:
            return 0


class StockLedger(models.Model):
    """
    Immutable ledger for all stock movements.
    Stock = SUM of ledger events, not a field to edit.
    
    RULES:
    - Entries are APPEND-ONLY
    - NO updates allowed
    - NO deletes allowed
    - Corrections happen via new adjustment events
    """
    
    class EventType(models.TextChoices):
        PURCHASE = 'PURCHASE', 'Purchase'
        SALE = 'SALE', 'Sale'
        RETURN = 'RETURN', 'Return'
        ADJUSTMENT = 'ADJUSTMENT', 'Adjustment'
    
    class ReferenceType(models.TextChoices):
        PURCHASE = 'purchase', 'Purchase Order'
        SALE = 'sale', 'Sales Order'
        ADJUSTMENT = 'adjustment', 'Stock Adjustment'
        RETURN = 'return', 'Return'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.PROTECT,
        related_name='ledger_entries'
    )
    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.PROTECT,
        related_name='ledger_entries'
    )
    event_type = models.CharField(
        max_length=20,
        choices=EventType.choices
    )
    quantity = models.IntegerField(
        help_text="Positive for additions, negative for deductions"
    )
    reference_type = models.CharField(
        max_length=20,
        choices=ReferenceType.choices
    )
    reference_id = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True)
    created_by = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Stock Ledger Entry'
        verbose_name_plural = 'Stock Ledger Entries'
        # Prevent any modifications - this is enforced at DB level
        indexes = [
            models.Index(fields=['variant', 'warehouse']),
            models.Index(fields=['event_type']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        sign = '+' if self.quantity > 0 else ''
        return f"{self.variant.sku} | {self.event_type} | {sign}{self.quantity} @ {self.warehouse.code}"

    def save(self, *args, **kwargs):
        """Override save to prevent updates on existing entries."""
        if self.pk:
            # Check if this is an existing record
            existing = StockLedger.objects.filter(pk=self.pk).exists()
            if existing:
                raise ValueError("StockLedger entries cannot be modified. Create a new adjustment entry instead.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """Override delete to prevent deletion."""
        raise ValueError("StockLedger entries cannot be deleted. Create a new adjustment entry instead.")


class StockSnapshot(models.Model):
    """
    Performance cache for current stock levels.
    This is DERIVED from StockLedger - never edit directly.
    Updated automatically when ledger entries are created.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.CASCADE,
        related_name='stock_snapshots'
    )
    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.CASCADE,
        related_name='stock_snapshots'
    )
    quantity = models.IntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['variant', 'warehouse']
        ordering = ['variant__sku', 'warehouse__code']
        verbose_name = 'Stock Snapshot'
        verbose_name_plural = 'Stock Snapshots'

    def __str__(self):
        return f"{self.variant.sku} @ {self.warehouse.code}: {self.quantity}"

    @classmethod
    def recalculate(cls, variant, warehouse):
        """
        Recalculate snapshot from ledger entries.
        This is the source of truth calculation.
        """
        from django.db.models import Sum
        
        total = StockLedger.objects.filter(
            variant=variant,
            warehouse=warehouse
        ).aggregate(total=Sum('quantity'))['total'] or 0
        
        snapshot, created = cls.objects.update_or_create(
            variant=variant,
            warehouse=warehouse,
            defaults={'quantity': total}
        )
        return snapshot


# =============================================================================
# PHASE 10A: PRODUCT MASTER MODELS
# =============================================================================

class ProductPricing(models.Model):
    """
    Separate pricing table for products.
    
    RULES:
    - OneToOne relationship with Product
    - margin_percentage is READ-ONLY computed property
    - GST percentage stored for tax calculations
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.OneToOneField(
        Product,
        on_delete=models.CASCADE,
        related_name='pricing'
    )
    cost_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Cost price / purchase price"
    )
    mrp = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Maximum Retail Price"
    )
    selling_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Actual selling price"
    )
    gst_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="GST percentage (e.g., 5.00, 12.00, 18.00)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Product Pricing'
        verbose_name_plural = 'Product Pricing'

    def __str__(self):
        return f"{self.product.name} - ₹{self.selling_price}"
    
    @property
    def margin_percentage(self) -> Decimal:
        """
        Computed margin percentage.
        READ-ONLY: Cannot be set directly.
        Formula: ((selling_price - cost_price) / cost_price) * 100
        """
        if self.cost_price and self.cost_price > 0:
            margin = ((self.selling_price - self.cost_price) / self.cost_price) * 100
            return round(margin, 2)
        return Decimal('0.00')
    
    @property
    def profit_amount(self) -> Decimal:
        """Computed profit per unit."""
        return self.selling_price - self.cost_price
    
    @property
    def gst_amount(self) -> Decimal:
        """Computed GST amount based on selling price."""
        if self.gst_percentage and self.gst_percentage > 0:
            # GST inclusive calculation
            gst = (self.selling_price * self.gst_percentage) / (100 + self.gst_percentage)
            return round(gst, 2)
        return Decimal('0.00')


class ProductImage(models.Model):
    """
    Product images with support for primary image flag.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='images'
    )
    image_url = models.TextField(
        help_text="URL to the product image"
    )
    is_primary = models.BooleanField(
        default=False,
        help_text="Is this the primary/main product image?"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-is_primary', '-created_at']
        verbose_name = 'Product Image'
        verbose_name_plural = 'Product Images'

    def __str__(self):
        primary = " (Primary)" if self.is_primary else ""
        return f"{self.product.name} - Image{primary}"
    
    def save(self, *args, **kwargs):
        """Ensure only one primary image per product."""
        if self.is_primary:
            # Set all other images for this product to non-primary
            ProductImage.objects.filter(
                product=self.product,
                is_primary=True
            ).exclude(pk=self.pk).update(is_primary=False)
        super().save(*args, **kwargs)
