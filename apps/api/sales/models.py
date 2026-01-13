"""
Sales Models for TRAP Inventory System.
Implements POS-grade sales with immutable financial events.

SALES RULES:
- Sale is a financial event, not just stock reduction
- Sales are IMMUTABLE (no update/delete)
- Prices are snapshotted at time of sale
- Corrections via returns (future phase)

PHASE 3.1 ADDITIONS:
- Idempotency key for duplicate checkout prevention
- Extended status lifecycle (PENDING, COMPLETED, FAILED, CANCELLED)
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
    - Cannot be updated after creation (except status transitions)
    - Cannot be deleted
    - Corrections via returns workflow (future)
    
    IDEMPOTENCY:
    - Each checkout must have a unique idempotency_key
    - Duplicate key returns existing sale (no double processing)
    
    STATUS LIFECYCLE:
    - PENDING → COMPLETED (success)
    - PENDING → FAILED (exception, rollback)
    - FAILED → COMPLETED: NOT ALLOWED
    - COMPLETED → CANCELLED: NOT ALLOWED in 3.1
    """
    
    class PaymentMethod(models.TextChoices):
        CASH = 'CASH', 'Cash'
        UPI = 'UPI', 'UPI'
        CARD = 'CARD', 'Card'
    
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        COMPLETED = 'COMPLETED', 'Completed'
        FAILED = 'FAILED', 'Failed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    idempotency_key = models.UUIDField(
        unique=True,
        db_index=True,
        default=uuid.uuid4,
        help_text="Client-provided key to prevent duplicate checkouts"
    )
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
        default=Status.PENDING
    )
    failure_reason = models.TextField(
        blank=True,
        null=True,
        help_text="Reason for FAILED status"
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
            models.Index(fields=['idempotency_key']),
        ]

    def __str__(self):
        return f"{self.sale_number} - ₹{self.total_amount} ({self.status})"

    def save(self, *args, **kwargs):
        """
        Control save behavior based on status transitions.
        
        ALLOWED:
        - New record creation
        - PENDING → COMPLETED transition
        - PENDING → FAILED transition
        
        NOT ALLOWED:
        - Any other modification on existing records
        """
        if self.pk:
            try:
                existing = Sale.objects.get(pk=self.pk)
                # Only allow status transitions from PENDING
                if existing.status == self.Status.PENDING:
                    if self.status in [self.Status.COMPLETED, self.Status.FAILED]:
                        # Allow this specific transition
                        super().save(*args, **kwargs)
                        return
                raise ValueError(
                    f"Sale records cannot be modified. "
                    f"Current status: {existing.status}"
                )
            except Sale.DoesNotExist:
                pass
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """Prevent deletion of sales."""
        raise ValueError("Sale records cannot be deleted. Use cancellation or return workflow.")
    
    def mark_completed(self):
        """Transition sale to COMPLETED status."""
        if self.status != self.Status.PENDING:
            raise ValueError(f"Cannot complete sale: current status is {self.status}")
        self.status = self.Status.COMPLETED
        self.save()
    
    def mark_failed(self, reason: str = ""):
        """Transition sale to FAILED status."""
        if self.status != self.Status.PENDING:
            raise ValueError(f"Cannot fail sale: current status is {self.status}")
        self.status = self.Status.FAILED
        self.failure_reason = reason
        self.save()


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
