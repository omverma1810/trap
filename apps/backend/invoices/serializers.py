"""
Invoices app serializers.
"""

from rest_framework import serializers
from .models import Invoice, InvoiceItem, Payment
from products.models import Product


class InvoiceItemSerializer(serializers.ModelSerializer):
    """Invoice item serializer."""
    
    profit = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    class Meta:
        model = InvoiceItem
        fields = [
            'id', 'product', 'product_name', 'product_sku',
            'product_barcode', 'quantity', 'unit_price',
            'cost_price', 'discount_percent', 'discount_amount',
            'total', 'profit'
        ]
        read_only_fields = ['id', 'product_name', 'product_sku', 'product_barcode', 'cost_price']


class InvoiceItemCreateSerializer(serializers.Serializer):
    """Serializer for creating invoice items."""
    
    product_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    discount_percent = serializers.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount_amount = serializers.DecimalField(max_digits=12, decimal_places=2, default=0)


class PaymentSerializer(serializers.ModelSerializer):
    """Payment serializer."""
    
    received_by_name = serializers.CharField(source='received_by.get_full_name', read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'invoice', 'amount', 'payment_method',
            'reference', 'notes', 'received_by',
            'received_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'received_by', 'created_at']


class InvoiceListSerializer(serializers.ModelSerializer):
    """Invoice list serializer (lightweight)."""
    
    items_count = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    balance_due = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'customer_name', 'customer_phone',
            'subtotal', 'discount_amount', 'tax_amount', 'total',
            'paid_amount', 'balance_due', 'status', 'payment_method',
            'items_count', 'created_by_name', 'created_at'
        ]
    
    def get_items_count(self, obj):
        return obj.items.count()


class InvoiceDetailSerializer(serializers.ModelSerializer):
    """Invoice detail serializer (full details)."""
    
    items = InvoiceItemSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    balance_due = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    is_fully_paid = serializers.BooleanField(read_only=True)
    total_profit = serializers.SerializerMethodField()
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'customer_name', 'customer_email',
            'customer_phone', 'customer_address', 'subtotal',
            'discount_percent', 'discount_amount', 'tax_percent',
            'tax_amount', 'total', 'paid_amount', 'balance_due',
            'is_fully_paid', 'payment_method', 'payment_reference',
            'status', 'notes', 'internal_notes', 'pdf_url',
            'items', 'payments', 'total_profit',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']
    
    def get_total_profit(self, obj):
        return sum(item.profit for item in obj.items.all())


class InvoiceCreateSerializer(serializers.Serializer):
    """Serializer for creating invoices."""
    
    customer_name = serializers.CharField(max_length=200)
    customer_email = serializers.EmailField(required=False, allow_blank=True)
    customer_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    customer_address = serializers.CharField(required=False, allow_blank=True)
    items = InvoiceItemCreateSerializer(many=True)
    discount_percent = serializers.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount_amount = serializers.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_percent = serializers.DecimalField(max_digits=5, decimal_places=2, default=0)
    payment_method = serializers.ChoiceField(
        choices=Invoice.PaymentMethod.choices,
        required=False,
        allow_blank=True
    )
    payment_reference = serializers.CharField(max_length=100, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    internal_notes = serializers.CharField(required=False, allow_blank=True)


class ScanBarcodeSerializer(serializers.Serializer):
    """Serializer for barcode scanning."""
    
    barcode = serializers.CharField(max_length=100)
