"""
Invoices app models - Invoice and payment tracking.
"""

from django.db import models
from django.conf import settings
import uuid


class Invoice(models.Model):
    """Invoice model for sales transactions."""
    
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        PENDING = 'pending', 'Pending Payment'
        PAID = 'paid', 'Paid'
        PARTIALLY_PAID = 'partially_paid', 'Partially Paid'
        CANCELLED = 'cancelled', 'Cancelled'
        REFUNDED = 'refunded', 'Refunded'
    
    class PaymentMethod(models.TextChoices):
        CASH = 'cash', 'Cash'
        CARD = 'card', 'Card'
        UPI = 'upi', 'UPI'
        BANK_TRANSFER = 'bank_transfer', 'Bank Transfer'
        OTHER = 'other', 'Other'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_number = models.CharField(max_length=50, unique=True)
    
    # Customer details
    customer_name = models.CharField(max_length=200)
    customer_email = models.EmailField(blank=True)
    customer_phone = models.CharField(max_length=20, blank=True)
    customer_address = models.TextField(blank=True)
    
    # Amounts
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    discount_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Optional discount percentage"
    )
    discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text="Optional discount amount"
    )
    tax_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Optional tax percentage"
    )
    tax_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text="Optional tax amount"
    )
    total = models.DecimalField(max_digits=12, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Payment details
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        blank=True
    )
    payment_reference = models.CharField(max_length=100, blank=True)
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT
    )
    
    # Metadata
    notes = models.TextField(blank=True)
    internal_notes = models.TextField(blank=True)
    pdf_url = models.URLField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_invoices'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'invoices'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"INV-{self.invoice_number}"
    
    @property
    def balance_due(self):
        """Calculate remaining balance."""
        return self.total - self.paid_amount
    
    @property
    def is_fully_paid(self):
        """Check if invoice is fully paid."""
        return self.paid_amount >= self.total


class InvoiceItem(models.Model):
    """Individual items in an invoice."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='items'
    )
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.PROTECT,
        related_name='invoice_items'
    )
    product_name = models.CharField(max_length=200)  # Store for historical reference
    product_sku = models.CharField(max_length=50)
    product_barcode = models.CharField(max_length=100)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2)  # For profit calculation
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    
    class Meta:
        db_table = 'invoice_items'
    
    def __str__(self):
        return f"{self.product_name} x {self.quantity}"
    
    @property
    def profit(self):
        """Calculate profit for this line item."""
        return (self.unit_price - self.cost_price) * self.quantity - self.discount_amount


class Payment(models.Model):
    """Track payments against invoices."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='payments'
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(
        max_length=20,
        choices=Invoice.PaymentMethod.choices
    )
    reference = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='received_payments'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'payments'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Payment of {self.amount} for {self.invoice}"
