"""
Sales Views for TRAP Inventory System.

POS-GRADE API:
- Barcode scan for validation
- Checkout for completing sales (with idempotency)
- Sales history (read-only)

PHASE 3.1 ADDITIONS:
- Idempotency via idempotency_key
- Status lifecycle visibility
"""

from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

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


class BarcodeScanView(APIView):
    """
    Validate a barcode scan for POS operations.
    Returns variant info and stock availability.
    """
    permission_classes = [AllowAny]  # TODO: Replace with proper auth
    
    @extend_schema(
        summary="Scan barcode",
        description="Validate a barcode and check stock availability for POS.",
        request=BarcodeScanSerializer,
        responses={
            200: BarcodeScanResponseSerializer,
            400: {"type": "object", "properties": {"error": {"type": "string"}}},
            404: {"type": "object", "properties": {"error": {"type": "string"}}}
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
        except services.InactiveVariantError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except services.SaleError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class CheckoutView(APIView):
    """
    Complete a sale transaction with idempotency.
    
    IDEMPOTENCY:
    - Must include idempotency_key (UUID v4)
    - If sale exists with same key and is COMPLETED: return existing sale
    - If sale exists and is PENDING: return existing sale (in progress)
    - Prevents duplicate checkouts on network retry
    
    STATUS LIFECYCLE:
    - PENDING: Checkout started
    - COMPLETED: Checkout successful
    - FAILED: Checkout failed (rollback)
    - CANCELLED: Voided (future)
    
    Atomic operation - all items processed together.
    """
    permission_classes = [AllowAny]  # TODO: Replace with proper auth
    
    @extend_schema(
        summary="Complete sale (checkout) with idempotency",
        description=(
            "Process a complete sale with idempotency protection.\n\n"
            "**IDEMPOTENCY:**\n"
            "- Include a unique `idempotency_key` (UUID v4) with each checkout\n"
            "- If the same key is sent twice, the existing sale is returned\n"
            "- No duplicate stock deductions or ledger entries\n\n"
            "**STATUS LIFECYCLE:**\n"
            "- `PENDING`: Checkout in progress\n"
            "- `COMPLETED`: Checkout successful\n"
            "- `FAILED`: Checkout failed (stock rolled back)\n"
            "- `CANCELLED`: Voided (future phase)\n\n"
            "**ATOMIC OPERATION:**\n"
            "- If any item fails, entire sale is rolled back\n"
            "- Sale items created with snapshotted prices\n"
            "- SALE ledger entries created for stock reduction"
        ),
        request=CheckoutSerializer,
        responses={
            200: CheckoutResponseSerializer,  # Existing sale returned (idempotency hit)
            201: CheckoutResponseSerializer,  # New sale created
            400: {"type": "object", "properties": {"error": {"type": "string"}}}
        },
        tags=['POS Operations']
    )
    def post(self, request):
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        idempotency_key = serializer.validated_data['idempotency_key']
        
        # Check if this is a duplicate request (for determining response status code)
        existing_before = services._check_existing_sale(idempotency_key)
        
        try:
            sale = services.process_sale(
                idempotency_key=idempotency_key,
                items=serializer.validated_data['items'],
                warehouse_id=str(serializer.validated_data['warehouse_id']),
                payment_method=serializer.validated_data['payment_method'],
                created_by=request.user.username if request.user.is_authenticated else 'cashier'
            )
            
            is_duplicate = existing_before is not None
            http_status = status.HTTP_200_OK if is_duplicate else status.HTTP_201_CREATED
            
            return Response({
                'success': sale.status == Sale.Status.COMPLETED,
                'idempotency_key': str(sale.idempotency_key),
                'is_duplicate': is_duplicate,
                'sale_id': str(sale.id),
                'sale_number': sale.sale_number,
                'total_amount': str(sale.total_amount),
                'total_items': sale.total_items,
                'payment_method': sale.payment_method,
                'status': sale.status,
                'message': 'Existing sale returned (idempotent)' if is_duplicate else 'Sale completed successfully'
            }, status=http_status)
        
        except services.InvalidBarcodeError as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
        except services.InactiveVariantError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except services.InsufficientStockForSaleError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except services.SaleError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema_view(
    list=extend_schema(
        summary="List sales",
        description=(
            "View sales history (read-only).\n\n"
            "**STATUS VALUES:**\n"
            "- `PENDING`: Checkout in progress\n"
            "- `COMPLETED`: Checkout successful\n"
            "- `FAILED`: Checkout failed\n"
            "- `CANCELLED`: Voided\n\n"
            "Filter by status using `?status=COMPLETED`"
        ),
        parameters=[
            OpenApiParameter(
                name='status',
                description='Filter by sale status (PENDING, COMPLETED, FAILED, CANCELLED)',
                required=False,
                type=str
            ),
            OpenApiParameter(
                name='warehouse_id',
                description='Filter by warehouse UUID',
                required=False,
                type=str
            ),
            OpenApiParameter(
                name='payment_method',
                description='Filter by payment method (CASH, UPI, CARD)',
                required=False,
                type=str
            ),
        ],
        tags=['Sales History']
    ),
    retrieve=extend_schema(
        summary="Get sale details",
        description="View complete sale with all items (read-only).",
        tags=['Sales History']
    ),
)
class SaleViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only ViewSet for sales.
    
    IMMUTABILITY:
    - Sales cannot be created through this endpoint (use /checkout/)
    - Sales cannot be updated
    - Sales cannot be deleted
    """
    queryset = Sale.objects.prefetch_related(
        'items__variant__product',
        'warehouse'
    ).all()
    permission_classes = [AllowAny]  # TODO: Replace with proper auth
    
    def get_serializer_class(self):
        if self.action == 'list':
            return SaleListSerializer
        return SaleSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Optional filters
        warehouse_id = self.request.query_params.get('warehouse_id')
        payment_method = self.request.query_params.get('payment_method')
        status_filter = self.request.query_params.get('status')
        
        if warehouse_id:
            queryset = queryset.filter(warehouse_id=warehouse_id)
        if payment_method:
            queryset = queryset.filter(payment_method=payment_method)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset
