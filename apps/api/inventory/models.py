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
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name='variants'
    )
    sku = models.CharField(max_length=50, unique=True)
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

    def get_total_stock(self):
        """Get total stock across all warehouses from snapshot."""
        from django.db.models import Sum
        result = self.stock_snapshots.aggregate(total=Sum('quantity'))
        return result['total'] or 0


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
