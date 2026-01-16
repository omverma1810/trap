"""
Inventory Views for TRAP Inventory System.

HARDENING RULES:
- No hard delete for business entities (Product, Warehouse, Variant)
- Soft delete via is_deleted=True for Product (Phase 10A)
- Soft delete via is_active=False for legacy entities
- StockLedger is read-only (no create/update/delete via API)
- Barcode is immutable after creation
"""

from django.db import models
from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAdminUser
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from .models import (
    Warehouse, Product, ProductVariant, StockLedger, StockSnapshot,
    ProductPricing, ProductImage
)
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
    ProductPricingSerializer,
    ProductImageSerializer,
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
        description="Returns products with variants, pricing, and stock levels. Phase 10A filters available.",
        parameters=[
            OpenApiParameter(
                name='include_inactive',
                type=OpenApiTypes.BOOL,
                location=OpenApiParameter.QUERY,
                description='Include inactive products',
                required=False
            ),
            OpenApiParameter(
                name='is_deleted',
                type=OpenApiTypes.BOOL,
                location=OpenApiParameter.QUERY,
                description='Filter by is_deleted flag (admin only)',
                required=False
            ),
            OpenApiParameter(
                name='price_min',
                type=OpenApiTypes.DECIMAL,
                location=OpenApiParameter.QUERY,
                description='Minimum selling price',
                required=False
            ),
            OpenApiParameter(
                name='price_max',
                type=OpenApiTypes.DECIMAL,
                location=OpenApiParameter.QUERY,
                description='Maximum selling price',
                required=False
            ),
        ],
        tags=['Products']
    ),
    create=extend_schema(
        summary="Create a new product",
        description="Create a product with optional variants, pricing, and images.",
        tags=['Products']
    ),
    retrieve=extend_schema(
        summary="Get product details",
        tags=['Products']
    ),
    update=extend_schema(
        summary="Update product",
        description="Update product details. Barcode cannot be changed after creation.",
        tags=['Products']
    ),
    partial_update=extend_schema(
        summary="Partially update product",
        description="Partial update. Barcode is immutable.",
        tags=['Products']
    ),
    destroy=extend_schema(
        summary="Soft delete product (sets is_deleted=True)",
        description="Marks product as deleted. Hidden from POS, visible in admin with is_deleted=true filter.",
        tags=['Products']
    ),
)
class ProductViewSet(IncludeInactiveMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing products and variants.
    
    PHASE 10A FEATURES:
    - SKU and barcode at product level (auto-generated, immutable)
    - JSONB attributes for flexible apparel data
    - Separate pricing table with computed margin
    - Product images
    - Soft delete via is_deleted flag (hidden from POS, visible to admin)
    
    HARDENING:
    - Barcode immutable after creation
    - Delete operations perform soft-delete (is_deleted=True)
    
    FILTERING:
    - search: Search by name, brand, SKU, or barcode
    - category: Filter by category (exact match)
    - brand: Filter by brand (exact match)
    - gender: Filter by gender (MENS, WOMENS, UNISEX, KIDS)
    - material: Filter by material (contains match)
    - season: Filter by season (exact match)
    - price_min/price_max: Filter by selling price range
    - is_deleted: Show deleted products (admin only)
    """
    queryset = Product.objects.prefetch_related(
        'variants', 'images'
    ).select_related('pricing').filter(is_active=True, is_deleted=False)
    permission_classes = [IsAdminOrReadOnly]  # Read: any auth, Write: admin
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        
        # Phase 10A: is_deleted filter (admin only)
        is_deleted = params.get('is_deleted')
        if is_deleted is not None:
            # Only admin can see deleted products
            if hasattr(self.request.user, 'role') and self.request.user.role == 'ADMIN':
                if is_deleted.lower() == 'true':
                    queryset = Product.objects.prefetch_related(
                        'variants', 'images'
                    ).select_related('pricing').filter(is_deleted=True)
                elif is_deleted.lower() == 'false':
                    queryset = queryset.filter(is_deleted=False)
        
        # Search filter - now includes SKU and barcode
        search = params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(name__icontains=search) |
                models.Q(brand__icontains=search) |
                models.Q(sku__icontains=search) |
                models.Q(barcode_value__icontains=search) |
                models.Q(variants__sku__icontains=search)
            ).distinct()
        
        # Category filter
        category = params.get('category')
        if category:
            queryset = queryset.filter(category__iexact=category)
        
        # Brand filter
        brand = params.get('brand')
        if brand:
            queryset = queryset.filter(brand__iexact=brand)
        
        # Gender filter
        gender = params.get('gender')
        if gender:
            queryset = queryset.filter(gender__iexact=gender)
        
        # Material filter (contains)
        material = params.get('material')
        if material:
            queryset = queryset.filter(material__icontains=material)
        
        # Season filter
        season = params.get('season')
        if season:
            queryset = queryset.filter(season__iexact=season)
        
        # Phase 10A: Price range filters
        price_min = params.get('price_min')
        if price_min:
            try:
                queryset = queryset.filter(pricing__selling_price__gte=float(price_min))
            except (ValueError, TypeError):
                pass
        
        price_max = params.get('price_max')
        if price_max:
            try:
                queryset = queryset.filter(pricing__selling_price__lte=float(price_max))
            except (ValueError, TypeError):
                pass
        
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ProductCreateSerializer
        if self.action in ['update', 'partial_update']:
            return ProductUpdateSerializer
        return ProductSerializer
    
    def destroy(self, request, *args, **kwargs):
        """
        Soft delete product via is_deleted flag (Phase 10A).
        Also deactivates all variants.
        """
        instance = self.get_object()
        
        # Set is_deleted=True (Phase 10A soft delete)
        instance.is_deleted = True
        instance.save(update_fields=['is_deleted', 'updated_at'])
        
        # Deactivate all variants
        instance.variants.update(is_active=False)
        
        return Response(
            {
                "message": "Product soft deleted successfully",
                "id": str(instance.id),
                "is_deleted": True
            },
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


class BarcodeImageView(APIView):
    """
    Generate and serve barcode images as SVG.
    
    GET /api/v1/inventory/barcodes/{barcode}/image/
    """
    permission_classes = [AllowAny]  # Public for printing
    
    @extend_schema(
        summary="Get barcode image",
        description="Returns SVG image of the barcode for printing.",
        responses={
            200: {"type": "string", "format": "binary"},
            404: {"type": "object", "properties": {"error": {"type": "string"}}}
        },
        tags=['Barcodes']
    )
    def get(self, request, barcode):
        """Generate SVG barcode image."""
        from django.http import HttpResponse
        import io
        
        # Phase 10A: Try Product-level barcode first, then variant
        found = False
        try:
            product = Product.objects.get(barcode_value=barcode)
            found = True
        except Product.DoesNotExist:
            try:
                variant = ProductVariant.objects.select_related('product').get(barcode=barcode)
                found = True
            except ProductVariant.DoesNotExist:
                pass
        
        if not found:
            return Response(
                {"error": "Barcode not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            import barcode
            from barcode.writer import SVGWriter
            
            # Generate EAN-13 or Code128 barcode
            # EAN-13 requires exactly 12 or 13 digits
            barcode_value = barcode.strip()
            
            # Try EAN-13 first (if 13 digits)
            if len(barcode_value) == 13 and barcode_value.isdigit():
                ean = barcode.get('ean13', barcode_value[:12], writer=SVGWriter())
            else:
                # Fall back to Code128 for non-standard barcodes
                ean = barcode.get('code128', barcode_value, writer=SVGWriter())
            
            # Generate SVG to buffer
            buffer = io.BytesIO()
            ean.write(buffer, options={
                'module_width': 0.4,
                'module_height': 15.0,
                'font_size': 10,
                'text_distance': 5.0,
                'quiet_zone': 6.0,
            })
            buffer.seek(0)
            
            return HttpResponse(
                buffer.getvalue(),
                content_type='image/svg+xml',
                headers={
                    'Cache-Control': 'public, max-age=86400',  # Cache for 24 hours
                    'Content-Disposition': f'inline; filename="barcode-{barcode}.svg"'
                }
            )
        except Exception as e:
            return Response(
                {"error": f"Failed to generate barcode: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class POSProductsView(APIView):
    """
    Get products formatted for POS - flattened variants as sellable units.
    
    Unlike /inventory/products/ which returns nested product->variants,
    this endpoint returns a flat list of variants for the POS product grid.
    Each item is a sellable unit with stock from StockSnapshot.
    """
    permission_classes = [IsStaffOrAdmin]
    
    @extend_schema(
        summary="Get POS products",
        description=(
            "Returns a flattened list of product variants for POS.\n"
            "Each item is a sellable unit with real-time stock from StockSnapshot.\n"
            "Use this for the POS product grid instead of /products/."
        ),
        parameters=[
            OpenApiParameter(
                name='warehouse_id',
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.QUERY,
                description='Filter by warehouse (optional - defaults to all warehouses)',
                required=False
            ),
            OpenApiParameter(
                name='search',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Search by name, SKU, or barcode',
                required=False
            ),
            OpenApiParameter(
                name='category',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filter by category',
                required=False
            ),
            OpenApiParameter(
                name='in_stock_only',
                type=OpenApiTypes.BOOL,
                location=OpenApiParameter.QUERY,
                description='Only show items with stock > 0',
                required=False
            ),
        ],
        responses={
            200: {
                'type': 'object',
                'properties': {
                    'results': {'type': 'array'},
                    'meta': {'type': 'object'}
                }
            }
        },
        tags=['POS Operations']
    )
    def get(self, request):
        from .serializers import POSVariantSerializer
        from django.db.models import Sum, Q
        
        # Get query params
        warehouse_id = request.query_params.get('warehouse_id')
        search = request.query_params.get('search', '').strip()
        category = request.query_params.get('category', '').strip()
        in_stock_only = request.query_params.get('in_stock_only', 'false').lower() == 'true'
        
        # Base queryset - active variants with active products
        variants = ProductVariant.objects.select_related('product').filter(
            is_active=True,
            product__is_active=True
        )
        
        # Apply search filter
        if search:
            variants = variants.filter(
                Q(product__name__icontains=search) |
                Q(sku__icontains=search) |
                Q(barcode__icontains=search) |
                Q(product__brand__icontains=search)
            )
        
        # Apply category filter
        if category:
            variants = variants.filter(product__category__iexact=category)
        
        # Build response with stock data
        results = []
        for variant in variants:
            # Get stock - either from specific warehouse or all warehouses
            if warehouse_id:
                try:
                    snapshot = StockSnapshot.objects.get(
                        variant=variant,
                        warehouse_id=warehouse_id
                    )
                    stock = snapshot.quantity
                except StockSnapshot.DoesNotExist:
                    stock = 0
            else:
                # Total across all warehouses
                stock = variant.get_total_stock()
            
            # Skip out-of-stock if filter is on
            if in_stock_only and stock <= 0:
                continue
            
            # Determine stock status
            if stock <= 0:
                stock_status = 'OUT_OF_STOCK'
            elif stock <= variant.reorder_threshold:
                stock_status = 'LOW_STOCK'
            else:
                stock_status = 'IN_STOCK'
            
            # Build display name
            variant_parts = []
            if variant.size:
                variant_parts.append(variant.size)
            if variant.color:
                variant_parts.append(variant.color)
            variant_str = ' / '.join(variant_parts) if variant_parts else ''
            
            display_name = variant.product.name
            if variant_str:
                display_name = f"{display_name} ({variant_str})"
            
            # Build barcode image URL
            barcode_url = None
            if variant.barcode:
                barcode_url = request.build_absolute_uri(
                    f'/api/v1/inventory/barcodes/{variant.barcode}/image/'
                )
            
            results.append({
                'id': str(variant.id),
                'name': display_name,
                'product_name': variant.product.name,
                'brand': variant.product.brand,
                'category': variant.product.category,
                'sku': variant.sku,
                'barcode': variant.barcode,
                'size': variant.size,
                'color': variant.color,
                'selling_price': str(variant.selling_price),
                'cost_price': str(variant.cost_price),
                'stock': stock,
                'stock_status': stock_status,
                'reorder_threshold': variant.reorder_threshold,
                'barcode_image_url': barcode_url,
            })
        
        # Sort by name
        results.sort(key=lambda x: x['name'])
        
        return Response({
            'results': results,
            'meta': {
                'total': len(results),
                'page': 1,
                'pageSize': len(results),
                'hasNext': False,
                'hasPrev': False
            }
        })
