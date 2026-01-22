"""
Sales Views for TRAP Inventory System.

PHASE 13: POS ENGINE (LEDGER-BACKED)
=====================================

POS-GRADE API:
- Barcode scan for validation
- Atomic sale creation with multi-payment
- Sales history (read-only)

RBAC:
- Admin/Staff: Create sales, view sales
- No one: Edit/delete sales (immutable)
"""

from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from decimal import Decimal

from .models import Sale, SaleItem
from .serializers import (
    SaleSerializer,
    SaleListSerializer,
    BarcodeScanSerializer,
    BarcodeScanResponseSerializer,
    CheckoutSerializer,
    CheckoutResponseSerializer,
)
from . import services
from core.pagination import StandardResultsSetPagination
from users.permissions import IsStaffOrAdmin


class BarcodeScanView(APIView):
    """
    Validate a barcode scan for POS operations.
    Returns product info and stock availability.
    """
    permission_classes = [IsStaffOrAdmin]
    
    @extend_schema(
        summary="Scan barcode",
        description="Validate a barcode and check stock availability for POS.",
        request=BarcodeScanSerializer,
        responses={
            200: BarcodeScanResponseSerializer,
            400: {"type": "object", "properties": {"error": {"type": "string"}}},
            404: {"type": "object", "properties": {"error": {"type": "string"}}},
        },
        tags=['POS Operations']
    )
    def post(self, request):
        serializer = BarcodeScanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            result = services.scan_barcode(
                barcode=serializer.validated_data['barcode'],
                warehouse_id=str(serializer.validated_data['warehouse_id']),
                quantity=serializer.validated_data.get('quantity', 1)
            )
            return Response(result, status=status.HTTP_200_OK)
        
        except services.InvalidBarcodeError as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
        except services.InactiveProductError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except services.WarehouseNotFoundError as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
        except services.SaleError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class CheckoutView(APIView):
    """
    Complete a sale transaction atomically.
    
    PHASE 13 FEATURES:
    - Multi-payment support
    - Discount support (PERCENT or FLAT)
    - Barcode-first product resolution
    - Stock validation via inventory ledger
    - Atomic transaction with rollback
    
    IDEMPOTENCY:
    - Must include idempotency_key (UUID v4)
    - If sale exists with same key and is COMPLETED: return existing sale
    - Prevents duplicate checkouts on network retry
    
    ATOMIC OPERATION:
    - If any item fails, entire sale is rolled back
    - Inventory movements created for each item
    - Payments must sum to total exactly
    """
    permission_classes = [IsStaffOrAdmin]
    
    @extend_schema(
        summary="Create sale (checkout)",
        description="""
Process a complete sale with atomic transaction and idempotency protection.

**REQUIRED FLOW:**
1. Start DB transaction
2. Resolve products by barcode
3. For each item: validate stock availability
4. Calculate subtotal, discount, total
5. Validate payments sum == total
6. Create Sale, SaleItems, Payments
7. Create inventory movements (SALE type)
8. Commit transaction

**FAILURE MODES:**
- Insufficient stock → reject entire sale
- Invalid barcode → reject entire sale
- Payment mismatch → reject entire sale
- Any error → rollback everything

**IDEMPOTENCY:**
- Include unique `idempotency_key` (UUID v4)
- Duplicate requests return existing sale
        """,
        request=CheckoutSerializer,
        responses={
            200: CheckoutResponseSerializer,
            201: CheckoutResponseSerializer,
            400: {"type": "object", "properties": {"error": {"type": "string"}}},
            404: {"type": "object", "properties": {"error": {"type": "string"}}},
        },
        tags=['POS Operations']
    )
    def post(self, request):
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        idempotency_key = serializer.validated_data['idempotency_key']
        
        # Check if this is a duplicate request
        existing_before = services._check_existing_sale(idempotency_key)
        
        try:
            sale = services.process_sale(
                idempotency_key=idempotency_key,
                warehouse_id=str(serializer.validated_data['warehouse_id']),
                items=serializer.validated_data['items'],
                payments=serializer.validated_data['payments'],
                user=request.user,
                discount_type=serializer.validated_data.get('discount_type'),
                discount_value=serializer.validated_data.get('discount_value', Decimal('0.00')),
                customer_name=serializer.validated_data.get('customer_name', ''),
            )
            
            is_duplicate = existing_before is not None
            http_status = status.HTTP_200_OK if is_duplicate else status.HTTP_201_CREATED
            
            return Response({
                'success': sale.status == Sale.Status.COMPLETED,
                'idempotency_key': str(sale.idempotency_key),
                'is_duplicate': is_duplicate,
                'sale_id': str(sale.id),
                'invoice_number': sale.invoice_number,
                'subtotal': str(sale.subtotal),
                'discount_type': sale.discount_type,
                'discount_value': str(sale.discount_value),
                'discount_amount': str(sale.discount_amount),
                'total_gst': str(sale.total_gst),
                'total': str(sale.total),
                'total_items': sale.total_items,
                'status': sale.status,
                'message': 'Existing sale returned (idempotent)' if is_duplicate else 'Sale completed successfully',
                # Invoice info if generated
                'invoice_id': str(getattr(sale, '_generated_invoice', None).id) if getattr(sale, '_generated_invoice', None) else None,
                'pdf_url': getattr(getattr(sale, '_generated_invoice', None), 'pdf_url', None),
            }, status=http_status)
        
        except services.InvalidBarcodeError as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
        except services.InactiveProductError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except services.InsufficientStockError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except services.PaymentMismatchError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except services.InvalidDiscountError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except services.WarehouseNotFoundError as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
        except services.SaleError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class SaleViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only ViewSet for sales.
    
    IMMUTABILITY:
    - Sales cannot be created through this endpoint (use /checkout/)
    - Sales cannot be updated
    - Sales cannot be deleted
    """
    queryset = Sale.objects.prefetch_related(
        'items__product',
        'payments',
        'warehouse'
    ).all()
    permission_classes = [IsStaffOrAdmin]
    pagination_class = StandardResultsSetPagination
    
    def get_serializer_class(self):
        if self.action == 'list':
            return SaleListSerializer
        return SaleSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Optional filters
        warehouse_id = self.request.query_params.get('warehouse_id')
        status_filter = self.request.query_params.get('status')
        
        if warehouse_id:
            queryset = queryset.filter(warehouse_id=warehouse_id)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset
