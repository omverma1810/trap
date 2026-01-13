"""
Inventory Views for TRAP Inventory System.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAdminUser
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from .models import Warehouse, Product, ProductVariant, StockLedger, StockSnapshot
from .serializers import (
    WarehouseSerializer,
    ProductSerializer,
    ProductCreateSerializer,
    ProductVariantSerializer,
    PurchaseStockSerializer,
    AdjustStockSerializer,
    StockLedgerSerializer,
    StockSummarySerializer,
)
from . import services


@extend_schema_view(
    list=extend_schema(
        summary="List all warehouses",
        tags=['Warehouses']
    ),
    create=extend_schema(
        summary="Create a new warehouse",
        tags=['Warehouses']
    ),
    retrieve=extend_schema(
        summary="Get warehouse details",
        tags=['Warehouses']
    ),
    update=extend_schema(
        summary="Update warehouse",
        tags=['Warehouses']
    ),
    partial_update=extend_schema(
        summary="Partially update warehouse",
        tags=['Warehouses']
    ),
)
class WarehouseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing warehouses.
    """
    queryset = Warehouse.objects.filter(is_active=True)
    serializer_class = WarehouseSerializer
    permission_classes = [AllowAny]  # TODO: Replace with proper auth in Phase 3


@extend_schema_view(
    list=extend_schema(
        summary="List all products with stock",
        description="Returns all products with their variants and current stock levels across warehouses.",
        tags=['Products']
    ),
    create=extend_schema(
        summary="Create a new product",
        description="Create a product with optional variants.",
        tags=['Products']
    ),
    retrieve=extend_schema(
        summary="Get product details",
        tags=['Products']
    ),
)
class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing products and variants.
    """
    queryset = Product.objects.prefetch_related('variants').filter(is_active=True)
    permission_classes = [AllowAny]  # TODO: Replace with proper auth in Phase 3
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ProductCreateSerializer
        return ProductSerializer


class PurchaseStockView(APIView):
    """
    Record a stock purchase (GRN equivalent).
    This creates a PURCHASE ledger entry and updates the snapshot.
    """
    permission_classes = [AllowAny]  # TODO: Replace with proper auth in Phase 3
    
    @extend_schema(
        summary="Record stock purchase",
        description="Record a purchase of stock. Creates an immutable ledger entry.",
        request=PurchaseStockSerializer,
        responses={
            201: StockLedgerSerializer,
            400: {"type": "object", "properties": {"error": {"type": "string"}}}
        },
        tags=['Stock Operations']
    )
    def post(self, request):
        serializer = PurchaseStockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            warehouse = Warehouse.objects.get(id=serializer.validated_data['warehouse_id'])
            variant = ProductVariant.objects.get(id=serializer.validated_data['variant_id'])
            
            ledger_entry = services.record_purchase(
                variant=variant,
                warehouse=warehouse,
                quantity=serializer.validated_data['quantity'],
                reference_id=serializer.validated_data.get('reference_id'),
                notes=serializer.validated_data.get('notes', ''),
                created_by=request.user.username if request.user.is_authenticated else 'system'
            )
            
            return Response(
                StockLedgerSerializer(ledger_entry).data,
                status=status.HTTP_201_CREATED
            )
        except services.InvalidEventError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AdjustStockView(APIView):
    """
    Adjust stock levels (admin only).
    Used for corrections, inventory counts, etc.
    """
    permission_classes = [AllowAny]  # TODO: Replace with IsAdminUser in Phase 3
    
    @extend_schema(
        summary="Adjust stock (Admin only)",
        description="Adjust stock levels. Positive quantity adds stock, negative subtracts. Notes are required.",
        request=AdjustStockSerializer,
        responses={
            201: StockLedgerSerializer,
            400: {"type": "object", "properties": {"error": {"type": "string"}}},
            403: {"type": "object", "properties": {"error": {"type": "string"}}}
        },
        tags=['Stock Operations']
    )
    def post(self, request):
        serializer = AdjustStockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            warehouse = Warehouse.objects.get(id=serializer.validated_data['warehouse_id'])
            variant = ProductVariant.objects.get(id=serializer.validated_data['variant_id'])
            
            ledger_entry = services.record_adjustment(
                variant=variant,
                warehouse=warehouse,
                quantity=serializer.validated_data['quantity'],
                notes=serializer.validated_data['notes'],
                created_by=request.user.username if request.user.is_authenticated else 'admin',
                allow_negative=serializer.validated_data.get('allow_negative', False)
            )
            
            return Response(
                StockLedgerSerializer(ledger_entry).data,
                status=status.HTTP_201_CREATED
            )
        except services.InsufficientStockError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except services.InvalidEventError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class StockSummaryView(APIView):
    """
    Get stock summary across all warehouses.
    """
    permission_classes = [AllowAny]  # TODO: Replace with proper auth in Phase 3
    
    @extend_schema(
        summary="Get stock summary",
        description="Returns total stock, low stock items, and out of stock items.",
        responses={200: StockSummarySerializer},
        tags=['Stock Operations']
    )
    def get(self, request):
        summary = services.get_stock_summary()
        serializer = StockSummarySerializer(summary)
        return Response(serializer.data)


@extend_schema_view(
    list=extend_schema(
        summary="List ledger entries",
        description="View stock movement history (read-only).",
        tags=['Stock Ledger']
    ),
    retrieve=extend_schema(
        summary="Get ledger entry details",
        tags=['Stock Ledger']
    ),
)
class StockLedgerViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only ViewSet for viewing stock ledger entries.
    Ledger entries cannot be created, updated, or deleted through the API.
    Use the stock operation endpoints instead.
    """
    queryset = StockLedger.objects.select_related('variant', 'warehouse').all()
    serializer_class = StockLedgerSerializer
    permission_classes = [AllowAny]  # TODO: Replace with proper auth in Phase 3
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Optional filters
        warehouse_id = self.request.query_params.get('warehouse_id')
        variant_id = self.request.query_params.get('variant_id')
        event_type = self.request.query_params.get('event_type')
        
        if warehouse_id:
            queryset = queryset.filter(warehouse_id=warehouse_id)
        if variant_id:
            queryset = queryset.filter(variant_id=variant_id)
        if event_type:
            queryset = queryset.filter(event_type=event_type)
        
        return queryset
