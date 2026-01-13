"""
Sales Views for TRAP Inventory System.

POS-GRADE API:
- Barcode scan for validation
- Checkout for completing sales
- Sales history (read-only)
"""

from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from drf_spectacular.utils import extend_schema, extend_schema_view

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
    Complete a sale transaction.
    Atomic operation - all items processed together.
    """
    permission_classes = [AllowAny]  # TODO: Replace with proper auth
    
    @extend_schema(
        summary="Complete sale (checkout)",
        description=(
            "Process a complete sale. Creates immutable Sale record, "
            "SaleItem records with snapshotted prices, and SALE ledger entries. "
            "Atomic: if any item fails, entire sale is rolled back."
        ),
        request=CheckoutSerializer,
        responses={
            201: CheckoutResponseSerializer,
            400: {"type": "object", "properties": {"error": {"type": "string"}}}
        },
        tags=['POS Operations']
    )
    def post(self, request):
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            sale = services.process_sale(
                items=serializer.validated_data['items'],
                warehouse_id=str(serializer.validated_data['warehouse_id']),
                payment_method=serializer.validated_data['payment_method'],
                created_by=request.user.username if request.user.is_authenticated else 'cashier'
            )
            
            return Response({
                'success': True,
                'sale_id': str(sale.id),
                'sale_number': sale.sale_number,
                'total_amount': str(sale.total_amount),
                'total_items': sale.total_items,
                'payment_method': sale.payment_method,
                'message': 'Sale completed successfully'
            }, status=status.HTTP_201_CREATED)
        
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
        description="View sales history (read-only).",
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
