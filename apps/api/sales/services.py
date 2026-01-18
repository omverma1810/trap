"""
Sales Services for TRAP Inventory System.

PHASE 13: POS ENGINE (LEDGER-BACKED)
=====================================

CORE PRINCIPLE:
A sale is an atomic financial transaction.
Either everything happens — or nothing does.

REQUIREMENTS:
- Barcode-first product resolution
- Stock validation via inventory ledger
- Multi-payment support
- Discount calculation
- Atomic transactions with rollback
- Invoice number generation

CRITICAL: All sales operations MUST go through this service layer.
Direct manipulation of Sale/SaleItem/Payment is forbidden.
"""

from decimal import Decimal
from typing import List, Optional, Union
from uuid import UUID

from django.db import transaction
from django.db.models import Sum

from inventory.models import Warehouse, Product
from inventory.services import get_product_stock, create_inventory_movement, InvalidMovementError
from .models import Sale, SaleItem, Payment, InvoiceSequence


# =============================================================================
# EXCEPTIONS
# =============================================================================

class SaleError(Exception):
    """Base exception for sale errors."""
    pass


class InvalidBarcodeError(SaleError):
    """Raised when barcode is invalid or not found."""
    pass


class InactiveProductError(SaleError):
    """Raised when product is inactive."""
    pass


class InsufficientStockError(SaleError):
    """Raised when stock is insufficient for sale."""
    pass


class DuplicateCheckoutError(SaleError):
    """Raised when duplicate checkout is detected (idempotency)."""
    pass


class PaymentMismatchError(SaleError):
    """Raised when payments don't equal total."""
    pass


class InvalidDiscountError(SaleError):
    """Raised when discount is invalid."""
    pass


class WarehouseNotFoundError(SaleError):
    """Raised when warehouse is not found."""
    pass


# =============================================================================
# PRODUCT RESOLUTION
# =============================================================================

def lookup_product_by_barcode(barcode: str) -> Product:
    """
    Look up a product by barcode.
    
    Args:
        barcode: The barcode to look up
    
    Returns:
        Product matching the barcode
    
    Raises:
        InvalidBarcodeError: If barcode not found
        InactiveProductError: If product is inactive
    """
    try:
        product = Product.objects.get(barcode_value=barcode)
    except Product.DoesNotExist:
        raise InvalidBarcodeError(f"No product found with barcode: {barcode}")
    
    if hasattr(product, 'is_active') and not product.is_active:
        raise InactiveProductError(f"Product {barcode} is inactive")
    
    return product


def check_stock_availability(
    product: Product,
    warehouse: Warehouse,
    quantity: int
) -> int:
    """
    Check if stock is available for sale.
    
    Returns:
        Available stock quantity
    
    Raises:
        InsufficientStockError: If stock is insufficient
    """
    available = get_product_stock(product.id, warehouse_id=warehouse.id)
    
    if available < quantity:
        raise InsufficientStockError(
            f"Insufficient stock for {product.sku}: "
            f"requested {quantity}, available {available}"
        )
    
    return available


def scan_barcode(
    barcode: str,
    warehouse_id: Union[str, UUID],
    quantity: int = 1
) -> dict:
    """
    Validate a barcode scan for POS.
    
    Args:
        barcode: Barcode to scan
        warehouse_id: Warehouse UUID
        quantity: Quantity to check
    
    Returns:
        Dict with product info and availability
    """
    product = lookup_product_by_barcode(barcode)
    
    try:
        warehouse = Warehouse.objects.get(pk=warehouse_id, is_active=True)
    except Warehouse.DoesNotExist:
        raise WarehouseNotFoundError(f"Warehouse {warehouse_id} not found or inactive")
    
    available = get_product_stock(product.id, warehouse_id=warehouse.id)
    
    # Get selling price from first variant or product
    selling_price = Decimal('0.00')
    if hasattr(product, 'variants') and product.variants.exists():
        variant = product.variants.first()
        selling_price = variant.selling_price or Decimal('0.00')
    
    return {
        'product_id': str(product.id),
        'barcode': product.barcode_value,
        'sku': product.sku,
        'product_name': product.name,
        'selling_price': str(selling_price),
        'available_stock': available,
        'requested_quantity': quantity,
        'can_fulfill': available >= quantity,
        'warehouse_id': str(warehouse.id),
        'warehouse_name': warehouse.name,
    }


# =============================================================================
# IDEMPOTENCY
# =============================================================================

def _check_existing_sale(idempotency_key: UUID) -> Optional[Sale]:
    """
    Check if a sale already exists with the given idempotency key.
    
    Returns:
        Existing Sale if found, None otherwise
    """
    try:
        return Sale.objects.get(idempotency_key=idempotency_key)
    except Sale.DoesNotExist:
        return None


# =============================================================================
# DISCOUNT CALCULATION
# =============================================================================

def calculate_discount(
    subtotal: Decimal,
    discount_type: Optional[str],
    discount_value: Decimal
) -> Decimal:
    """
    Calculate discount amount.
    
    Args:
        subtotal: Subtotal before discount
        discount_type: 'PERCENT' or 'FLAT'
        discount_value: Discount value (percentage or amount)
    
    Returns:
        Discount amount
    
    Raises:
        InvalidDiscountError: If discount is invalid
    """
    if not discount_type or discount_value <= 0:
        return Decimal('0.00')
    
    if discount_type == 'PERCENT':
        if discount_value > 100:
            raise InvalidDiscountError("Percentage discount cannot exceed 100%")
        discount = (subtotal * discount_value / 100).quantize(Decimal('0.01'))
    else:  # FLAT
        discount = discount_value
    
    # Discount cannot exceed subtotal
    if discount > subtotal:
        raise InvalidDiscountError(
            f"Discount ({discount}) cannot exceed subtotal ({subtotal})"
        )
    
    return discount


# =============================================================================
# SALE CREATION (ATOMIC)
# =============================================================================

@transaction.atomic
def process_sale(
    idempotency_key: UUID,
    warehouse_id: Union[str, UUID],
    items: List[dict],
    payments: List[dict],
    user,
    discount_type: Optional[str] = None,
    discount_value: Decimal = Decimal('0.00'),
    customer_name: str = ''
) -> Sale:
    """
    Process a complete sale transaction atomically.
    
    This is the ONLY way to create a sale. Direct model manipulation is forbidden.
    
    FLOW:
    1. Check idempotency (return existing if duplicate)
    2. Validate warehouse
    3. Resolve products by barcode
    4. Check stock for each item
    5. Calculate line totals, subtotal, discount, total
    6. Validate payments sum == total
    7. Create Sale, SaleItems, Payments
    8. Create inventory movements (SALE type)
    9. Commit transaction
    
    Any failure → rollback everything.
    
    Args:
        idempotency_key: Client-provided UUID for duplicate prevention
        warehouse_id: Warehouse UUID
        items: List of {'barcode': str, 'quantity': int}
        payments: List of {'method': str, 'amount': Decimal}
        user: User creating the sale
        discount_type: 'PERCENT' or 'FLAT' (optional)
        discount_value: Discount value (optional)
        customer_name: Optional customer name
    
    Returns:
        Sale object
    
    Raises:
        InvalidBarcodeError: If barcode not found
        InactiveProductError: If product is inactive
        InsufficientStockError: If stock is insufficient
        PaymentMismatchError: If payments don't equal total
        InvalidDiscountError: If discount is invalid
        WarehouseNotFoundError: If warehouse not found
    """
    # 1. Check idempotency
    existing = _check_existing_sale(idempotency_key)
    if existing:
        if existing.status == Sale.Status.COMPLETED:
            return existing  # Return existing completed sale
        elif existing.status == Sale.Status.PENDING:
            return existing  # Still processing
        # If FAILED, we can retry (but use same id)
    
    # 2. Validate warehouse
    try:
        warehouse = Warehouse.objects.select_for_update().get(pk=warehouse_id, is_active=True)
    except Warehouse.DoesNotExist:
        raise WarehouseNotFoundError(f"Warehouse {warehouse_id} not found or inactive")
    
    # 3. Resolve products and validate stock
    resolved_items = []
    for item in items:
        barcode = item.get('barcode')
        quantity = item.get('quantity', 1)
        
        if not barcode:
            raise InvalidBarcodeError("Barcode is required for each item")
        
        if quantity < 1:
            raise SaleError(f"Invalid quantity for {barcode}: {quantity}")
        
        # Lookup product
        product = lookup_product_by_barcode(barcode)
        
        # Check stock
        check_stock_availability(product, warehouse, quantity)
        
        # Get selling price
        selling_price = Decimal('0.00')
        if hasattr(product, 'variants') and product.variants.exists():
            variant = product.variants.first()
            selling_price = variant.selling_price or Decimal('0.00')
        
        if selling_price <= 0:
            raise SaleError(f"Product {barcode} has no valid selling price")
        
        # Calculate line total
        line_total = (selling_price * quantity).quantize(Decimal('0.01'))
        
        resolved_items.append({
            'product': product,
            'quantity': quantity,
            'selling_price': selling_price,
            'line_total': line_total,
        })
    
    # 4. Calculate totals
    subtotal = sum(item['line_total'] for item in resolved_items)
    
    # 5. Calculate discount
    discount_amount = calculate_discount(subtotal, discount_type, discount_value)
    total = subtotal - discount_amount
    
    # Ensure total is positive
    if total <= 0:
        raise InvalidDiscountError("Total after discount must be positive")
    
    # 6. Validate payments
    payments_total = sum(Decimal(str(p.get('amount', 0))) for p in payments)
    if payments_total != total:
        raise PaymentMismatchError(
            f"Payments total ({payments_total}) does not match sale total ({total})"
        )
    
    # 7. Generate invoice number
    invoice_number = InvoiceSequence.get_next_invoice_number()
    
    # 8. Create Sale
    sale = Sale.objects.create(
        idempotency_key=idempotency_key,
        invoice_number=invoice_number,
        warehouse=warehouse,
        customer_name=customer_name or '',
        subtotal=subtotal,
        discount_type=discount_type,
        discount_value=discount_value,
        total=total,
        total_items=sum(item['quantity'] for item in resolved_items),
        status=Sale.Status.PENDING,
        created_by=user,
    )
    
    # 9. Create SaleItems
    for item in resolved_items:
        SaleItem.objects.create(
            sale=sale,
            product=item['product'],
            quantity=item['quantity'],
            selling_price=item['selling_price'],
            line_total=item['line_total'],
        )
    
    # 10. Create Payments
    for payment in payments:
        Payment.objects.create(
            sale=sale,
            method=payment['method'],
            amount=Decimal(str(payment['amount'])),
        )
    
    # 11. Create inventory movements (SALE type with negative quantity)
    for item in resolved_items:
        create_inventory_movement(
            product_id=item['product'].id,
            movement_type='SALE',
            quantity=-item['quantity'],  # Negative for sales
            user=user,
            warehouse_id=warehouse.id,
            reference_type='sale',
            reference_id=sale.id,
            remarks=f"Sale {invoice_number}"
        )
    
    # 12. Mark sale as completed
    sale.status = Sale.Status.COMPLETED
    sale.save()
    
    return sale


# =============================================================================
# SALE RETRIEVAL
# =============================================================================

def get_sale_details(sale_id: Union[str, UUID]) -> dict:
    """
    Get complete sale details including items and payments.
    """
    try:
        sale = Sale.objects.prefetch_related(
            'items__product',
            'payments'
        ).get(pk=sale_id)
    except Sale.DoesNotExist:
        return None
    
    items = []
    for item in sale.items.all():
        items.append({
            'product_id': str(item.product.id),
            'product_sku': item.product.sku,
            'product_barcode': item.product.barcode,
            'product_name': item.product.name,
            'quantity': item.quantity,
            'selling_price': str(item.selling_price),
            'line_total': str(item.line_total),
        })
    
    payments = []
    for payment in sale.payments.all():
        payments.append({
            'id': str(payment.id),
            'method': payment.method,
            'amount': str(payment.amount),
            'created_at': payment.created_at.isoformat(),
        })
    
    return {
        'id': str(sale.id),
        'invoice_number': sale.invoice_number,
        'warehouse_id': str(sale.warehouse.id),
        'warehouse_name': sale.warehouse.name,
        'customer_name': sale.customer_name,
        'subtotal': str(sale.subtotal),
        'discount_type': sale.discount_type,
        'discount_value': str(sale.discount_value),
        'discount_amount': str(sale.discount_amount),
        'total': str(sale.total),
        'total_items': sale.total_items,
        'status': sale.status,
        'created_by': sale.created_by.username if sale.created_by else None,
        'created_at': sale.created_at.isoformat(),
        'items': items,
        'payments': payments,
    }
