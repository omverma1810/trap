"""
Invoice Serializers for TRAP Inventory System.

PHASE 14: INVOICE PDFs & COMPLIANCE
====================================
- GST breakdown per line item
- Invoice snapshot from Sale data
- Immutable after creation
"""

from decimal import Decimal
from rest_framework import serializers
from .models import Invoice, InvoiceItem, BusinessSettings


class InvoiceItemSerializer(serializers.ModelSerializer):
    """
    Serializer for InvoiceItem (read-only).
    
    PHASE 14: Includes GST breakdown fields.
    """
    
    class Meta:
        model = InvoiceItem
        fields = [
            'id', 'product_name', 'sku', 'variant_details',
            'quantity', 'unit_price', 'line_total',
            'taxable_amount', 'gst_percentage', 'gst_amount', 'line_total_with_gst'
        ]
        read_only_fields = fields


class InvoiceSerializer(serializers.ModelSerializer):
    """
    Serializer for Invoice (read-only).
    
    PHASE 14: Includes GST total and full breakdown.
    """
    
    items = InvoiceItemSerializer(many=True, read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    sale_invoice_number = serializers.CharField(source='sale.invoice_number', read_only=True)
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'sale', 'sale_invoice_number',
            'warehouse', 'warehouse_name',
            'subtotal_amount', 'discount_type', 'discount_value',
            'discount_amount', 'gst_total', 'total_amount',
            'billing_name', 'billing_phone', 'billing_gstin',
            'invoice_date', 'pdf_url', 'created_at', 'items'
        ]
        read_only_fields = fields


class InvoiceListSerializer(serializers.ModelSerializer):
    """Compact serializer for invoice list with GST total."""
    
    sale_invoice_number = serializers.CharField(source='sale.invoice_number', read_only=True)
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'sale_invoice_number',
            'total_amount', 'gst_total', 'discount_type', 'discount_amount',
            'billing_name', 'invoice_date'
        ]
        read_only_fields = fields


class GenerateInvoiceSerializer(serializers.Serializer):
    """
    Serializer for invoice generation request.
    
    PHASE 14: Simplified - discount comes from Sale, not invoice generation.
    """
    
    sale_id = serializers.UUIDField(
        required=True,
        help_text="UUID of the completed sale"
    )
    billing_name = serializers.CharField(
        max_length=200,
        required=False,
        allow_blank=True,
        help_text="Customer name for invoice (defaults to sale.customer_name)"
    )
    billing_phone = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True,
        help_text="Customer phone number"
    )
    billing_gstin = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True,
        help_text="Customer GSTIN (optional)"
    )


class GenerateInvoiceResponseSerializer(serializers.Serializer):
    """Serializer for invoice generation response."""
    
    success = serializers.BooleanField()
    invoice_id = serializers.CharField()
    invoice_number = serializers.CharField()
    sale_invoice_number = serializers.CharField()
    subtotal_amount = serializers.CharField()
    discount_type = serializers.CharField()
    discount_value = serializers.CharField(allow_null=True)
    discount_amount = serializers.CharField()
    gst_total = serializers.CharField()
    total_amount = serializers.CharField()
    pdf_url = serializers.CharField(allow_null=True)
    message = serializers.CharField()
    already_existed = serializers.BooleanField()


class DiscountSettingsSerializer(serializers.ModelSerializer):
    """
    Serializer for discount configuration settings.
    Used by admin to configure available discounts.
    """
    
    class Meta:
        model = BusinessSettings
        fields = [
            'discount_enabled',
            'staff_max_discount_percent',
            'admin_max_discount_percent',
            'available_discounts',
        ]
    
    def validate_available_discounts(self, value):
        """Validate the discount presets structure."""
        if not isinstance(value, list):
            raise serializers.ValidationError("available_discounts must be a list")
        
        for item in value:
            if not isinstance(item, dict):
                raise serializers.ValidationError("Each discount must be an object")
            
            if 'type' not in item or item['type'] not in ['PERCENTAGE', 'FLAT']:
                raise serializers.ValidationError(
                    "Each discount must have 'type' as 'PERCENTAGE' or 'FLAT'"
                )
            
            if 'value' not in item or not isinstance(item['value'], (int, float)):
                raise serializers.ValidationError(
                    "Each discount must have a numeric 'value'"
                )
            
            if 'label' not in item or not isinstance(item['label'], str):
                raise serializers.ValidationError(
                    "Each discount must have a 'label' string"
                )
        
        return value


class POSDiscountOptionsSerializer(serializers.Serializer):
    """
    Serializer for POS discount options response.
    Returns available discounts based on user role.
    """
    discount_enabled = serializers.BooleanField()
    max_discount_percent = serializers.DecimalField(max_digits=5, decimal_places=2)
    available_discounts = serializers.ListField()
