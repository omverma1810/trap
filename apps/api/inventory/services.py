"""
Inventory Services for TRAP Inventory System.
Core business logic for stock management with ledger-based approach.

CRITICAL: All stock changes MUST go through this service layer.
Direct manipulation of StockLedger or StockSnapshot is forbidden.
"""

from decimal import Decimal
from typing import Optional
from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone

from .models import (
    Warehouse,
    Product,
    ProductVariant,
    StockLedger,
    StockSnapshot,
)


class InsufficientStockError(Exception):
    """Raised when attempting to reduce stock below zero."""
    pass


class InvalidEventError(Exception):
    """Raised when an invalid stock event is attempted."""
    pass


def get_current_stock(variant: ProductVariant, warehouse: Warehouse) -> int:
    """
    Get current stock for a variant in a warehouse from snapshot.
    Falls back to ledger calculation if snapshot doesn't exist.
    """
    try:
        snapshot = StockSnapshot.objects.get(variant=variant, warehouse=warehouse)
        return snapshot.quantity
    except StockSnapshot.DoesNotExist:
        # Calculate from ledger if snapshot doesn't exist
        from django.db.models import Sum
        total = StockLedger.objects.filter(
            variant=variant,
            warehouse=warehouse
        ).aggregate(total=Sum('quantity'))['total']
        return total or 0


def validate_stock_event(
    variant: ProductVariant,
    warehouse: Warehouse,
    event_type: str,
    quantity: int,
    allow_negative: bool = False
) -> None:
    """
    Validate a stock event before recording.
    
    Args:
        variant: The product variant
        warehouse: The warehouse
        event_type: Type of event (PURCHASE, SALE, RETURN, ADJUSTMENT)
        quantity: Quantity change (positive or negative)
        allow_negative: Whether to allow resulting negative stock
    
    Raises:
        InvalidEventError: If event parameters are invalid
        InsufficientStockError: If event would result in negative stock
    """
    # Validate event type
    valid_event_types = [choice[0] for choice in StockLedger.EventType.choices]
    if event_type not in valid_event_types:
        raise InvalidEventError(f"Invalid event type: {event_type}")
    
    # Validate quantity
    if quantity == 0:
        raise InvalidEventError("Quantity cannot be zero")
    
    # Check for negative stock result
    if not allow_negative and quantity < 0:
        current_stock = get_current_stock(variant, warehouse)
        resulting_stock = current_stock + quantity
        if resulting_stock < 0:
            raise InsufficientStockError(
                f"Insufficient stock. Current: {current_stock}, "
                f"Requested: {abs(quantity)}, Would result in: {resulting_stock}"
            )


@transaction.atomic
def record_stock_event(
    variant: ProductVariant,
    warehouse: Warehouse,
    event_type: str,
    quantity: int,
    reference_type: str,
    reference_id: Optional[str] = None,
    notes: str = "",
    created_by: Optional[str] = None,
    allow_negative: bool = False
) -> StockLedger:
    """
    Record a stock event in the ledger and update snapshot.
    
    This is the ONLY way to modify stock. Direct edits are forbidden.
    
    Args:
        variant: The product variant
        warehouse: The warehouse
        event_type: Type of event (PURCHASE, SALE, RETURN, ADJUSTMENT)
        quantity: Quantity change (positive for additions, negative for deductions)
        reference_type: Type of reference (purchase, sale, adjustment, return)
        reference_id: Optional reference ID (e.g., PO number)
        notes: Optional notes
        created_by: User who created this entry
        allow_negative: Whether to allow negative stock (for adjustments)
    
    Returns:
        The created StockLedger entry
    
    Raises:
        InvalidEventError: If event parameters are invalid
        InsufficientStockError: If event would result in negative stock
    """
    # Lock the snapshot row for update to prevent race conditions
    snapshot = StockSnapshot.objects.select_for_update().filter(
        variant=variant,
        warehouse=warehouse
    ).first()
    
    # Validate the event
    validate_stock_event(
        variant=variant,
        warehouse=warehouse,
        event_type=event_type,
        quantity=quantity,
        allow_negative=allow_negative
    )
    
    # Create ledger entry
    ledger_entry = StockLedger.objects.create(
        variant=variant,
        warehouse=warehouse,
        event_type=event_type,
        quantity=quantity,
        reference_type=reference_type,
        reference_id=reference_id,
        notes=notes,
        created_by=created_by
    )
    
    # Update snapshot
    if snapshot:
        snapshot.quantity += quantity
        snapshot.save()
    else:
        StockSnapshot.objects.create(
            variant=variant,
            warehouse=warehouse,
            quantity=quantity
        )
    
    return ledger_entry


@transaction.atomic
def record_purchase(
    variant: ProductVariant,
    warehouse: Warehouse,
    quantity: int,
    reference_id: Optional[str] = None,
    notes: str = "",
    created_by: Optional[str] = None
) -> StockLedger:
    """
    Record a purchase (stock addition).
    Quantity must be positive.
    """
    if quantity <= 0:
        raise InvalidEventError("Purchase quantity must be positive")
    
    return record_stock_event(
        variant=variant,
        warehouse=warehouse,
        event_type=StockLedger.EventType.PURCHASE,
        quantity=quantity,  # Positive for additions
        reference_type=StockLedger.ReferenceType.PURCHASE,
        reference_id=reference_id,
        notes=notes,
        created_by=created_by
    )


@transaction.atomic
def record_sale(
    variant: ProductVariant,
    warehouse: Warehouse,
    quantity: int,
    reference_id: Optional[str] = None,
    notes: str = "",
    created_by: Optional[str] = None
) -> StockLedger:
    """
    Record a sale (stock deduction).
    Quantity must be positive (will be stored as negative).
    """
    if quantity <= 0:
        raise InvalidEventError("Sale quantity must be positive")
    
    return record_stock_event(
        variant=variant,
        warehouse=warehouse,
        event_type=StockLedger.EventType.SALE,
        quantity=-quantity,  # Negative for deductions
        reference_type=StockLedger.ReferenceType.SALE,
        reference_id=reference_id,
        notes=notes,
        created_by=created_by
    )


@transaction.atomic
def record_return(
    variant: ProductVariant,
    warehouse: Warehouse,
    quantity: int,
    reference_id: Optional[str] = None,
    notes: str = "",
    created_by: Optional[str] = None
) -> StockLedger:
    """
    Record a return (stock addition).
    Quantity must be positive.
    """
    if quantity <= 0:
        raise InvalidEventError("Return quantity must be positive")
    
    return record_stock_event(
        variant=variant,
        warehouse=warehouse,
        event_type=StockLedger.EventType.RETURN,
        quantity=quantity,  # Positive for additions
        reference_type=StockLedger.ReferenceType.RETURN,
        reference_id=reference_id,
        notes=notes,
        created_by=created_by
    )


@transaction.atomic
def record_adjustment(
    variant: ProductVariant,
    warehouse: Warehouse,
    quantity: int,
    notes: str = "",
    created_by: Optional[str] = None,
    allow_negative: bool = False
) -> StockLedger:
    """
    Record a stock adjustment (can be positive or negative).
    Used for corrections, inventory counts, etc.
    """
    if quantity == 0:
        raise InvalidEventError("Adjustment quantity cannot be zero")
    
    return record_stock_event(
        variant=variant,
        warehouse=warehouse,
        event_type=StockLedger.EventType.ADJUSTMENT,
        quantity=quantity,
        reference_type=StockLedger.ReferenceType.ADJUSTMENT,
        notes=notes,
        created_by=created_by,
        allow_negative=allow_negative
    )


def get_stock_summary():
    """
    Get a summary of stock across all warehouses.
    
    Returns:
        dict with total_stock, low_stock_items, out_of_stock_items
    """
    from django.db.models import Sum, F
    
    # Get all snapshots with variant and product info
    snapshots = StockSnapshot.objects.select_related(
        'variant__product',
        'warehouse'
    ).all()
    
    # Calculate totals
    total_stock = sum(s.quantity for s in snapshots)
    
    # Get variants with their total stock across warehouses
    variant_stock = {}
    for snapshot in snapshots:
        variant_id = str(snapshot.variant_id)
        if variant_id not in variant_stock:
            variant_stock[variant_id] = {
                'variant': snapshot.variant,
                'total': 0,
                'threshold': snapshot.variant.reorder_threshold
            }
        variant_stock[variant_id]['total'] += snapshot.quantity
    
    # Identify low stock and out of stock
    low_stock_items = []
    out_of_stock_items = []
    
    for variant_id, data in variant_stock.items():
        if data['total'] <= 0:
            out_of_stock_items.append({
                'variant_id': variant_id,
                'sku': data['variant'].sku,
                'product_name': data['variant'].product.name,
                'quantity': data['total']
            })
        elif data['total'] <= data['threshold']:
            low_stock_items.append({
                'variant_id': variant_id,
                'sku': data['variant'].sku,
                'product_name': data['variant'].product.name,
                'quantity': data['total'],
                'threshold': data['threshold']
            })
    
    return {
        'total_stock': total_stock,
        'total_variants': len(variant_stock),
        'low_stock_count': len(low_stock_items),
        'out_of_stock_count': len(out_of_stock_items),
        'low_stock_items': low_stock_items,
        'out_of_stock_items': out_of_stock_items
    }


def get_variant_stock_breakdown(variant: ProductVariant):
    """
    Get warehouse-wise stock breakdown for a variant.
    """
    snapshots = StockSnapshot.objects.filter(
        variant=variant
    ).select_related('warehouse')
    
    return [
        {
            'warehouse_id': str(s.warehouse_id),
            'warehouse_name': s.warehouse.name,
            'warehouse_code': s.warehouse.code,
            'quantity': s.quantity,
            'last_updated': s.last_updated
        }
        for s in snapshots
    ]
