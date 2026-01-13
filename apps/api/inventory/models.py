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
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    brand = models.CharField(max_length=100)
    category = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.brand} - {self.name}"


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
