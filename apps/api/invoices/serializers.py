"""
Invoice Serializers for TRAP Inventory System.
"""

from decimal import Decimal
from rest_framework import serializers
from .models import Invoice, InvoiceItem


class InvoiceItemSerializer(serializers.ModelSerializer):
    """Serializer for InvoiceItem (read-only)."""
    
    class Meta:
        model = InvoiceItem
        fields = [
            'id', 'product_name', 'variant_details',
            'quantity', 'unit_price', 'line_total'
        ]
        read_only_fields = fields


class InvoiceSerializer(serializers.ModelSerializer):
    """Serializer for Invoice (read-only)."""
    
    items = InvoiceItemSerializer(many=True, read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    sale_number = serializers.CharField(source='sale.sale_number', read_only=True)
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'sale', 'sale_number',
            'warehouse', 'warehouse_name',
            'subtotal_amount', 'discount_type', 'discount_value',
            'discount_amount', 'total_amount',
            'billing_name', 'billing_phone',
            'invoice_date', 'pdf_url', 'created_at', 'items'
        ]
        read_only_fields = fields


class InvoiceListSerializer(serializers.ModelSerializer):
    """Compact serializer for invoice list."""
    
    sale_number = serializers.CharField(source='sale.sale_number', read_only=True)
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'sale_number',
            'total_amount', 'discount_type', 'discount_amount',
            'billing_name', 'invoice_date'
        ]
        read_only_fields = fields


class GenerateInvoiceSerializer(serializers.Serializer):
    """
    Serializer for invoice generation request.
    
    DISCOUNT TYPES:
    - NONE: No discount (default)
    - PERCENTAGE: Percentage off subtotal (0-100%)
    - FLAT: Fixed amount off subtotal
    """
    
    sale_id = serializers.UUIDField(
        required=True,
        help_text="UUID of the completed sale"
    )
    billing_name = serializers.CharField(
        max_length=200,
        required=True,
        help_text="Customer name for invoice"
    )
    billing_phone = serializers.CharField(
        max_length=20,
        required=True,
        help_text="Customer phone number"
    )
    discount_type = serializers.ChoiceField(
        choices=Invoice.DiscountType.choices,
        default='NONE',
        required=False,
        help_text="Discount type: NONE, PERCENTAGE, or FLAT"
    )
    discount_value = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True,
        help_text="Discount percentage (0-100) or flat amount in ₹"
    )
    
    def validate(self, data):
        discount_type = data.get('discount_type', 'NONE')
        discount_value = data.get('discount_value')
        
        if discount_type != 'NONE' and discount_value is None:
            raise serializers.ValidationError({
                'discount_value': f'discount_value is required for {discount_type} discount'
            })
        
        if discount_value is not None:
            if discount_value < 0:
                raise serializers.ValidationError({
                    'discount_value': 'Discount value cannot be negative'
                })
            
            if discount_type == 'PERCENTAGE' and discount_value > 100:
                raise serializers.ValidationError({
                    'discount_value': 'Percentage discount cannot exceed 100%'
                })
        
        return data


class GenerateInvoiceResponseSerializer(serializers.Serializer):
    """Serializer for invoice generation response."""
    
    success = serializers.BooleanField()
    invoice_id = serializers.CharField()
    invoice_number = serializers.CharField()
    sale_number = serializers.CharField()
    subtotal_amount = serializers.CharField()
    discount_type = serializers.CharField()
    discount_value = serializers.CharField(allow_null=True)
    discount_amount = serializers.CharField()
    total_amount = serializers.CharField()
    pdf_url = serializers.CharField(allow_null=True)
    message = serializers.CharField()
