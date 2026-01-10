"""
Inventory app models - Stock tracking and movements.
"""

from django.db import models
from django.conf import settings
import uuid


class Inventory(models.Model):
    """Inventory model for stock tracking."""
    
    class StockStatus(models.TextChoices):
        IN_STOCK = 'in_stock', 'In Stock'
        LOW_STOCK = 'low_stock', 'Low Stock'
        OUT_OF_STOCK = 'out_of_stock', 'Out of Stock'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.OneToOneField(
        'products.Product',
        on_delete=models.CASCADE,
        related_name='inventory'
    )
    quantity = models.PositiveIntegerField(default=0)
    reserved_quantity = models.PositiveIntegerField(default=0)
    reorder_level = models.PositiveIntegerField(default=10)
    reorder_quantity = models.PositiveIntegerField(default=50)
    warehouse_location = models.CharField(max_length=100, blank=True)
    bin_location = models.CharField(max_length=50, blank=True)
    last_restocked = models.DateTimeField(null=True, blank=True)
    last_sold = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'inventory'
        verbose_name_plural = 'inventories'
    
    def __str__(self):
        return f"{self.product.name} - {self.quantity} units"
    
    @property
    def available_quantity(self):
        """Calculate available quantity (total - reserved)."""
        return self.quantity - self.reserved_quantity
    
    @property
    def stock_status(self):
        """Determine current stock status."""
        if self.available_quantity <= 0:
            return self.StockStatus.OUT_OF_STOCK
        elif self.available_quantity <= self.reorder_level:
            return self.StockStatus.LOW_STOCK
        return self.StockStatus.IN_STOCK
    
    @property
    def needs_reorder(self):
        """Check if product needs to be reordered."""
        return self.available_quantity <= self.reorder_level


class StockMovement(models.Model):
    """Track all stock movements (in/out/adjustments)."""
    
    class MovementType(models.TextChoices):
        IN = 'in', 'Stock In'
        OUT = 'out', 'Stock Out'
        ADJUSTMENT = 'adjustment', 'Adjustment'
        RETURN = 'return', 'Return'
        TRANSFER = 'transfer', 'Transfer'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.CASCADE,
        related_name='stock_movements'
    )
    movement_type = models.CharField(
        max_length=20,
        choices=MovementType.choices
    )
    quantity = models.IntegerField()  # Positive for in, negative for out
    quantity_before = models.PositiveIntegerField()
    quantity_after = models.PositiveIntegerField()
    reference = models.CharField(max_length=100, blank=True)  # PO number, Invoice number
    reference_type = models.CharField(max_length=50, blank=True)  # purchase_order, invoice, manual
    notes = models.TextField(blank=True)
    cost_per_unit = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='stock_movements'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'stock_movements'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.product.name} - {self.movement_type} {self.quantity}"


class Supplier(models.Model):
    """Supplier model for purchase orders."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=50, unique=True)
    contact_person = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'suppliers'
        ordering = ['name']
    
    def __str__(self):
        return self.name


class PurchaseOrder(models.Model):
    """Purchase order for restocking inventory."""
    
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        ORDERED = 'ordered', 'Ordered'
        RECEIVED = 'received', 'Received'
        CANCELLED = 'cancelled', 'Cancelled'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(max_length=50, unique=True)
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        related_name='purchase_orders'
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT
    )
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    expected_date = models.DateField(null=True, blank=True)
    received_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='purchase_orders'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'purchase_orders'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"PO-{self.order_number}"


class PurchaseOrderItem(models.Model):
    """Individual items in a purchase order."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name='items'
    )
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.PROTECT,
        related_name='purchase_order_items'
    )
    quantity = models.PositiveIntegerField()
    received_quantity = models.PositiveIntegerField(default=0)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    
    class Meta:
        db_table = 'purchase_order_items'
    
    def __str__(self):
        return f"{self.product.name} x {self.quantity}"
