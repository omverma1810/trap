"""
Invoice Services for TRAP Inventory System.
Core business logic for invoice generation.

CRITICAL: All invoice operations MUST go through this service layer.
Direct manipulation of Invoice/InvoiceItem is forbidden.
"""

from decimal import Decimal
from typing import Optional, Dict, Any
from django.db import transaction
from django.core.exceptions import ValidationError

from sales.models import Sale, SaleItem
from .models import Invoice, InvoiceItem, InvoiceSequence


class InvoiceError(Exception):
    """Base exception for invoice errors."""
    pass


class SaleNotFoundError(InvoiceError):
    """Raised when sale is not found."""
    pass


class SaleNotCompletedError(InvoiceError):
    """Raised when sale is not in COMPLETED status."""
    pass


class InvoiceAlreadyExistsError(InvoiceError):
    """Raised when invoice already exists for sale."""
    pass


class InvalidDiscountError(InvoiceError):
    """Raised when discount configuration is invalid."""
    pass


def validate_discount(
    discount_type: str,
    discount_value: Optional[Decimal],
    subtotal: Decimal
) -> Decimal:
    """
    Validate discount and calculate discount amount.
    
    Args:
        discount_type: NONE, PERCENTAGE, or FLAT
        discount_value: Percentage (0-100) or flat amount
        subtotal: Subtotal before discount
    
    Returns:
        Calculated discount amount
    
    Raises:
        InvalidDiscountError: If discount is invalid
    """
    if discount_type == Invoice.DiscountType.NONE:
        return Decimal('0.00')
    
    if discount_value is None:
        raise InvalidDiscountError(
            f"discount_value is required for {discount_type} discount"
        )
    
    if discount_value < 0:
        raise InvalidDiscountError("discount_value cannot be negative")
    
    if discount_type == Invoice.DiscountType.PERCENTAGE:
        if discount_value > 100:
            raise InvalidDiscountError(
                "Percentage discount cannot exceed 100%"
            )
        # Calculate percentage of subtotal
        discount_amount = (subtotal * discount_value / 100).quantize(Decimal('0.01'))
        return discount_amount
    
    elif discount_type == Invoice.DiscountType.FLAT:
        if discount_value > subtotal:
            raise InvalidDiscountError(
                f"Flat discount (₹{discount_value}) cannot exceed subtotal (₹{subtotal})"
            )
        return discount_value
    
    else:
        raise InvalidDiscountError(f"Invalid discount_type: {discount_type}")


def _build_variant_details(sale_item: SaleItem) -> str:
    """Build variant details string from sale item."""
    variant = sale_item.variant
    details = []
    if variant.size:
        details.append(variant.size)
    if variant.color:
        details.append(variant.color)
    return ' / '.join(details) if details else 'Default'


@transaction.atomic
def generate_invoice_for_sale(
    sale_id: str,
    billing_name: str,
    billing_phone: str,
    discount_type: str = 'NONE',
    discount_value: Optional[Decimal] = None
) -> Invoice:
    """
    Generate an invoice for a completed sale.
    
    This is the ONLY authorized way to create an invoice.
    All operations are atomic.
    
    Args:
        sale_id: UUID of the sale
        billing_name: Customer name for invoice
        billing_phone: Customer phone for invoice
        discount_type: NONE, PERCENTAGE, or FLAT
        discount_value: Discount percentage (0-100) or flat amount
    
    Returns:
        Created Invoice object
    
    Raises:
        SaleNotFoundError: If sale doesn't exist
        SaleNotCompletedError: If sale is not COMPLETED
        InvoiceAlreadyExistsError: If invoice already exists
        InvalidDiscountError: If discount is invalid
    """
    # Validate sale exists
    try:
        sale = Sale.objects.prefetch_related(
            'items__variant__product'
        ).get(id=sale_id)
    except Sale.DoesNotExist:
        raise SaleNotFoundError(f"Sale not found: {sale_id}")
    
    # Validate sale status
    if sale.status != Sale.Status.COMPLETED:
        raise SaleNotCompletedError(
            f"Cannot generate invoice for sale with status: {sale.status}. "
            f"Only COMPLETED sales can have invoices."
        )
    
    # Check if invoice already exists
    if hasattr(sale, 'invoice'):
        raise InvoiceAlreadyExistsError(
            f"Invoice already exists for sale {sale.sale_number}: "
            f"{sale.invoice.invoice_number}"
        )
    
    # Calculate subtotal from sale items
    subtotal = sale.total_amount
    
    # Validate and calculate discount
    discount_amount = validate_discount(
        discount_type=discount_type,
        discount_value=discount_value,
        subtotal=subtotal
    )
    
    # Calculate final total
    total_amount = subtotal - discount_amount
    
    # Generate sequential invoice number
    invoice_number = InvoiceSequence.get_next_invoice_number()
    
    # Create invoice
    invoice = Invoice.objects.create(
        invoice_number=invoice_number,
        sale=sale,
        warehouse=sale.warehouse,
        subtotal_amount=subtotal,
        discount_type=discount_type,
        discount_value=discount_value,
        discount_amount=discount_amount,
        total_amount=total_amount,
        billing_name=billing_name,
        billing_phone=billing_phone
    )
    
    # Create invoice items (snapshotted data)
    for sale_item in sale.items.all():
        InvoiceItem.objects.create(
            invoice=invoice,
            product_name=sale_item.variant.product.name,
            variant_details=_build_variant_details(sale_item),
            quantity=sale_item.quantity,
            unit_price=sale_item.selling_price,
            line_total=sale_item.line_total
        )
    
    # Generate PDF (will implement next)
    pdf_url = generate_invoice_pdf(invoice)
    if pdf_url:
        # Update PDF URL without triggering immutability check
        Invoice.objects.filter(pk=invoice.pk).update(pdf_url=pdf_url)
        invoice.pdf_url = pdf_url
    
    return invoice


def generate_invoice_pdf(invoice: Invoice) -> Optional[str]:
    """
    Generate PDF for invoice.
    Returns URL/path to the generated PDF.
    """
    import os
    from django.conf import settings
    
    # Create PDF directory if not exists
    pdf_dir = os.path.join(settings.BASE_DIR, 'media', 'invoices')
    os.makedirs(pdf_dir, exist_ok=True)
    
    pdf_filename = f"{invoice.invoice_number.replace('/', '_')}.pdf"
    pdf_path = os.path.join(pdf_dir, pdf_filename)
    
    try:
        # Try WeasyPrint first
        from .pdf.generator import generate_pdf_weasyprint
        generate_pdf_weasyprint(invoice, pdf_path)
    except ImportError:
        # Fallback to simple text-based PDF
        from .pdf.generator import generate_pdf_simple
        generate_pdf_simple(invoice, pdf_path)
    
    return f"/media/invoices/{pdf_filename}"


def get_invoice_details(invoice_id: str) -> Dict[str, Any]:
    """
    Get complete invoice details.
    """
    try:
        invoice = Invoice.objects.prefetch_related('items').get(id=invoice_id)
    except Invoice.DoesNotExist:
        raise InvoiceError("Invoice not found")
    
    items = []
    for item in invoice.items.all():
        items.append({
            'product_name': item.product_name,
            'variant_details': item.variant_details,
            'quantity': item.quantity,
            'unit_price': str(item.unit_price),
            'line_total': str(item.line_total)
        })
    
    return {
        'id': str(invoice.id),
        'invoice_number': invoice.invoice_number,
        'sale_id': str(invoice.sale_id),
        'sale_number': invoice.sale.sale_number,
        'warehouse_id': str(invoice.warehouse_id),
        'warehouse_name': invoice.warehouse.name,
        'subtotal_amount': str(invoice.subtotal_amount),
        'discount_type': invoice.discount_type,
        'discount_value': str(invoice.discount_value) if invoice.discount_value else None,
        'discount_amount': str(invoice.discount_amount),
        'total_amount': str(invoice.total_amount),
        'billing_name': invoice.billing_name,
        'billing_phone': invoice.billing_phone,
        'invoice_date': invoice.invoice_date.isoformat(),
        'pdf_url': invoice.pdf_url,
        'created_at': invoice.created_at.isoformat(),
        'items': items
    }
