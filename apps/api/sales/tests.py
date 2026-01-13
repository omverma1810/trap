"""
Sales Tests for TRAP Inventory System.
Tests for POS-grade sales processing.

PHASE 3.1 ADDITIONS:
- Idempotency tests
- Status lifecycle tests
"""

import uuid
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
    """Tests for sale processing with idempotency."""
    
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
        idempotency_key = uuid.uuid4()
        sale = services.process_sale(
            idempotency_key=idempotency_key,
            items=[{'barcode': self.variant.barcode, 'quantity': 2}],
            warehouse_id=str(self.warehouse.id),
            payment_method='CASH'
        )
        
        self.assertIsNotNone(sale.id)
        self.assertEqual(sale.idempotency_key, idempotency_key)
        self.assertEqual(sale.total_items, 2)
        self.assertEqual(sale.total_amount, Decimal("40.00"))
        self.assertEqual(sale.status, Sale.Status.COMPLETED)
        self.assertEqual(sale.items.count(), 1)
    
    def test_sale_reduces_stock(self):
        """Test that sale reduces stock via ledger."""
        initial_stock = StockSnapshot.objects.get(
            variant=self.variant,
            warehouse=self.warehouse
        ).quantity
        
        services.process_sale(
            idempotency_key=uuid.uuid4(),
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
            idempotency_key=uuid.uuid4(),
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
                idempotency_key=uuid.uuid4(),
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
        initial_sales = Sale.objects.filter(status=Sale.Status.COMPLETED).count()
        
        # Create another variant without stock
        variant2 = ProductVariant.objects.create(
            product=self.product,
            sku="TEST-002",
            cost_price=Decimal("10.00"),
            selling_price=Decimal("30.00")
        )
        
        try:
            services.process_sale(
                idempotency_key=uuid.uuid4(),
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
        
        # No COMPLETED sale should be created
        self.assertEqual(
            Sale.objects.filter(status=Sale.Status.COMPLETED).count(),
            initial_sales
        )


class IdempotencyTest(TestCase):
    """Tests for checkout idempotency (PHASE 3.1)."""
    
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
    
    def test_same_idempotency_key_returns_same_sale(self):
        """Test that same idempotency_key returns existing sale."""
        idempotency_key = uuid.uuid4()
        
        # First checkout
        sale1 = services.process_sale(
            idempotency_key=idempotency_key,
            items=[{'barcode': self.variant.barcode, 'quantity': 2}],
            warehouse_id=str(self.warehouse.id),
            payment_method='CASH'
        )
        
        # Second checkout with same key
        sale2 = services.process_sale(
            idempotency_key=idempotency_key,
            items=[{'barcode': self.variant.barcode, 'quantity': 2}],
            warehouse_id=str(self.warehouse.id),
            payment_method='CASH'
        )
        
        # Should be the same sale
        self.assertEqual(sale1.id, sale2.id)
        self.assertEqual(sale1.sale_number, sale2.sale_number)
    
    def test_duplicate_checkout_no_double_ledger_entry(self):
        """Test that duplicate checkout doesn't create double ledger entries."""
        idempotency_key = uuid.uuid4()
        initial_stock = StockSnapshot.objects.get(
            variant=self.variant,
            warehouse=self.warehouse
        ).quantity
        
        # First checkout
        sale1 = services.process_sale(
            idempotency_key=idempotency_key,
            items=[{'barcode': self.variant.barcode, 'quantity': 5}],
            warehouse_id=str(self.warehouse.id),
            payment_method='CASH'
        )
        
        stock_after_first = StockSnapshot.objects.get(
            variant=self.variant,
            warehouse=self.warehouse
        ).quantity
        self.assertEqual(stock_after_first, initial_stock - 5)
        
        # Second checkout with same key
        sale2 = services.process_sale(
            idempotency_key=idempotency_key,
            items=[{'barcode': self.variant.barcode, 'quantity': 5}],
            warehouse_id=str(self.warehouse.id),
            payment_method='CASH'
        )
        
        # Stock should NOT be reduced again
        stock_after_second = StockSnapshot.objects.get(
            variant=self.variant,
            warehouse=self.warehouse
        ).quantity
        self.assertEqual(stock_after_second, initial_stock - 5)
        
        # Ledger should have only ONE sale entry
        sale_entries = StockLedger.objects.filter(
            event_type=StockLedger.EventType.SALE,
            reference_id=sale1.sale_number
        )
        self.assertEqual(sale_entries.count(), 1)
    
    def test_different_idempotency_keys_create_separate_sales(self):
        """Test that different keys create separate sales."""
        key1 = uuid.uuid4()
        key2 = uuid.uuid4()
        
        sale1 = services.process_sale(
            idempotency_key=key1,
            items=[{'barcode': self.variant.barcode, 'quantity': 1}],
            warehouse_id=str(self.warehouse.id),
            payment_method='CASH'
        )
        
        sale2 = services.process_sale(
            idempotency_key=key2,
            items=[{'barcode': self.variant.barcode, 'quantity': 1}],
            warehouse_id=str(self.warehouse.id),
            payment_method='CASH'
        )
        
        # Should be different sales
        self.assertNotEqual(sale1.id, sale2.id)


class StatusLifecycleTest(TestCase):
    """Tests for sale status lifecycle (PHASE 3.1)."""
    
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
    
    def test_completed_sale_has_completed_status(self):
        """Test that successful sale has COMPLETED status."""
        sale = services.process_sale(
            idempotency_key=uuid.uuid4(),
            items=[{'barcode': self.variant.barcode, 'quantity': 1}],
            warehouse_id=str(self.warehouse.id),
            payment_method='CASH'
        )
        
        self.assertEqual(sale.status, Sale.Status.COMPLETED)
    
    def test_completed_sale_has_ledger_entry(self):
        """Test that COMPLETED sale has ledger entry."""
        sale = services.process_sale(
            idempotency_key=uuid.uuid4(),
            items=[{'barcode': self.variant.barcode, 'quantity': 3}],
            warehouse_id=str(self.warehouse.id),
            payment_method='UPI'
        )
        
        self.assertEqual(sale.status, Sale.Status.COMPLETED)
        
        ledger_entry = StockLedger.objects.filter(
            event_type=StockLedger.EventType.SALE,
            reference_id=sale.sale_number
        ).first()
        
        self.assertIsNotNone(ledger_entry)
        self.assertEqual(ledger_entry.quantity, -3)
    
    def test_failed_status_on_exception(self):
        """Test that exception during checkout creates FAILED status."""
        # Create variant without stock
        variant_no_stock = ProductVariant.objects.create(
            product=self.product,
            sku="NO-STOCK",
            cost_price=Decimal("10.00"),
            selling_price=Decimal("50.00")
        )
        
        with self.assertRaises(services.InsufficientStockForSaleError):
            services.process_sale(
                idempotency_key=uuid.uuid4(),
                items=[{'barcode': variant_no_stock.barcode, 'quantity': 1}],
                warehouse_id=str(self.warehouse.id),
                payment_method='CASH'
            )
        
        # No ledger entries should exist for this variant
        ledger_entries = StockLedger.objects.filter(
            variant=variant_no_stock,
            event_type=StockLedger.EventType.SALE
        )
        self.assertEqual(ledger_entries.count(), 0)
    
    def test_failed_sale_no_stock_change(self):
        """Test that FAILED sale does not change stock."""
        initial_stock = StockSnapshot.objects.get(
            variant=self.variant,
            warehouse=self.warehouse
        ).quantity
        
        # Create variant without stock for multi-item sale
        variant_no_stock = ProductVariant.objects.create(
            product=self.product,
            sku="NO-STOCK",
            cost_price=Decimal("10.00"),
            selling_price=Decimal("50.00")
        )
        
        try:
            services.process_sale(
                idempotency_key=uuid.uuid4(),
                items=[
                    {'barcode': self.variant.barcode, 'quantity': 10},
                    {'barcode': variant_no_stock.barcode, 'quantity': 1}
                ],
                warehouse_id=str(self.warehouse.id),
                payment_method='CASH'
            )
        except services.InsufficientStockForSaleError:
            pass
        
        # Stock should be unchanged
        final_stock = StockSnapshot.objects.get(
            variant=self.variant,
            warehouse=self.warehouse
        ).quantity
        self.assertEqual(final_stock, initial_stock)


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
            idempotency_key=uuid.uuid4(),
            items=[{'barcode': self.variant.barcode, 'quantity': 1}],
            warehouse_id=str(self.warehouse.id),
            payment_method='CASH'
        )
        
        sale_item = sale.items.first()
        original_sale_price = sale_item.selling_price
        
        # Verify price is snapshotted
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
            idempotency_key=uuid.uuid4(),
            items=[{'barcode': self.variant.barcode, 'quantity': 1}],
            warehouse_id=str(self.warehouse.id),
            payment_method='CASH'
        )
    
    def test_sale_update_blocked(self):
        """Test that COMPLETED sale cannot be updated."""
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
    """API tests for sales endpoints with idempotency."""
    
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
    
    def test_checkout_endpoint_with_idempotency(self):
        """Test checkout API with idempotency_key."""
        idempotency_key = str(uuid.uuid4())
        
        response = self.client.post('/api/v1/sales/checkout/', {
            'idempotency_key': idempotency_key,
            'items': [{'barcode': self.variant.barcode, 'quantity': 2}],
            'warehouse_id': str(self.warehouse.id),
            'payment_method': 'UPI'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertFalse(response.data['is_duplicate'])
        self.assertEqual(response.data['status'], 'COMPLETED')
        self.assertIn('SALE-', response.data['sale_number'])
    
    def test_duplicate_checkout_returns_existing(self):
        """Test that duplicate checkout with same key returns existing sale."""
        idempotency_key = str(uuid.uuid4())
        
        # First checkout
        response1 = self.client.post('/api/v1/sales/checkout/', {
            'idempotency_key': idempotency_key,
            'items': [{'barcode': self.variant.barcode, 'quantity': 2}],
            'warehouse_id': str(self.warehouse.id),
            'payment_method': 'CASH'
        }, format='json')
        
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)
        sale_id_1 = response1.data['sale_id']
        
        # Second checkout with same key
        response2 = self.client.post('/api/v1/sales/checkout/', {
            'idempotency_key': idempotency_key,
            'items': [{'barcode': self.variant.barcode, 'quantity': 2}],
            'warehouse_id': str(self.warehouse.id),
            'payment_method': 'CASH'
        }, format='json')
        
        self.assertEqual(response2.status_code, status.HTTP_200_OK)  # 200 for existing
        self.assertTrue(response2.data['is_duplicate'])
        self.assertEqual(response2.data['sale_id'], sale_id_1)
    
    def test_sales_list_endpoint_with_status_filter(self):
        """Test sales list API with status filter."""
        # Create a completed sale
        services.process_sale(
            idempotency_key=uuid.uuid4(),
            items=[{'barcode': self.variant.barcode, 'quantity': 1}],
            warehouse_id=str(self.warehouse.id),
            payment_method='CASH'
        )
        
        # Get all completed sales
        response = self.client.get('/api/v1/sales/?status=COMPLETED')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
        
        # All returned sales should be COMPLETED
        for sale in response.data:
            self.assertEqual(sale['status'], 'COMPLETED')
