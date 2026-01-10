"""
Inventory app views.
"""

from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import F

from .models import Inventory, StockMovement, Supplier, PurchaseOrder
from .serializers import (
    InventorySerializer,
    InventoryUpdateSerializer,
    StockAdjustmentSerializer,
    StockMovementSerializer,
    SupplierSerializer,
    PurchaseOrderSerializer,
)
from products.models import Product


class InventoryViewSet(viewsets.ModelViewSet):
    """Inventory viewset."""
    queryset = Inventory.objects.select_related('product', 'product__brand', 'product__category').all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['product__name', 'product__sku', 'warehouse_location']
    ordering_fields = ['quantity', 'product__name', 'updated_at']
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return InventoryUpdateSerializer
        return InventorySerializer
    
    @action(detail=True, methods=['post'])
    def adjust(self, request, pk=None):
        """Adjust stock for a product."""
        inventory = self.get_object()
        serializer = StockAdjustmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        quantity_before = inventory.quantity
        
        # Calculate new quantity
        if data['movement_type'] in ['in', 'return']:
            inventory.quantity += data['quantity']
            inventory.last_restocked = timezone.now()
        elif data['movement_type'] == 'out':
            if data['quantity'] > inventory.quantity:
                return Response(
                    {'error': 'Insufficient stock'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            inventory.quantity -= data['quantity']
        elif data['movement_type'] == 'adjustment':
            inventory.quantity = data['quantity']
        
        inventory.save()
        
        # Create stock movement record
        StockMovement.objects.create(
            product=inventory.product,
            movement_type=data['movement_type'],
            quantity=data['quantity'] if data['movement_type'] != 'out' else -data['quantity'],
            quantity_before=quantity_before,
            quantity_after=inventory.quantity,
            reference=data.get('reference', ''),
            reference_type='manual',
            notes=data.get('notes', ''),
            created_by=request.user,
        )
        
        return Response(InventorySerializer(inventory).data)
    
    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Get items with low stock."""
        items = Inventory.objects.filter(
            quantity__lte=F('reorder_level'),
            quantity__gt=0
        ).select_related('product', 'product__brand', 'product__category')
        serializer = InventorySerializer(items, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def out_of_stock(self, request):
        """Get items that are out of stock."""
        items = Inventory.objects.filter(
            quantity=0
        ).select_related('product', 'product__brand', 'product__category')
        serializer = InventorySerializer(items, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def needs_reorder(self, request):
        """Get items that need to be reordered."""
        items = Inventory.objects.filter(
            quantity__lte=F('reorder_level')
        ).select_related('product', 'product__brand', 'product__category')
        serializer = InventorySerializer(items, many=True)
        return Response(serializer.data)


class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    """Stock movement history (read-only)."""
    queryset = StockMovement.objects.select_related('product', 'created_by').all()
    serializer_class = StockMovementSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    ordering_fields = ['created_at']
    filterset_fields = ['product', 'movement_type', 'reference_type']


class SupplierViewSet(viewsets.ModelViewSet):
    """Supplier CRUD viewset."""
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code', 'contact_person', 'email']
    ordering_fields = ['name', 'created_at']
    filterset_fields = ['is_active']


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    """Purchase order CRUD viewset."""
    queryset = PurchaseOrder.objects.select_related('supplier', 'created_by').prefetch_related('items').all()
    serializer_class = PurchaseOrderSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['order_number', 'supplier__name']
    ordering_fields = ['created_at', 'expected_date']
    filterset_fields = ['status', 'supplier']
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def receive(self, request, pk=None):
        """Mark purchase order as received and update inventory."""
        po = self.get_object()
        
        if po.status != PurchaseOrder.Status.ORDERED:
            return Response(
                {'error': 'Only ordered POs can be received'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update inventory for each item
        for item in po.items.all():
            inventory, created = Inventory.objects.get_or_create(product=item.product)
            quantity_before = inventory.quantity
            inventory.quantity += item.quantity
            inventory.last_restocked = timezone.now()
            inventory.save()
            
            # Create stock movement
            StockMovement.objects.create(
                product=item.product,
                movement_type='in',
                quantity=item.quantity,
                quantity_before=quantity_before,
                quantity_after=inventory.quantity,
                reference=po.order_number,
                reference_type='purchase_order',
                cost_per_unit=item.unit_cost,
                created_by=request.user,
            )
            
            item.received_quantity = item.quantity
            item.save()
        
        po.status = PurchaseOrder.Status.RECEIVED
        po.received_date = timezone.now().date()
        po.save()
        
        return Response(PurchaseOrderSerializer(po).data)


class ScanBarcodeView(APIView):
    """Scan barcode to get product details."""
    
    def post(self, request):
        barcode = request.data.get('barcode')
        if not barcode:
            return Response(
                {'error': 'Barcode is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            product = Product.objects.select_related(
                'brand', 'category', 'inventory'
            ).get(barcode=barcode)
            
            from products.serializers import ProductDetailSerializer
            return Response(ProductDetailSerializer(product).data)
        except Product.DoesNotExist:
            return Response(
                {'error': 'Product not found'},
                status=status.HTTP_404_NOT_FOUND
            )
