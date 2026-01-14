"""
Inventory Views for TRAP Inventory System.

HARDENING RULES:
- No hard delete for business entities (Product, Warehouse, Variant)
- Soft delete via is_active=False
- StockLedger is read-only (no create/update/delete via API)
"""

from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAdminUser
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from .models import Warehouse, Product, ProductVariant, StockLedger, StockSnapshot
from .serializers import (
    WarehouseSerializer,
    ProductSerializer,
    ProductCreateSerializer,
    ProductUpdateSerializer,
    ProductVariantSerializer,
    ProductVariantUpdateSerializer,
    PurchaseStockSerializer,
    AdjustStockSerializer,
    StockLedgerSerializer,
    StockSummarySerializer,
)
from . import services
from core.pagination import StandardResultsSetPagination
from users.permissions import IsAdmin, IsStaffOrAdmin, IsAdminOrReadOnly


class SoftDeleteMixin:
    """
    Mixin to implement soft delete instead of hard delete.
    Sets is_active=False instead of deleting the record.
    """
    
    @extend_schema(
        summary="Deactivate (soft delete)",
        description="Marks the item as inactive instead of deleting. Data is preserved for audit purposes.",
        responses={
            200: {"type": "object", "properties": {"message": {"type": "string"}}},
            404: {"type": "object", "properties": {"error": {"type": "string"}}}
        }
    )
    def destroy(self, request, *args, **kwargs):
        """Soft delete - set is_active=False instead of deleting."""
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])
        return Response(
            {"message": f"{instance.__class__.__name__} deactivated successfully"},
            status=status.HTTP_200_OK
        )


class IncludeInactiveMixin:
    """
    Mixin to optionally include inactive items via ?include_inactive=true
    """
    
    def get_queryset(self):
        queryset = super().get_queryset()
        include_inactive = self.request.query_params.get('include_inactive', 'false').lower()
        
        if include_inactive == 'true':
            # Return all items including inactive
            return self.queryset.model.objects.all()
        
        # Default: only active items
        return queryset


@extend_schema_view(
    list=extend_schema(
        summary="List warehouses",
        description="Returns active warehouses. Use ?include_inactive=true to include deactivated ones.",
        parameters=[
            OpenApiParameter(
                name='include_inactive',
                type=OpenApiTypes.BOOL,
                location=OpenApiParameter.QUERY,
                description='Include inactive warehouses',
                required=False
            )
        ],
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
    destroy=extend_schema(
        summary="Deactivate warehouse (soft delete)",
        description="Marks warehouse as inactive. Cannot be hard deleted.",
        tags=['Warehouses']
    ),
)
class WarehouseViewSet(IncludeInactiveMixin, SoftDeleteMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing warehouses.
    
    HARDENING: Delete operations perform soft-delete (is_active=False).
    """
    queryset = Warehouse.objects.filter(is_active=True)
    serializer_class = WarehouseSerializer
    permission_classes = [IsAdminOrReadOnly]  # Read: any auth, Write: admin
    pagination_class = StandardResultsSetPagination


@extend_schema_view(
    list=extend_schema(
        summary="List products with stock",
        description="Returns active products with variants and stock levels. Use ?include_inactive=true to include deactivated.",
        parameters=[
            OpenApiParameter(
                name='include_inactive',
                type=OpenApiTypes.BOOL,
                location=OpenApiParameter.QUERY,
                description='Include inactive products',
                required=False
            )
        ],
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
    update=extend_schema(
        summary="Update product",
        description="Update product details. Price changes are blocked if stock exists.",
        tags=['Products']
    ),
    partial_update=extend_schema(
        summary="Partially update product",
        description="Partial update. Price changes are blocked if stock exists.",
        tags=['Products']
    ),
    destroy=extend_schema(
        summary="Deactivate product (soft delete)",
        description="Marks product and its variants as inactive. Cannot be hard deleted.",
        tags=['Products']
    ),
)
class ProductViewSet(IncludeInactiveMixin, SoftDeleteMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing products and variants.
    
    HARDENING:
    - Delete operations perform soft-delete (is_active=False)
    - Price updates blocked if stock exists
    """
    queryset = Product.objects.prefetch_related('variants').filter(is_active=True)
    permission_classes = [IsAdminOrReadOnly]  # Read: any auth, Write: admin
    pagination_class = StandardResultsSetPagination
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ProductCreateSerializer
        if self.action in ['update', 'partial_update']:
            return ProductUpdateSerializer
        return ProductSerializer
    
    def destroy(self, request, *args, **kwargs):
        """Soft delete product and all its variants."""
        instance = self.get_object()
        
        # Deactivate product
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])
        
        # Deactivate all variants
        instance.variants.update(is_active=False)
        
        return Response(
            {"message": "Product and all variants deactivated successfully"},
            status=status.HTTP_200_OK
        )


class PurchaseStockView(APIView):
    """
    Record a stock purchase (GRN equivalent).
    This creates a PURCHASE ledger entry and updates the snapshot.
    """
    permission_classes = [IsStaffOrAdmin]  # Staff can purchase stock
    
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
    permission_classes = [IsAdmin]  # Only admin can adjust stock
    
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
    permission_classes = [IsStaffOrAdmin]
    
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
        description="View stock movement history. Read-only - entries cannot be modified or deleted.",
        tags=['Stock Ledger']
    ),
    retrieve=extend_schema(
        summary="Get ledger entry details",
        description="View a single ledger entry. Read-only.",
        tags=['Stock Ledger']
    ),
)
class StockLedgerViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only ViewSet for viewing stock ledger entries.
    
    HARDENING: Ledger entries are IMMUTABLE.
    - Cannot be created through API (use stock operation endpoints)
    - Cannot be updated
    - Cannot be deleted
    - Corrections must be made via ADJUSTMENT entries
    """
    queryset = StockLedger.objects.select_related('variant', 'warehouse').all()
    serializer_class = StockLedgerSerializer
    permission_classes = [IsStaffOrAdmin]  # Any auth user can view ledger
    pagination_class = StandardResultsSetPagination
    
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
