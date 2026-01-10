"""
Products app views.
"""

from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils.text import slugify
import uuid

from .models import Brand, Category, Product
from .serializers import (
    BrandSerializer,
    CategorySerializer,
    ProductListSerializer,
    ProductDetailSerializer,
)
from inventory.models import Inventory


class BrandViewSet(viewsets.ModelViewSet):
    """Brand CRUD viewset."""
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    filterset_fields = ['is_active']
    
    def perform_create(self, serializer):
        name = serializer.validated_data.get('name')
        slug = slugify(name)
        serializer.save(slug=slug)


class CategoryViewSet(viewsets.ModelViewSet):
    """Category CRUD viewset."""
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    filterset_fields = ['is_active', 'parent']
    
    def perform_create(self, serializer):
        name = serializer.validated_data.get('name')
        slug = slugify(name)
        serializer.save(slug=slug)
    
    @action(detail=False, methods=['get'])
    def tree(self, request):
        """Get category tree (only root categories with children)."""
        root_categories = Category.objects.filter(parent=None, is_active=True)
        serializer = self.get_serializer(root_categories, many=True)
        return Response(serializer.data)


class ProductViewSet(viewsets.ModelViewSet):
    """Product CRUD viewset with advanced filtering."""
    queryset = Product.objects.select_related('brand', 'category', 'created_by').all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'sku', 'barcode', 'description']
    ordering_fields = ['name', 'created_at', 'selling_price', 'cost_price']
    filterset_fields = ['brand', 'category', 'status', 'size', 'color']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer
        return ProductDetailSerializer
    
    def perform_create(self, serializer):
        name = serializer.validated_data.get('name')
        slug = slugify(f"{name}-{uuid.uuid4().hex[:6]}")
        
        # Generate barcode if not provided
        barcode = serializer.validated_data.get('barcode')
        if not barcode:
            barcode = f"TRAP{uuid.uuid4().hex[:10].upper()}"
        
        product = serializer.save(slug=slug, barcode=barcode)
        
        # Create inventory record
        Inventory.objects.create(product=product)
    
    @action(detail=True, methods=['get'])
    def barcode(self, request, pk=None):
        """Generate barcode for product."""
        product = self.get_object()
        from barcodes.utils import generate_barcode
        barcode_data = generate_barcode(product.barcode)
        return Response(barcode_data)
    
    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Get products with low stock."""
        products = Product.objects.filter(
            inventory__quantity__lte=models.F('inventory__reorder_level')
        ).select_related('brand', 'category', 'inventory')
        serializer = ProductListSerializer(products, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def out_of_stock(self, request):
        """Get products that are out of stock."""
        products = Product.objects.filter(
            inventory__quantity=0
        ).select_related('brand', 'category', 'inventory')
        serializer = ProductListSerializer(products, many=True)
        return Response(serializer.data)
