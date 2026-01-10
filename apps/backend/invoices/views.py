"""
Invoices app views.
"""

from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db import transaction
import uuid

from .models import Invoice, InvoiceItem, Payment
from .serializers import (
    InvoiceListSerializer,
    InvoiceDetailSerializer,
    InvoiceCreateSerializer,
    PaymentSerializer,
)
from products.models import Product
from inventory.models import Inventory, StockMovement


class InvoiceViewSet(viewsets.ModelViewSet):
    """Invoice CRUD viewset."""
    queryset = Invoice.objects.select_related('created_by').prefetch_related('items', 'payments').all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['invoice_number', 'customer_name', 'customer_phone', 'customer_email']
    ordering_fields = ['created_at', 'total']
    filterset_fields = ['status', 'payment_method']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return InvoiceListSerializer
        elif self.action == 'create':
            return InvoiceCreateSerializer
        return InvoiceDetailSerializer
    
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = InvoiceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        
        # Generate invoice number
        invoice_number = f"INV-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        
        # Calculate totals
        subtotal = 0
        invoice_items = []
        
        for item_data in data['items']:
            product = Product.objects.get(id=item_data['product_id'])
            unit_price = item_data.get('unit_price', product.selling_price)
            quantity = item_data['quantity']
            
            # Check stock
            inventory = product.inventory
            if inventory.available_quantity < quantity:
                return Response(
                    {'error': f'Insufficient stock for {product.name}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Calculate item total
            item_discount_percent = item_data.get('discount_percent', 0)
            item_discount_amount = item_data.get('discount_amount', 0)
            item_subtotal = unit_price * quantity
            
            if item_discount_percent > 0:
                item_discount_amount = (item_subtotal * item_discount_percent) / 100
            
            item_total = item_subtotal - item_discount_amount
            subtotal += item_total
            
            invoice_items.append({
                'product': product,
                'quantity': quantity,
                'unit_price': unit_price,
                'cost_price': product.cost_price,
                'discount_percent': item_discount_percent,
                'discount_amount': item_discount_amount,
                'total': item_total,
            })
        
        # Calculate invoice totals
        discount_percent = data.get('discount_percent', 0)
        discount_amount = data.get('discount_amount', 0)
        tax_percent = data.get('tax_percent', 0)
        
        if discount_percent > 0:
            discount_amount = (subtotal * discount_percent) / 100
        
        after_discount = subtotal - discount_amount
        tax_amount = (after_discount * tax_percent) / 100 if tax_percent > 0 else 0
        total = after_discount + tax_amount
        
        # Create invoice
        invoice = Invoice.objects.create(
            invoice_number=invoice_number,
            customer_name=data['customer_name'],
            customer_email=data.get('customer_email', ''),
            customer_phone=data.get('customer_phone', ''),
            customer_address=data.get('customer_address', ''),
            subtotal=subtotal,
            discount_percent=discount_percent,
            discount_amount=discount_amount,
            tax_percent=tax_percent,
            tax_amount=tax_amount,
            total=total,
            payment_method=data.get('payment_method', ''),
            payment_reference=data.get('payment_reference', ''),
            notes=data.get('notes', ''),
            internal_notes=data.get('internal_notes', ''),
            status=Invoice.Status.DRAFT,
            created_by=request.user,
        )
        
        # Create invoice items and update inventory
        for item_data in invoice_items:
            product = item_data['product']
            
            InvoiceItem.objects.create(
                invoice=invoice,
                product=product,
                product_name=product.name,
                product_sku=product.sku,
                product_barcode=product.barcode,
                quantity=item_data['quantity'],
                unit_price=item_data['unit_price'],
                cost_price=item_data['cost_price'],
                discount_percent=item_data['discount_percent'],
                discount_amount=item_data['discount_amount'],
                total=item_data['total'],
            )
            
            # Update inventory
            inventory = product.inventory
            quantity_before = inventory.quantity
            inventory.quantity -= item_data['quantity']
            inventory.last_sold = timezone.now()
            inventory.save()
            
            # Create stock movement
            StockMovement.objects.create(
                product=product,
                movement_type='out',
                quantity=-item_data['quantity'],
                quantity_before=quantity_before,
                quantity_after=inventory.quantity,
                reference=invoice_number,
                reference_type='invoice',
                created_by=request.user,
            )
        
        return Response(
            InvoiceDetailSerializer(invoice).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def pay(self, request, pk=None):
        """Record a payment for an invoice."""
        invoice = self.get_object()
        
        amount = request.data.get('amount')
        payment_method = request.data.get('payment_method')
        
        if not amount or not payment_method:
            return Response(
                {'error': 'Amount and payment method are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        amount = float(amount)
        
        if amount <= 0:
            return Response(
                {'error': 'Amount must be positive'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if amount > invoice.balance_due:
            return Response(
                {'error': 'Amount exceeds balance due'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create payment
        Payment.objects.create(
            invoice=invoice,
            amount=amount,
            payment_method=payment_method,
            reference=request.data.get('reference', ''),
            notes=request.data.get('notes', ''),
            received_by=request.user,
        )
        
        # Update invoice
        invoice.paid_amount += amount
        if invoice.is_fully_paid:
            invoice.status = Invoice.Status.PAID
        else:
            invoice.status = Invoice.Status.PARTIALLY_PAID
        invoice.payment_method = payment_method
        invoice.save()
        
        return Response(InvoiceDetailSerializer(invoice).data)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel an invoice and restore inventory."""
        invoice = self.get_object()
        
        if invoice.status == Invoice.Status.CANCELLED:
            return Response(
                {'error': 'Invoice is already cancelled'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Restore inventory
        for item in invoice.items.all():
            inventory = item.product.inventory
            quantity_before = inventory.quantity
            inventory.quantity += item.quantity
            inventory.save()
            
            # Create stock movement
            StockMovement.objects.create(
                product=item.product,
                movement_type='return',
                quantity=item.quantity,
                quantity_before=quantity_before,
                quantity_after=inventory.quantity,
                reference=invoice.invoice_number,
                reference_type='invoice_cancel',
                notes=f'Cancelled invoice {invoice.invoice_number}',
                created_by=request.user,
            )
        
        invoice.status = Invoice.Status.CANCELLED
        invoice.save()
        
        return Response(InvoiceDetailSerializer(invoice).data)
    
    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """Generate PDF for invoice."""
        invoice = self.get_object()
        # TODO: Implement PDF generation
        return Response({
            'message': 'PDF generation coming soon',
            'invoice_number': invoice.invoice_number
        })


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """Payment history (read-only)."""
    queryset = Payment.objects.select_related('invoice', 'received_by').all()
    serializer_class = PaymentSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    ordering_fields = ['created_at']
    filterset_fields = ['invoice', 'payment_method']
