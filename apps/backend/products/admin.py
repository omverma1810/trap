"""
Products app admin configuration.
"""

from django.contrib import admin
from .models import Brand, Category, Product


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'parent', 'slug', 'is_active', 'created_at']
    list_filter = ['is_active', 'parent']
    search_fields = ['name']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['sku', 'name', 'brand', 'category', 'selling_price', 'status', 'created_at']
    list_filter = ['status', 'brand', 'category']
    search_fields = ['name', 'sku', 'barcode']
    prepopulated_fields = {'slug': ('name',)}
    raw_id_fields = ['brand', 'category', 'created_by']
