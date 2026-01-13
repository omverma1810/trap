"""
Sales Services for TRAP Inventory System.
Core business logic for POS-grade sales processing.

CRITICAL: All sales operations MUST go through this service layer.
Direct manipulation of Sale/SaleItem is forbidden.

PHASE 3.1 ADDITIONS:
- Idempotency key handling for duplicate checkout prevention
- Status lifecycle management (PENDING → COMPLETED/FAILED)
"""

from decimal import Decimal
from typing import List, Optional
from uuid import UUID
from django.db import transaction, IntegrityError
from django.core.exceptions import ValidationError

from inventory.models import Warehouse, ProductVariant, StockLedger, StockSnapshot
from inventory.services import record_stock_event, InsufficientStockError, InvalidEventError
from .models import Sale, SaleItem


class SaleError(Exception):
    """Base exception for sale errors."""
    pass


class InvalidBarcodeError(SaleError):
    """Raised when barcode is invalid or not found."""
    pass


class InactiveVariantError(SaleError):
    """Raised when variant is inactive."""
    pass


class InsufficientStockForSaleError(SaleError):
    """Raised when stock is insufficient for sale."""
    pass


class DuplicateCheckoutError(SaleError):
    """Raised when duplicate checkout is detected (idempotency)."""
    pass


def lookup_variant_by_barcode(barcode: str) -> ProductVariant:
    """
    Look up a product variant by barcode.
    
    Args:
        barcode: The barcode to look up
    
    Returns:
        ProductVariant matching the barcode
    
    Raises:
        InvalidBarcodeError: If barcode not found
        InactiveVariantError: If variant is inactive
    """
    try:
        variant = ProductVariant.objects.select_related('product').get(barcode=barcode)
    except ProductVariant.DoesNotExist:
        raise InvalidBarcodeError(f"No product found with barcode: {barcode}")
    
    if not variant.is_active:
        raise InactiveVariantError(f"Product variant {variant.sku} is inactive")
    
    if not variant.product.is_active:
        raise InactiveVariantError(f"Product {variant.product.name} is inactive")
    
    return variant


def check_stock_availability(
    variant: ProductVariant,
    warehouse: Warehouse,
    quantity: int
) -> int:
    """
    Check if stock is available for sale.
    
    Returns:
        Available stock quantity
    
    Raises:
        InsufficientStockForSaleError: If stock is insufficient
    """
    try:
        snapshot = StockSnapshot.objects.get(variant=variant, warehouse=warehouse)
        available = snapshot.quantity
    except StockSnapshot.DoesNotExist:
        available = 0
    
    if available < quantity:
        raise InsufficientStockForSaleError(
            f"Insufficient stock for {variant.sku}. "
            f"Available: {available}, Requested: {quantity}"
        )
    
    return available


def scan_barcode(
    barcode: str,
    warehouse_id: str,
    quantity: int = 1
) -> dict:
    """
    Validate a barcode scan for POS.
    
    Args:
        barcode: Barcode to scan
        warehouse_id: Warehouse UUID
        quantity: Quantity to reserve
    
    Returns:
        Dict with variant info and availability
    """
    variant = lookup_variant_by_barcode(barcode)
    
    try:
        warehouse = Warehouse.objects.get(id=warehouse_id, is_active=True)
    except Warehouse.DoesNotExist:
        raise SaleError(f"Warehouse not found or inactive")
    
    available_stock = 0
    try:
        snapshot = StockSnapshot.objects.get(variant=variant, warehouse=warehouse)
        available_stock = snapshot.quantity
    except StockSnapshot.DoesNotExist:
        pass
    
    can_fulfill = available_stock >= quantity
    
    return {
        'variant_id': str(variant.id),
        'barcode': variant.barcode,
        'sku': variant.sku,
        'product_name': variant.product.name,
        'size': variant.size,
        'color': variant.color,
        'selling_price': str(variant.selling_price),
        'available_stock': available_stock,
        'requested_quantity': quantity,
        'can_fulfill': can_fulfill,
        'warehouse_id': str(warehouse.id),
        'warehouse_name': warehouse.name
    }


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


@transaction.atomic
def process_sale(
    idempotency_key: UUID,
    items: List[dict],
    warehouse_id: str,
    payment_method: str,
    created_by: Optional[str] = None
) -> Sale:
    """
    Process a complete sale transaction with idempotency.
    
    IDEMPOTENCY:
    - If a sale with the same idempotency_key exists and is COMPLETED:
      Return the existing sale (no duplicate processing)
    - If a sale with the same idempotency_key exists and is PENDING/FAILED:
      This indicates a previous failed attempt - create new (unique constraint will handle)
    
    STATUS LIFECYCLE:
    - Create sale with PENDING status
    - On success: transition to COMPLETED
    - On failure: transition to FAILED and rollback
    
    Args:
        idempotency_key: Client-provided UUID for deduplication
        items: List of dicts with 'barcode' and 'quantity'
        warehouse_id: Warehouse UUID
        payment_method: CASH, UPI, or CARD
        created_by: User who created the sale
    
    Returns:
        Sale object (existing if idempotency hit, new otherwise)
    
    Raises:
        SaleError: If any validation fails
        InsufficientStockForSaleError: If stock is insufficient
    """
    # IDEMPOTENCY CHECK: Return existing completed sale
    existing_sale = _check_existing_sale(idempotency_key)
    if existing_sale:
        if existing_sale.status == Sale.Status.COMPLETED:
            # Return existing sale - no double processing
            return existing_sale
        elif existing_sale.status == Sale.Status.PENDING:
            # Another request is processing - wait or return existing
            return existing_sale
        # FAILED sales can be retried with new idempotency key
    
    # Validate payment method
    valid_methods = [choice[0] for choice in Sale.PaymentMethod.choices]
    if payment_method not in valid_methods:
        raise SaleError(f"Invalid payment method: {payment_method}")
    
    # Validate warehouse
    try:
        warehouse = Warehouse.objects.get(id=warehouse_id, is_active=True)
    except Warehouse.DoesNotExist:
        raise SaleError("Warehouse not found or inactive")
    
    # Validate items
    if not items:
        raise SaleError("Sale must have at least one item")
    
    # Process each item and collect data
    sale_items_data = []
    total_amount = Decimal('0.00')
    total_items = 0
    
    for item in items:
        barcode = item.get('barcode')
        quantity = item.get('quantity', 1)
        
        if not barcode:
            raise SaleError("Each item must have a barcode")
        
        if quantity < 1:
            raise SaleError(f"Quantity must be at least 1 for barcode {barcode}")
        
        # Look up variant
        variant = lookup_variant_by_barcode(barcode)
        
        # Check stock availability
        check_stock_availability(variant, warehouse, quantity)
        
        # Snapshot the selling price
        selling_price = variant.selling_price
        line_total = selling_price * quantity
        
        sale_items_data.append({
            'variant': variant,
            'quantity': quantity,
            'selling_price': selling_price,
            'line_total': line_total
        })
        
        total_amount += line_total
        total_items += quantity
    
    # Create the sale record with PENDING status
    try:
        sale = Sale.objects.create(
            idempotency_key=idempotency_key,
            warehouse=warehouse,
            total_amount=total_amount,
            total_items=total_items,
            payment_method=payment_method,
            status=Sale.Status.PENDING,
            created_by=created_by
        )
    except IntegrityError:
        # Race condition: another request created the sale
        existing = Sale.objects.get(idempotency_key=idempotency_key)
        return existing
    
    try:
        # Create sale items and ledger entries
        for item_data in sale_items_data:
            # Create sale item
            SaleItem.objects.create(
                sale=sale,
                variant=item_data['variant'],
                quantity=item_data['quantity'],
                selling_price=item_data['selling_price'],
                line_total=item_data['line_total']
            )
            
            # Create SALE ledger entry (negative quantity for stock reduction)
            record_stock_event(
                variant=item_data['variant'],
                warehouse=warehouse,
                event_type=StockLedger.EventType.SALE,
                quantity=-item_data['quantity'],  # Negative for deduction
                reference_type=StockLedger.ReferenceType.SALE,
                reference_id=sale.sale_number,
                notes=f"Sale: {sale.sale_number}",
                created_by=created_by
            )
        
        # SUCCESS: Mark as COMPLETED
        sale.mark_completed()
        return sale
        
    except Exception as e:
        # FAILURE: Mark as FAILED and propagate exception
        # Note: transaction.atomic will rollback DB changes
        # but we need to mark the sale as FAILED first
        sale.status = Sale.Status.FAILED
        sale.failure_reason = str(e)
        # Use update to bypass save() restrictions
        Sale.objects.filter(pk=sale.pk).update(
            status=Sale.Status.FAILED,
            failure_reason=str(e)
        )
        raise


def get_sale_details(sale_id: str) -> dict:
    """
    Get complete sale details including items.
    """
    try:
        sale = Sale.objects.prefetch_related(
            'items__variant__product',
            'warehouse'
        ).get(id=sale_id)
    except Sale.DoesNotExist:
        raise SaleError("Sale not found")
    
    items = []
    for item in sale.items.all():
        items.append({
            'variant_id': str(item.variant.id),
            'sku': item.variant.sku,
            'barcode': item.variant.barcode,
            'product_name': item.variant.product.name,
            'size': item.variant.size,
            'color': item.variant.color,
            'quantity': item.quantity,
            'selling_price': str(item.selling_price),
            'line_total': str(item.line_total)
        })
    
    return {
        'id': str(sale.id),
        'idempotency_key': str(sale.idempotency_key),
        'sale_number': sale.sale_number,
        'warehouse_id': str(sale.warehouse.id),
        'warehouse_name': sale.warehouse.name,
        'total_amount': str(sale.total_amount),
        'total_items': sale.total_items,
        'payment_method': sale.payment_method,
        'status': sale.status,
        'failure_reason': sale.failure_reason,
        'created_by': sale.created_by,
        'created_at': sale.created_at.isoformat(),
        'items': items
    }
