"""
Invoice Views for TRAP Inventory System.

INVOICE API:
- Generate invoice for completed sale
- View invoice details
- Download invoice PDF
"""

from django.http import FileResponse, Http404
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.decorators import action
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

import os
from django.conf import settings

from .models import Invoice, InvoiceItem
from .serializers import (
    InvoiceSerializer,
    InvoiceListSerializer,
    GenerateInvoiceSerializer,
    GenerateInvoiceResponseSerializer,
)
from . import services


class GenerateInvoiceView(APIView):
    """
    Generate an invoice for a completed sale.
    
    RULES:
    - Sale must be COMPLETED
    - Each sale can only have one invoice
    - Invoice is immutable after creation
    - Discount is optional
    """
    permission_classes = [AllowAny]  # TODO: Replace with IsAdminUser
    
    @extend_schema(
        summary="Generate invoice for sale",
        description=(
            "Generate an invoice for a completed sale with optional discount.\n\n"
            "**DISCOUNT TYPES:**\n"
            "- `NONE`: No discount (default)\n"
            "- `PERCENTAGE`: Percentage off subtotal (0-100%)\n"
            "- `FLAT`: Fixed amount off subtotal\n\n"
            "**RULES:**\n"
            "- Sale must have status `COMPLETED`\n"
            "- Each sale can only have one invoice\n"
            "- Invoice cannot be modified after creation\n\n"
            "**EXAMPLE (No Discount):**\n"
            "```json\n"
            "{\n"
            "  \"sale_id\": \"uuid\",\n"
            "  \"billing_name\": \"John Doe\",\n"
            "  \"billing_phone\": \"9999999999\"\n"
            "}\n"
            "```\n\n"
            "**EXAMPLE (10% Discount):**\n"
            "```json\n"
            "{\n"
            "  \"sale_id\": \"uuid\",\n"
            "  \"billing_name\": \"John Doe\",\n"
            "  \"billing_phone\": \"9999999999\",\n"
            "  \"discount_type\": \"PERCENTAGE\",\n"
            "  \"discount_value\": 10\n"
            "}\n"
            "```\n\n"
            "**EXAMPLE (₹500 Flat Discount):**\n"
            "```json\n"
            "{\n"
            "  \"sale_id\": \"uuid\",\n"
            "  \"billing_name\": \"John Doe\",\n"
            "  \"billing_phone\": \"9999999999\",\n"
            "  \"discount_type\": \"FLAT\",\n"
            "  \"discount_value\": 500\n"
            "}\n"
            "```"
        ),
        request=GenerateInvoiceSerializer,
        responses={
            201: GenerateInvoiceResponseSerializer,
            400: {"type": "object", "properties": {"error": {"type": "string"}}},
            404: {"type": "object", "properties": {"error": {"type": "string"}}},
            409: {"type": "object", "properties": {"error": {"type": "string"}}}
        },
        tags=['Invoices']
    )
    def post(self, request):
        serializer = GenerateInvoiceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            invoice = services.generate_invoice_for_sale(
                sale_id=str(serializer.validated_data['sale_id']),
                billing_name=serializer.validated_data['billing_name'],
                billing_phone=serializer.validated_data['billing_phone'],
                discount_type=serializer.validated_data.get('discount_type', 'NONE'),
                discount_value=serializer.validated_data.get('discount_value')
            )
            
            return Response({
                'success': True,
                'invoice_id': str(invoice.id),
                'invoice_number': invoice.invoice_number,
                'sale_number': invoice.sale.sale_number,
                'subtotal_amount': str(invoice.subtotal_amount),
                'discount_type': invoice.discount_type,
                'discount_value': str(invoice.discount_value) if invoice.discount_value else None,
                'discount_amount': str(invoice.discount_amount),
                'total_amount': str(invoice.total_amount),
                'pdf_url': invoice.pdf_url,
                'message': 'Invoice generated successfully'
            }, status=status.HTTP_201_CREATED)
        
        except services.SaleNotFoundError as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
        except services.SaleNotCompletedError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except services.InvoiceAlreadyExistsError as e:
            return Response({'error': str(e)}, status=status.HTTP_409_CONFLICT)
        except services.InvalidDiscountError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except services.InvoiceError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema_view(
    list=extend_schema(
        summary="List invoices",
        description="View all invoices (read-only).",
        tags=['Invoices']
    ),
    retrieve=extend_schema(
        summary="Get invoice details",
        description="View complete invoice with all items (read-only).",
        tags=['Invoices']
    ),
)
class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only ViewSet for invoices.
    
    IMMUTABILITY:
    - Invoices cannot be created through this endpoint (use /generate/)
    - Invoices cannot be updated
    - Invoices cannot be deleted
    """
    queryset = Invoice.objects.prefetch_related(
        'items',
        'warehouse',
        'sale'
    ).all()
    permission_classes = [AllowAny]  # TODO: Replace with proper auth
    
    def get_serializer_class(self):
        if self.action == 'list':
            return InvoiceListSerializer
        return InvoiceSerializer
    
    @extend_schema(
        summary="Download invoice PDF",
        description="Download the invoice as a PDF file.",
        responses={
            200: {"type": "string", "format": "binary"},
            404: {"type": "object", "properties": {"error": {"type": "string"}}}
        },
        tags=['Invoices']
    )
    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """Download invoice PDF."""
        try:
            invoice = self.get_object()
        except Invoice.DoesNotExist:
            raise Http404("Invoice not found")
        
        if not invoice.pdf_url:
            return Response(
                {'error': 'PDF not available for this invoice'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Build full file path
        pdf_filename = invoice.pdf_url.replace('/media/', '')
        pdf_path = os.path.join(settings.BASE_DIR, 'media', pdf_filename)
        
        if not os.path.exists(pdf_path):
            return Response(
                {'error': 'PDF file not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return FileResponse(
            open(pdf_path, 'rb'),
            as_attachment=True,
            filename=f"{invoice.invoice_number.replace('/', '_')}.pdf"
        )
