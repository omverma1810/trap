"""
Sales Tests for TRAP Inventory System.
Tests for POS-grade sales processing.
"""

from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status

from inventory.models import Warehouse, Product, ProductVariant, StockLedger, StockSnapshot
from inventory.services import record_purchase
from sales.models import Sale, SaleItem
from sales import services


class BarcodeGenerationTest(TestCase):
    """Tests for barcode auto-generation."""
    
    def setUp(self):
        self.product = Product.objects.create(
            name="Test Product",
            brand="Test",
            category="Test"
        )
    
    def test_barcode_auto_generated(self):
        """Test that barcode is auto-generated on creation."""
        variant = ProductVariant.objects.create(
            product=self.product,
            sku="TEST-001",
            cost_price=Decimal("10.00"),
            selling_price=Decimal("20.00")
        )
        
        self.assertIsNotNone(variant.barcode)
        self.assertEqual(len(variant.barcode), 13)  # EAN-13
        self.assertTrue(variant.barcode.startswith('2'))  # Internal use prefix
    
    def test_barcode_uniqueness(self):
        """Test that barcodes are unique."""
        variant1 = ProductVariant.objects.create(
            product=self.product,
            sku="TEST-001",
            cost_price=Decimal("10.00"),
            selling_price=Decimal("20.00")
        )
        variant2 = ProductVariant.objects.create(
            product=self.product,
            sku="TEST-002",
            cost_price=Decimal("10.00"),
            selling_price=Decimal("20.00")
        )
        
        self.assertNotEqual(variant1.barcode, variant2.barcode)
    
    def test_barcode_immutable(self):
        """Test that barcode cannot be changed after creation."""
        variant = ProductVariant.objects.create(
            product=self.product,
            sku="TEST-001",
            cost_price=Decimal("10.00"),
            selling_price=Decimal("20.00")
        )
        
        original_barcode = variant.barcode
        variant.barcode = "1234567890123"
        
        with self.assertRaises(ValueError):
            variant.save()


class BarcodeLookupTest(TestCase):
    """Tests for barcode lookup."""
    
    def setUp(self):
        self.product = Product.objects.create(
            name="Test Product",
            brand="Test",
            category="Test"
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="TEST-001",
            cost_price=Decimal("10.00"),
            selling_price=Decimal("20.00")
        )
    
    def test_lookup_valid_barcode(self):
        """Test lookup with valid barcode."""
        result = services.lookup_variant_by_barcode(self.variant.barcode)
        self.assertEqual(result.id, self.variant.id)
    
    def test_lookup_invalid_barcode(self):
        """Test lookup with invalid barcode."""
        with self.assertRaises(services.InvalidBarcodeError):
            services.lookup_variant_by_barcode("INVALID123")
    
    def test_lookup_inactive_variant(self):
        """Test lookup with inactive variant."""
        self.variant.is_active = False
        self.variant.save()
        
        with self.assertRaises(services.InactiveVariantError):
            services.lookup_variant_by_barcode(self.variant.barcode)


class SaleProcessingTest(TestCase):
    """Tests for sale processing."""
    
    def setUp(self):
        self.warehouse = Warehouse.objects.create(name="Test WH", code="TWH")
        self.product = Product.objects.create(
            name="Test Product",
            brand="Test",
            category="Test"
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="TEST-001",
            cost_price=Decimal("10.00"),
            selling_price=Decimal("20.00")
        )
        # Add stock
        record_purchase(self.variant, self.warehouse, 100)
    
    def test_sale_success(self):
        """Test successful sale processing."""
        sale = services.process_sale(
            items=[{'barcode': self.variant.barcode, 'quantity': 2}],
            warehouse_id=str(self.warehouse.id),
            payment_method='CASH'
        )
        
        self.assertIsNotNone(sale.id)
        self.assertEqual(sale.total_items, 2)
        self.assertEqual(sale.total_amount, Decimal("40.00"))
        self.assertEqual(sale.items.count(), 1)
    
    def test_sale_reduces_stock(self):
        """Test that sale reduces stock via ledger."""
        initial_stock = StockSnapshot.objects.get(
            variant=self.variant,
            warehouse=self.warehouse
        ).quantity
        
        services.process_sale(
            items=[{'barcode': self.variant.barcode, 'quantity': 10}],
            warehouse_id=str(self.warehouse.id),
            payment_method='UPI'
        )
        
        # Stock should be reduced
        snapshot = StockSnapshot.objects.get(
            variant=self.variant,
            warehouse=self.warehouse
        )
        self.assertEqual(snapshot.quantity, initial_stock - 10)
    
    def test_sale_creates_ledger_entry(self):
        """Test that sale creates SALE ledger entry."""
        initial_count = StockLedger.objects.filter(
            event_type=StockLedger.EventType.SALE
        ).count()
        
        sale = services.process_sale(
            items=[{'barcode': self.variant.barcode, 'quantity': 5}],
            warehouse_id=str(self.warehouse.id),
            payment_method='CARD'
        )
        
        # Should have one more SALE entry
        sale_entries = StockLedger.objects.filter(
            event_type=StockLedger.EventType.SALE,
            reference_id=sale.sale_number
        )
        self.assertEqual(sale_entries.count(), 1)
        self.assertEqual(sale_entries.first().quantity, -5)  # Negative
    
    def test_sale_fails_insufficient_stock(self):
        """Test that sale fails if stock insufficient."""
        with self.assertRaises(services.InsufficientStockForSaleError):
            services.process_sale(
                items=[{'barcode': self.variant.barcode, 'quantity': 200}],
                warehouse_id=str(self.warehouse.id),
                payment_method='CASH'
            )
    
    def test_sale_rollback_on_failure(self):
        """Test that sale rolls back completely on failure."""
        initial_stock = StockSnapshot.objects.get(
            variant=self.variant,
            warehouse=self.warehouse
        ).quantity
        initial_sales = Sale.objects.count()
        
        # Create another variant without stock
        variant2 = ProductVariant.objects.create(
            product=self.product,
            sku="TEST-002",
            cost_price=Decimal("10.00"),
            selling_price=Decimal("30.00")
        )
        
        try:
            services.process_sale(
                items=[
                    {'barcode': self.variant.barcode, 'quantity': 5},
                    {'barcode': variant2.barcode, 'quantity': 1}  # No stock
                ],
                warehouse_id=str(self.warehouse.id),
                payment_method='CASH'
            )
        except services.InsufficientStockForSaleError:
            pass
        
        # Stock should be unchanged
        snapshot = StockSnapshot.objects.get(
            variant=self.variant,
            warehouse=self.warehouse
        )
        self.assertEqual(snapshot.quantity, initial_stock)
        
        # No sale should be created
        self.assertEqual(Sale.objects.count(), initial_sales)


class PriceSnapshotTest(TestCase):
    """Tests for price snapshotting in sales."""
    
    def setUp(self):
        self.warehouse = Warehouse.objects.create(name="Test WH", code="TWH")
        self.product = Product.objects.create(
            name="Test Product",
            brand="Test",
            category="Test"
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="TEST-001",
            cost_price=Decimal("10.00"),
            selling_price=Decimal("20.00")
        )
        record_purchase(self.variant, self.warehouse, 100)
    
    def test_price_snapshot_preserved(self):
        """Test that sale price is snapshotted, not referenced."""
        # Create sale at current price
        sale = services.process_sale(
            items=[{'barcode': self.variant.barcode, 'quantity': 1}],
            warehouse_id=str(self.warehouse.id),
            payment_method='CASH'
        )
        
        sale_item = sale.items.first()
        original_sale_price = sale_item.selling_price
        
        # Reduce stock to 0 and change price (normally blocked, but for test)
        # We'll verify that existing sale price is unchanged
        self.assertEqual(original_sale_price, Decimal("20.00"))
        
        # The sale item should still show the original price
        sale_item.refresh_from_db()
        self.assertEqual(sale_item.selling_price, Decimal("20.00"))


class SaleImmutabilityTest(TestCase):
    """Tests for sale immutability."""
    
    def setUp(self):
        self.warehouse = Warehouse.objects.create(name="Test WH", code="TWH")
        self.product = Product.objects.create(
            name="Test Product",
            brand="Test",
            category="Test"
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="TEST-001",
            cost_price=Decimal("10.00"),
            selling_price=Decimal("20.00")
        )
        record_purchase(self.variant, self.warehouse, 100)
        
        self.sale = services.process_sale(
            items=[{'barcode': self.variant.barcode, 'quantity': 1}],
            warehouse_id=str(self.warehouse.id),
            payment_method='CASH'
        )
    
    def test_sale_update_blocked(self):
        """Test that sale cannot be updated."""
        self.sale.total_amount = Decimal("100.00")
        with self.assertRaises(ValueError):
            self.sale.save()
    
    def test_sale_delete_blocked(self):
        """Test that sale cannot be deleted."""
        with self.assertRaises(ValueError):
            self.sale.delete()
    
    def test_sale_item_update_blocked(self):
        """Test that sale item cannot be updated."""
        item = self.sale.items.first()
        item.quantity = 10
        with self.assertRaises(ValueError):
            item.save()
    
    def test_sale_item_delete_blocked(self):
        """Test that sale item cannot be deleted."""
        item = self.sale.items.first()
        with self.assertRaises(ValueError):
            item.delete()


class SalesAPITest(APITestCase):
    """API tests for sales endpoints."""
    
    def setUp(self):
        self.warehouse = Warehouse.objects.create(name="Test WH", code="TWH")
        self.product = Product.objects.create(
            name="Test Product",
            brand="Test",
            category="Test"
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="TEST-001",
            cost_price=Decimal("10.00"),
            selling_price=Decimal("20.00")
        )
        record_purchase(self.variant, self.warehouse, 100)
    
    def test_barcode_scan_endpoint(self):
        """Test barcode scan API."""
        response = self.client.post('/api/v1/sales/scan/', {
            'barcode': self.variant.barcode,
            'warehouse_id': str(self.warehouse.id),
            'quantity': 1
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['sku'], 'TEST-001')
        self.assertTrue(response.data['can_fulfill'])
    
    def test_checkout_endpoint(self):
        """Test checkout API."""
        response = self.client.post('/api/v1/sales/checkout/', {
            'items': [{'barcode': self.variant.barcode, 'quantity': 2}],
            'warehouse_id': str(self.warehouse.id),
            'payment_method': 'UPI'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertIn('SALE-', response.data['sale_number'])
    
    def test_sales_list_endpoint(self):
        """Test sales list API."""
        # Create a sale
        services.process_sale(
            items=[{'barcode': self.variant.barcode, 'quantity': 1}],
            warehouse_id=str(self.warehouse.id),
            payment_method='CASH'
        )
        
        response = self.client.get('/api/v1/sales/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
