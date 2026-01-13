"""
Sales Models for TRAP Inventory System.
Implements POS-grade sales with immutable financial events.

SALES RULES:
- Sale is a financial event, not just stock reduction
- Sales are IMMUTABLE (no update/delete)
- Prices are snapshotted at time of sale
- Corrections via returns (future phase)
"""

import uuid
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal

from inventory.models import Warehouse, ProductVariant


def generate_sale_number():
    """Generate a unique, human-readable sale number."""
    import time
    import random
    
    # Format: SALE-YYYYMMDD-XXXX
    timestamp = time.strftime('%Y%m%d')
    random_suffix = ''.join([str(random.randint(0, 9)) for _ in range(4)])
    return f"SALE-{timestamp}-{random_suffix}"


class Sale(models.Model):
    """
    Represents a completed sale transaction.
    
    IMMUTABILITY RULES:
    - Cannot be updated after creation
    - Cannot be deleted
    - Corrections via returns workflow (future)
    """
    
    class PaymentMethod(models.TextChoices):
        CASH = 'CASH', 'Cash'
        UPI = 'UPI', 'UPI'
        CARD = 'CARD', 'Card'
    
    class Status(models.TextChoices):
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sale_number = models.CharField(
        max_length=50,
        unique=True,
        default=generate_sale_number,
        help_text="Human-readable sale reference number"
    )
    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.PROTECT,
        related_name='sales'
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    total_items = models.PositiveIntegerField(default=0)
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.COMPLETED
    )
    created_by = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Sale'
        verbose_name_plural = 'Sales'
        indexes = [
            models.Index(fields=['sale_number']),
            models.Index(fields=['created_at']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.sale_number} - ₹{self.total_amount}"

    def save(self, *args, **kwargs):
        """Prevent updates on existing sales."""
        if self.pk:
            existing = Sale.objects.filter(pk=self.pk).exists()
            if existing:
                raise ValueError("Sale records cannot be modified. Create a return instead.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """Prevent deletion of sales."""
        raise ValueError("Sale records cannot be deleted. Use cancellation or return workflow.")


class SaleItem(models.Model):
    """
    Represents a line item in a sale.
    
    PRICE SNAPSHOT:
    - selling_price is captured at time of sale
    - Does NOT reference current variant price
    - Ensures invoices are reproducible forever
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sale = models.ForeignKey(
        Sale,
        on_delete=models.PROTECT,
        related_name='items'
    )
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.PROTECT,
        related_name='sale_items'
    )
    quantity = models.PositiveIntegerField(
        validators=[MinValueValidator(1)]
    )
    selling_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Price at time of sale (snapshotted)"
    )
    line_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="quantity × selling_price"
    )

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.sale.sale_number} - {self.variant.sku} × {self.quantity}"

    def save(self, *args, **kwargs):
        """Calculate line total and prevent updates."""
        if self.pk:
            existing = SaleItem.objects.filter(pk=self.pk).exists()
            if existing:
                raise ValueError("SaleItem records cannot be modified.")
        
        # Calculate line total
        self.line_total = self.quantity * self.selling_price
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """Prevent deletion of sale items."""
        raise ValueError("SaleItem records cannot be deleted.")
