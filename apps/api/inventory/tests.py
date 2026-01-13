"""
Inventory Tests for TRAP Inventory System.
Tests for ledger-based stock management.
"""

from decimal import Decimal
from django.test import TestCase
from django.db import transaction

from .models import Warehouse, Product, ProductVariant, StockLedger, StockSnapshot
from . import services


class WarehouseModelTest(TestCase):
    """Tests for Warehouse model."""
    
    def test_create_warehouse(self):
        warehouse = Warehouse.objects.create(
            name="Main Warehouse",
            code="WH001"
        )
        self.assertEqual(warehouse.name, "Main Warehouse")
        self.assertEqual(warehouse.code, "WH001")
        self.assertTrue(warehouse.is_active)
        self.assertIsNotNone(warehouse.id)


class ProductModelTest(TestCase):
    """Tests for Product and ProductVariant models."""
    
    def test_create_product_with_variant(self):
        product = Product.objects.create(
            name="Luxury T-Shirt",
            brand="TRAP",
            category="Apparel"
        )
        variant = ProductVariant.objects.create(
            product=product,
            sku="TRAP-TS-001-M-BLK",
            size="M",
            color="Black",
            cost_price=Decimal("25.00"),
            selling_price=Decimal("49.99")
        )
        
        self.assertEqual(product.variants.count(), 1)
        self.assertEqual(variant.product, product)
        self.assertEqual(variant.get_total_stock(), 0)


class StockLedgerTest(TestCase):
    """Tests for StockLedger immutability."""
    
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
    
    def test_ledger_entry_creation(self):
        """Test that ledger entries can be created."""
        entry = services.record_purchase(
            variant=self.variant,
            warehouse=self.warehouse,
            quantity=100,
            notes="Initial stock"
        )
        
        self.assertIsNotNone(entry.id)
        self.assertEqual(entry.quantity, 100)
        self.assertEqual(entry.event_type, StockLedger.EventType.PURCHASE)
    
    def test_ledger_entry_immutable(self):
        """Test that ledger entries cannot be modified."""
        entry = services.record_purchase(
            variant=self.variant,
            warehouse=self.warehouse,
            quantity=50
        )
        
        entry.quantity = 100
        with self.assertRaises(ValueError):
            entry.save()
    
    def test_ledger_entry_no_delete(self):
        """Test that ledger entries cannot be deleted."""
        entry = services.record_purchase(
            variant=self.variant,
            warehouse=self.warehouse,
            quantity=50
        )
        
        with self.assertRaises(ValueError):
            entry.delete()


class StockSnapshotTest(TestCase):
    """Tests for StockSnapshot accuracy."""
    
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
    
    def test_snapshot_accuracy_after_purchase(self):
        """Test that snapshot is accurate after purchase."""
        services.record_purchase(
            variant=self.variant,
            warehouse=self.warehouse,
            quantity=100
        )
        
        snapshot = StockSnapshot.objects.get(
            variant=self.variant,
            warehouse=self.warehouse
        )
        self.assertEqual(snapshot.quantity, 100)
    
    def test_snapshot_accuracy_after_multiple_operations(self):
        """Test snapshot accuracy after multiple operations."""
        # Purchase 100
        services.record_purchase(
            variant=self.variant,
            warehouse=self.warehouse,
            quantity=100
        )
        
        # Another purchase 50
        services.record_purchase(
            variant=self.variant,
            warehouse=self.warehouse,
            quantity=50
        )
        
        # Adjustment -30
        services.record_adjustment(
            variant=self.variant,
            warehouse=self.warehouse,
            quantity=-30,
            notes="Inventory correction for damaged goods"
        )
        
        snapshot = StockSnapshot.objects.get(
            variant=self.variant,
            warehouse=self.warehouse
        )
        # 100 + 50 - 30 = 120
        self.assertEqual(snapshot.quantity, 120)
    
    def test_snapshot_matches_ledger_sum(self):
        """Test that snapshot matches sum of ledger entries."""
        services.record_purchase(self.variant, self.warehouse, 100)
        services.record_purchase(self.variant, self.warehouse, 50)
        services.record_adjustment(
            self.variant, self.warehouse, -20,
            notes="Test adjustment for reconciliation"
        )
        
        # Get snapshot
        snapshot = StockSnapshot.objects.get(
            variant=self.variant,
            warehouse=self.warehouse
        )
        
        # Calculate from ledger
        from django.db.models import Sum
        ledger_total = StockLedger.objects.filter(
            variant=self.variant,
            warehouse=self.warehouse
        ).aggregate(total=Sum('quantity'))['total']
        
        self.assertEqual(snapshot.quantity, ledger_total)


class NegativeStockPreventionTest(TestCase):
    """Tests for negative stock prevention."""
    
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
    
    def test_prevent_negative_stock(self):
        """Test that negative stock is prevented by default."""
        # Start with 50 items
        services.record_purchase(self.variant, self.warehouse, 50)
        
        # Try to deduct 100 (more than available)
        with self.assertRaises(services.InsufficientStockError):
            services.record_adjustment(
                variant=self.variant,
                warehouse=self.warehouse,
                quantity=-100,
                notes="This should fail due to insufficient stock"
            )
    
    def test_allow_negative_when_permitted(self):
        """Test that negative stock is allowed when explicitly permitted."""
        services.record_purchase(self.variant, self.warehouse, 50)
        
        # Allow negative stock
        entry = services.record_adjustment(
            variant=self.variant,
            warehouse=self.warehouse,
            quantity=-100,
            notes="Allowing negative for correction purposes",
            allow_negative=True
        )
        
        snapshot = StockSnapshot.objects.get(
            variant=self.variant,
            warehouse=self.warehouse
        )
        self.assertEqual(snapshot.quantity, -50)


class AtomicTransactionTest(TestCase):
    """Tests for atomic transaction behavior."""
    
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
    
    def test_transaction_rollback_on_failure(self):
        """Test that failed operations don't create partial entries."""
        services.record_purchase(self.variant, self.warehouse, 50)
        
        initial_ledger_count = StockLedger.objects.count()
        
        try:
            services.record_adjustment(
                variant=self.variant,
                warehouse=self.warehouse,
                quantity=-100,
                notes="This should fail and rollback"
            )
        except services.InsufficientStockError:
            pass
        
        # Verify no new ledger entry was created
        self.assertEqual(StockLedger.objects.count(), initial_ledger_count)


class StockSummaryTest(TestCase):
    """Tests for stock summary functionality."""
    
    def setUp(self):
        self.warehouse = Warehouse.objects.create(name="Test WH", code="TWH")
        self.product = Product.objects.create(
            name="Test Product",
            brand="Test",
            category="Test"
        )
    
    def test_stock_summary(self):
        """Test stock summary calculation."""
        # Create variants with different stock levels
        variant1 = ProductVariant.objects.create(
            product=self.product,
            sku="TEST-001",
            cost_price=Decimal("10.00"),
            selling_price=Decimal("20.00"),
            reorder_threshold=20
        )
        variant2 = ProductVariant.objects.create(
            product=self.product,
            sku="TEST-002",
            cost_price=Decimal("10.00"),
            selling_price=Decimal("20.00"),
            reorder_threshold=10
        )
        
        # Add stock
        services.record_purchase(variant1, self.warehouse, 100)  # Above threshold
        services.record_purchase(variant2, self.warehouse, 5)    # Below threshold
        
        summary = services.get_stock_summary()
        
        self.assertEqual(summary['total_stock'], 105)
        self.assertEqual(summary['total_variants'], 2)
        self.assertEqual(len(summary['low_stock_items']), 1)
        self.assertEqual(summary['low_stock_items'][0]['sku'], 'TEST-002')
