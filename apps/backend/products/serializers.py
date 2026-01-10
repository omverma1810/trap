"""
Products app serializers.
"""

from rest_framework import serializers
from .models import Brand, Category, Product


class BrandSerializer(serializers.ModelSerializer):
    """Brand serializer."""
    
    products_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Brand
        fields = [
            'id', 'name', 'slug', 'logo', 'description', 
            'website', 'is_active', 'products_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_products_count(self, obj):
        return obj.products.count()


class CategorySerializer(serializers.ModelSerializer):
    """Category serializer with parent info."""
    
    parent_name = serializers.CharField(source='parent.name', read_only=True)
    children = serializers.SerializerMethodField()
    products_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = [
            'id', 'name', 'slug', 'parent', 'parent_name',
            'description', 'image', 'is_active', 'children',
            'products_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_children(self, obj):
        return CategorySerializer(obj.children.filter(is_active=True), many=True).data
    
    def get_products_count(self, obj):
        return obj.products.count()


class ProductListSerializer(serializers.ModelSerializer):
    """Product list serializer (lightweight for lists)."""
    
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    stock_status = serializers.SerializerMethodField()
    stock_quantity = serializers.SerializerMethodField()
    profit_margin = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 'sku', 'name', 'slug', 'brand', 'brand_name',
            'category', 'category_name', 'cost_price', 'selling_price',
            'barcode', 'size', 'color', 'images', 'status',
            'stock_status', 'stock_quantity', 'profit_margin',
            'created_at'
        ]
    
    def get_stock_status(self, obj):
        if hasattr(obj, 'inventory'):
            return obj.inventory.stock_status
        return 'out_of_stock'
    
    def get_stock_quantity(self, obj):
        if hasattr(obj, 'inventory'):
            return obj.inventory.available_quantity
        return 0


class ProductDetailSerializer(serializers.ModelSerializer):
    """Product detail serializer (full details)."""
    
    brand = BrandSerializer(read_only=True)
    brand_id = serializers.UUIDField(write_only=True)
    category = CategorySerializer(read_only=True)
    category_id = serializers.UUIDField(write_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    stock_status = serializers.SerializerMethodField()
    stock_quantity = serializers.SerializerMethodField()
    profit_margin = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    profit_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 'sku', 'name', 'slug', 'brand', 'brand_id',
            'category', 'category_id', 'description', 'cost_price',
            'selling_price', 'barcode', 'barcode_image', 'size',
            'color', 'material', 'images', 'status', 'tags',
            'stock_status', 'stock_quantity', 'profit_margin',
            'profit_amount', 'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']
    
    def get_stock_status(self, obj):
        if hasattr(obj, 'inventory'):
            return obj.inventory.stock_status
        return 'out_of_stock'
    
    def get_stock_quantity(self, obj):
        if hasattr(obj, 'inventory'):
            return obj.inventory.available_quantity
        return 0
    
    def create(self, validated_data):
        brand_id = validated_data.pop('brand_id')
        category_id = validated_data.pop('category_id')
        validated_data['brand'] = Brand.objects.get(id=brand_id)
        validated_data['category'] = Category.objects.get(id=category_id)
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        if 'brand_id' in validated_data:
            validated_data['brand'] = Brand.objects.get(id=validated_data.pop('brand_id'))
        if 'category_id' in validated_data:
            validated_data['category'] = Category.objects.get(id=validated_data.pop('category_id'))
        return super().update(instance, validated_data)
