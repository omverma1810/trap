"""
Invoices app admin configuration.
"""

from django.contrib import admin
from .models import Invoice, InvoiceItem, Payment


class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 0
    raw_id_fields = ['product']
    readonly_fields = ['product_name', 'product_sku', 'product_barcode', 'cost_price']


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0
    readonly_fields = ['created_at']


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'customer_name', 'total', 'paid_amount', 'status', 'created_at']
    list_filter = ['status', 'payment_method']
    search_fields = ['invoice_number', 'customer_name', 'customer_email', 'customer_phone']
    raw_id_fields = ['created_by']
    inlines = [InvoiceItemInline, PaymentInline]
    readonly_fields = ['invoice_number', 'subtotal', 'total', 'created_at', 'updated_at']


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'amount', 'payment_method', 'received_by', 'created_at']
    list_filter = ['payment_method']
    search_fields = ['invoice__invoice_number', 'reference']
    raw_id_fields = ['invoice', 'received_by']
