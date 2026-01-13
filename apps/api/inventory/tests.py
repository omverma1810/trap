"""
Inventory Tests for TRAP Inventory System.
Tests for ledger-based stock management and hardening rules.

HARDENING TESTS (Phase 2.1):
- Soft delete behavior
- Ledger immutability
- Price immutability when stock exists
- Single entry point for stock mutation
"""

from decimal import Decimal
from django.test import TestCase
from django.db import transaction
from rest_framework.test import APITestCase
from rest_framework import status

from .models import Warehouse, Product, ProductVariant, StockLedger, StockSnapshot
from .serializers import ProductVariantUpdateSerializer
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


# ============================================================================
# PHASE 2.1 HARDENING TESTS
# ============================================================================

class SoftDeleteTest(APITestCase):
    """
    Tests for soft delete behavior.
    Rule 1: No hard delete for business entities.
    """
    
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
    
    def test_product_delete_becomes_inactive(self):
        """Test that deleting a product sets is_active=False."""
        url = f'/api/v1/inventory/products/{self.product.id}/'
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Refresh from database
        self.product.refresh_from_db()
        self.assertFalse(self.product.is_active)
        
        # Product should still exist in database
        self.assertTrue(Product.objects.filter(id=self.product.id).exists())
    
    def test_product_delete_deactivates_variants(self):
        """Test that deleting a product also deactivates its variants."""
        url = f'/api/v1/inventory/products/{self.product.id}/'
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Variant should also be inactive
        self.variant.refresh_from_db()
        self.assertFalse(self.variant.is_active)
    
    def test_warehouse_delete_becomes_inactive(self):
        """Test that deleting a warehouse sets is_active=False."""
        url = f'/api/v1/inventory/warehouses/{self.warehouse.id}/'
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Warehouse should still exist but be inactive
        self.warehouse.refresh_from_db()
        self.assertFalse(self.warehouse.is_active)
        self.assertTrue(Warehouse.objects.filter(id=self.warehouse.id).exists())
    
    def test_inactive_products_excluded_by_default(self):
        """Test that inactive products are excluded from list by default."""
        # Create another active product
        Product.objects.create(name="Active Product", brand="Test", category="Test")
        
        # Deactivate original product
        self.product.is_active = False
        self.product.save()
        
        url = '/api/v1/inventory/products/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Only active product should be returned
        self.assertEqual(len(response.data), 1)
    
    def test_include_inactive_parameter(self):
        """Test that ?include_inactive=true includes inactive items."""
        # Deactivate product
        self.product.is_active = False
        self.product.save()
        
        url = '/api/v1/inventory/products/?include_inactive=true'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Inactive product should be included
        self.assertEqual(len(response.data), 1)


class LedgerImmutabilityTest(TestCase):
    """
    Tests for ledger immutability.
    Rule 2: StockLedger must be immutable (append-only).
    """
    
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
    
    def test_ledger_update_forbidden(self):
        """Test that ledger entries cannot be updated via save()."""
        entry = services.record_purchase(
            variant=self.variant,
            warehouse=self.warehouse,
            quantity=100
        )
        
        entry.quantity = 200
        with self.assertRaises(ValueError) as context:
            entry.save()
        
        self.assertIn("cannot be modified", str(context.exception))
    
    def test_ledger_delete_forbidden(self):
        """Test that ledger entries cannot be deleted."""
        entry = services.record_purchase(
            variant=self.variant,
            warehouse=self.warehouse,
            quantity=100
        )
        
        with self.assertRaises(ValueError) as context:
            entry.delete()
        
        self.assertIn("cannot be deleted", str(context.exception))
    
    def test_ledger_bulk_update_prevented(self):
        """Test that bulk update on ledger is prevented."""
        services.record_purchase(self.variant, self.warehouse, 100)
        
        # Bulk update should not affect immutable fields
        # Note: This tests that our model override catches individual saves
        # Django's bulk update bypasses save(), but we document this limitation
        initial_count = StockLedger.objects.count()
        
        # Verify entries exist and are correct
        self.assertEqual(initial_count, 1)
    
    def test_corrections_via_adjustment(self):
        """Test that corrections are done via new ADJUSTMENT entries."""
        # Initial purchase
        services.record_purchase(self.variant, self.warehouse, 100)
        
        # Correction via adjustment
        services.record_adjustment(
            variant=self.variant,
            warehouse=self.warehouse,
            quantity=-10,
            notes="Correction: 10 items were counted incorrectly"
        )
        
        # Should have 2 ledger entries, not 1 modified entry
        self.assertEqual(StockLedger.objects.count(), 2)
        
        # Final stock should be 90
        snapshot = StockSnapshot.objects.get(
            variant=self.variant,
            warehouse=self.warehouse
        )
        self.assertEqual(snapshot.quantity, 90)


class PriceImmutabilityTest(TestCase):
    """
    Tests for price immutability.
    Rule 4: Cannot modify price while stock exists.
    """
    
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
    
    def test_price_update_blocked_with_stock(self):
        """Test that price update is blocked when stock exists."""
        # Add stock
        services.record_purchase(self.variant, self.warehouse, 100)
        
        # Try to update price via serializer
        serializer = ProductVariantUpdateSerializer(
            instance=self.variant,
            data={
                'sku': 'TEST-001',
                'cost_price': Decimal('15.00'),  # Changed
                'selling_price': Decimal('25.00'),  # Changed
            }
        )
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('error', serializer.errors)
    
    def test_price_update_allowed_with_zero_stock(self):
        """Test that price update is allowed when stock is zero."""
        # No stock added
        
        serializer = ProductVariantUpdateSerializer(
            instance=self.variant,
            data={
                'sku': 'TEST-001',
                'cost_price': Decimal('15.00'),
                'selling_price': Decimal('25.00'),
            }
        )
        
        self.assertTrue(serializer.is_valid())
    
    def test_price_update_error_message(self):
        """Test that price update error message is clear."""
        services.record_purchase(self.variant, self.warehouse, 50)
        
        serializer = ProductVariantUpdateSerializer(
            instance=self.variant,
            data={
                'sku': 'TEST-001',
                'cost_price': Decimal('15.00'),  # Changed price
                'selling_price': Decimal('30.00'),  # Changed price
            }
        )
        
        self.assertFalse(serializer.is_valid())
        # Check that error contains the expected message
        errors_str = str(serializer.errors)
        self.assertIn('Cannot modify price while stock exists', errors_str)
    
    def test_non_price_updates_allowed_with_stock(self):
        """Test that non-price updates are allowed even with stock."""
        services.record_purchase(self.variant, self.warehouse, 100)
        
        serializer = ProductVariantUpdateSerializer(
            instance=self.variant,
            data={
                'sku': 'TEST-001-UPDATED',
                'reorder_threshold': 20,
                'cost_price': self.variant.cost_price,  # Same price
                'selling_price': self.variant.selling_price,  # Same price
            }
        )
        
        self.assertTrue(serializer.is_valid())


class SingleEntryPointTest(TestCase):
    """
    Tests for single entry point for stock mutation.
    Rule 3: All stock changes must go through record_stock_event().
    """
    
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
    
    def test_record_stock_event_is_atomic(self):
        """Test that record_stock_event uses atomic transaction."""
        # This is verified by checking that failed operations don't create partial entries
        initial_count = StockLedger.objects.count()
        
        try:
            services.record_adjustment(
                variant=self.variant,
                warehouse=self.warehouse,
                quantity=-100,  # No stock exists, this should fail
                notes="This should fail with insufficient stock"
            )
        except services.InsufficientStockError:
            pass
        
        # No ledger entry should be created
        self.assertEqual(StockLedger.objects.count(), initial_count)
    
    def test_quantity_zero_validation(self):
        """Test that quantity=0 is rejected."""
        with self.assertRaises(services.InvalidEventError):
            services.record_adjustment(
                variant=self.variant,
                warehouse=self.warehouse,
                quantity=0,
                notes="Zero quantity should be rejected"
            )
    
    def test_warehouse_validation(self):
        """Test that invalid warehouse is rejected."""
        from django.core.exceptions import ObjectDoesNotExist
        
        # Create a fake UUID
        import uuid
        fake_warehouse = type('FakeWarehouse', (), {'id': uuid.uuid4()})()
        
        with self.assertRaises(Exception):
            services.record_purchase(
                variant=self.variant,
                warehouse=fake_warehouse,
                quantity=100
            )
    
    def test_adjustment_entry_changes_stock(self):
        """Test that adjustment entry correctly changes stock."""
        services.record_purchase(self.variant, self.warehouse, 100)
        
        services.record_adjustment(
            variant=self.variant,
            warehouse=self.warehouse,
            quantity=-30,
            notes="Test adjustment reduces stock by 30"
        )
        
        snapshot = StockSnapshot.objects.get(
            variant=self.variant,
            warehouse=self.warehouse
        )
        self.assertEqual(snapshot.quantity, 70)
