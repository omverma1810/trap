"""
Sales Tests for TRAP Inventory System.

PHASE 13: POS ENGINE (LEDGER-BACKED)
=====================================

Required tests:
- SaleSuccessTest: Happy path with valid stock, payments
- InsufficientStockTest: Sale rejected when stock < quantity
- AtomicityTest: Partial failure rolls back everything
- LedgerReductionTest: Verify inventory movements created
- PaymentMismatchTest: Reject when payments ≠ total
- BarcodeResolutionTest: Barcode → Product lookup
- InvoiceSequenceTest: Sequential invoice numbers
- DiscountValidationTest: Discount rules enforced
"""

import uuid
from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status

from inventory.models import Warehouse, Product, ProductVariant, InventoryMovement
from inventory import services as inventory_services
from .models import Sale, SaleItem, Payment, InvoiceSequence
from . import services


# =============================================================================
# PHASE 13: BARCODE RESOLUTION TESTS
# =============================================================================

class BarcodeResolutionTest(TestCase):
    """
    Test: Barcode → Product lookup.
    Phase 13: Products are resolved by barcode.
    """
    
    def setUp(self):
        self.product = Product.objects.create(
            name="Test Product",
            brand="TEST",
            category="TEST",
            sku="TEST-001",
            barcode_value="TRAP-TEST-001"
        )
        self.warehouse = Warehouse.objects.create(
            name="Test WH",
            code="TST-WH"
        )
    
    def test_lookup_valid_barcode(self):
        """Test that valid barcode returns product."""
        product = services.lookup_product_by_barcode("TRAP-TEST-001")
        self.assertEqual(product.id, self.product.id)
    
    def test_lookup_invalid_barcode(self):
        """Test that invalid barcode raises error."""
        with self.assertRaises(services.InvalidBarcodeError):
            services.lookup_product_by_barcode("INVALID-BARCODE")
    
    def test_scan_barcode_returns_info(self):
        """Test that scan_barcode returns complete product info."""
        result = services.scan_barcode(
            barcode="TRAP-TEST-001",
            warehouse_id=self.warehouse.id
        )
        
        self.assertEqual(result['product_id'], str(self.product.id))
        self.assertEqual(result['barcode'], "TRAP-TEST-001")
        self.assertEqual(result['sku'], "TEST-001")
        self.assertEqual(result['warehouse_id'], str(self.warehouse.id))


# =============================================================================
# PHASE 13: INVOICE SEQUENCE TESTS
# =============================================================================

class InvoiceSequenceTest(TestCase):
    """
    Test: Sequential invoice numbers.
    Phase 13: Invoice numbers must be sequential and concurrency-safe.
    """
    
    def test_first_invoice_number(self):
        """Test that first invoice is INV-YYYY-000001."""
        invoice = InvoiceSequence.get_next_invoice_number()
        self.assertTrue(invoice.startswith("INV-"))
        self.assertTrue(invoice.endswith("-000001"))
    
    def test_sequential_invoice_numbers(self):
        """Test that invoice numbers are sequential."""
        inv1 = InvoiceSequence.get_next_invoice_number()
        inv2 = InvoiceSequence.get_next_invoice_number()
        inv3 = InvoiceSequence.get_next_invoice_number()
        
        # Extract numbers
        num1 = int(inv1.split("-")[-1])
        num2 = int(inv2.split("-")[-1])
        num3 = int(inv3.split("-")[-1])
        
        self.assertEqual(num2, num1 + 1)
        self.assertEqual(num3, num2 + 1)


# =============================================================================
# PHASE 13: SALE SUCCESS TESTS
# =============================================================================

class SaleSuccessTest(APITestCase):
    """
    Test: Happy path with valid stock, payments.
    Phase 13: Sale should complete successfully with all requirements met.
    """
    
    def setUp(self):
        from users.models import User
        self.admin = User.objects.create_user(
            username='admin', password='adminpass', role='ADMIN'
        )
        self.warehouse = Warehouse.objects.create(
            name="Test WH",
            code="TST-WH"
        )
        self.product = Product.objects.create(
            name="Test Product",
            brand="TEST",
            category="TEST",
            sku="TEST-001",
            barcode_value="TRAP-TEST-001"
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="TEST-001-V1",
            cost_price=Decimal("50.00"),
            selling_price=Decimal("100.00")
        )
        
        # Add opening stock
        inventory_services.create_inventory_movement(
            product_id=self.product.id,
            movement_type='OPENING',
            quantity=100,
            user=self.admin,
            warehouse_id=self.warehouse.id
        )
    
    def test_sale_creates_successfully(self):
        """Test that sale is created with valid inputs."""
        sale = services.process_sale(
            idempotency_key=uuid.uuid4(),
            warehouse_id=self.warehouse.id,
            items=[{'barcode': 'TRAP-TEST-001', 'quantity': 2}],
            payments=[{'method': 'CASH', 'amount': Decimal('200.00')}],
            user=self.admin
        )
        
        self.assertEqual(sale.status, Sale.Status.COMPLETED)
        self.assertEqual(sale.total, Decimal('200.00'))
        self.assertEqual(sale.total_items, 2)
        self.assertEqual(sale.items.count(), 1)
        self.assertEqual(sale.payments.count(), 1)
    
    def test_sale_reduces_stock(self):
        """Test that sale reduces available stock."""
        initial_stock = inventory_services.get_product_stock(
            self.product.id, warehouse_id=self.warehouse.id
        )
        
        services.process_sale(
            idempotency_key=uuid.uuid4(),
            warehouse_id=self.warehouse.id,
            items=[{'barcode': 'TRAP-TEST-001', 'quantity': 10}],
            payments=[{'method': 'UPI', 'amount': Decimal('1000.00')}],
            user=self.admin
        )
        
        final_stock = inventory_services.get_product_stock(
            self.product.id, warehouse_id=self.warehouse.id
        )
        
        self.assertEqual(final_stock, initial_stock - 10)
    
    def test_sale_with_discount(self):
        """Test sale with percentage discount."""
        sale = services.process_sale(
            idempotency_key=uuid.uuid4(),
            warehouse_id=self.warehouse.id,
            items=[{'barcode': 'TRAP-TEST-001', 'quantity': 2}],
            payments=[{'method': 'CARD', 'amount': Decimal('180.00')}],
            user=self.admin,
            discount_type='PERCENT',
            discount_value=Decimal('10.00')  # 10% off
        )
        
        self.assertEqual(sale.subtotal, Decimal('200.00'))
        self.assertEqual(sale.discount_value, Decimal('10.00'))
        self.assertEqual(sale.total, Decimal('180.00'))  # 200 - 20 = 180
    
    def test_sale_with_multi_payment(self):
        """Test sale with multiple payment methods."""
        sale = services.process_sale(
            idempotency_key=uuid.uuid4(),
            warehouse_id=self.warehouse.id,
            items=[{'barcode': 'TRAP-TEST-001', 'quantity': 3}],
            payments=[
                {'method': 'CASH', 'amount': Decimal('200.00')},
                {'method': 'UPI', 'amount': Decimal('100.00')}
            ],
            user=self.admin
        )
        
        self.assertEqual(sale.payments.count(), 2)
        self.assertEqual(sale.total, Decimal('300.00'))


# =============================================================================
# PHASE 13: INSUFFICIENT STOCK TESTS
# =============================================================================

class InsufficientStockTest(TestCase):
    """
    Test: Sale rejected when stock < quantity.
    Phase 13: Overselling must be impossible.
    """
    
    def setUp(self):
        from users.models import User
        self.admin = User.objects.create_user(
            username='admin', password='adminpass', role='ADMIN'
        )
        self.warehouse = Warehouse.objects.create(
            name="Test WH",
            code="TST-WH"
        )
        self.product = Product.objects.create(
            name="Limited Stock Product",
            brand="TEST",
            category="TEST",
            sku="LIMITED-001",
            barcode_value="TRAP-LIMITED-001"
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="LIMITED-001-V1",
            cost_price=Decimal("50.00"),
            selling_price=Decimal("100.00")
        )
        
        # Add limited stock
        inventory_services.create_inventory_movement(
            product_id=self.product.id,
            movement_type='OPENING',
            quantity=5,  # Only 5 in stock
            user=self.admin,
            warehouse_id=self.warehouse.id
        )
    
    def test_oversale_rejected(self):
        """Test that sale is rejected when requested > available."""
        with self.assertRaises(services.InsufficientStockError):
            services.process_sale(
                idempotency_key=uuid.uuid4(),
                warehouse_id=self.warehouse.id,
                items=[{'barcode': 'TRAP-LIMITED-001', 'quantity': 10}],  # Only 5 available
                payments=[{'method': 'CASH', 'amount': Decimal('1000.00')}],
                user=self.admin
            )
    
    def test_stock_unchanged_on_rejection(self):
        """Test that stock remains unchanged when sale is rejected."""
        initial_stock = inventory_services.get_product_stock(
            self.product.id, warehouse_id=self.warehouse.id
        )
        
        try:
            services.process_sale(
                idempotency_key=uuid.uuid4(),
                warehouse_id=self.warehouse.id,
                items=[{'barcode': 'TRAP-LIMITED-001', 'quantity': 10}],
                payments=[{'method': 'CASH', 'amount': Decimal('1000.00')}],
                user=self.admin
            )
        except services.InsufficientStockError:
            pass
        
        final_stock = inventory_services.get_product_stock(
            self.product.id, warehouse_id=self.warehouse.id
        )
        
        self.assertEqual(final_stock, initial_stock)


# =============================================================================
# PHASE 13: ATOMICITY TESTS
# =============================================================================

class AtomicityTest(TestCase):
    """
    Test: Partial failure rolls back everything.
    Phase 13: Sale must be atomic - all or nothing.
    """
    
    def setUp(self):
        from users.models import User
        self.admin = User.objects.create_user(
            username='admin', password='adminpass', role='ADMIN'
        )
        self.warehouse = Warehouse.objects.create(
            name="Test WH",
            code="TST-WH"
        )
        self.product1 = Product.objects.create(
            name="Product 1",
            brand="TEST",
            category="TEST",
            sku="PROD-001",
            barcode_value="TRAP-PROD-001"
        )
        ProductVariant.objects.create(
            product=self.product1,
            sku="PROD-001-V1",
            cost_price=Decimal("50.00"),
            selling_price=Decimal("100.00")
        )
        self.product2 = Product.objects.create(
            name="Product 2 (Limited)",
            brand="TEST",
            category="TEST",
            sku="PROD-002",
            barcode_value="TRAP-PROD-002"
        )
        ProductVariant.objects.create(
            product=self.product2,
            sku="PROD-002-V1",
            cost_price=Decimal("50.00"),
            selling_price=Decimal("100.00")
        )
        
        # Product 1 has plenty of stock
        inventory_services.create_inventory_movement(
            product_id=self.product1.id,
            movement_type='OPENING',
            quantity=100,
            user=self.admin,
            warehouse_id=self.warehouse.id
        )
        
        # Product 2 has limited stock
        inventory_services.create_inventory_movement(
            product_id=self.product2.id,
            movement_type='OPENING',
            quantity=2,
            user=self.admin,
            warehouse_id=self.warehouse.id
        )
    
    def test_multi_item_failure_rolls_back_all(self):
        """Test that failure on second item rolls back first item too."""
        initial_stock1 = inventory_services.get_product_stock(
            self.product1.id, warehouse_id=self.warehouse.id
        )
        initial_sale_count = Sale.objects.count()
        
        try:
            services.process_sale(
                idempotency_key=uuid.uuid4(),
                warehouse_id=self.warehouse.id,
                items=[
                    {'barcode': 'TRAP-PROD-001', 'quantity': 5},  # Would succeed
                    {'barcode': 'TRAP-PROD-002', 'quantity': 10},  # Will fail - only 2 in stock
                ],
                payments=[{'method': 'CASH', 'amount': Decimal('1500.00')}],
                user=self.admin
            )
        except services.InsufficientStockError:
            pass
        
        # Stock for product 1 should be unchanged (rolled back)
        final_stock1 = inventory_services.get_product_stock(
            self.product1.id, warehouse_id=self.warehouse.id
        )
        self.assertEqual(final_stock1, initial_stock1)
        
        # No sale should have been created
        self.assertEqual(Sale.objects.count(), initial_sale_count)


# =============================================================================
# PHASE 13: LEDGER REDUCTION TESTS
# =============================================================================

class LedgerReductionTest(TestCase):
    """
    Test: Verify inventory movements created.
    Phase 13: Stock is derived from ledger, not mutated directly.
    """
    
    def setUp(self):
        from users.models import User
        self.admin = User.objects.create_user(
            username='admin', password='adminpass', role='ADMIN'
        )
        self.warehouse = Warehouse.objects.create(
            name="Test WH",
            code="TST-WH"
        )
        self.product = Product.objects.create(
            name="Ledger Test Product",
            brand="TEST",
            category="TEST",
            sku="LEDGER-001",
            barcode_value="TRAP-LEDGER-001"
        )
        ProductVariant.objects.create(
            product=self.product,
            sku="LEDGER-001-V1",
            cost_price=Decimal("50.00"),
            selling_price=Decimal("100.00")
        )
        
        # Add opening stock
        inventory_services.create_inventory_movement(
            product_id=self.product.id,
            movement_type='OPENING',
            quantity=100,
            user=self.admin,
            warehouse_id=self.warehouse.id
        )
    
    def test_sale_creates_ledger_entry(self):
        """Test that sale creates SALE movement in ledger."""
        initial_movements = InventoryMovement.objects.filter(
            product=self.product,
            movement_type='SALE'
        ).count()
        
        sale = services.process_sale(
            idempotency_key=uuid.uuid4(),
            warehouse_id=self.warehouse.id,
            items=[{'barcode': 'TRAP-LEDGER-001', 'quantity': 5}],
            payments=[{'method': 'CASH', 'amount': Decimal('500.00')}],
            user=self.admin
        )
        
        final_movements = InventoryMovement.objects.filter(
            product=self.product,
            movement_type='SALE'
        ).count()
        
        self.assertEqual(final_movements, initial_movements + 1)
    
    def test_ledger_entry_has_correct_quantity(self):
        """Test that SALE ledger entry has negative quantity."""
        sale = services.process_sale(
            idempotency_key=uuid.uuid4(),
            warehouse_id=self.warehouse.id,
            items=[{'barcode': 'TRAP-LEDGER-001', 'quantity': 7}],
            payments=[{'method': 'UPI', 'amount': Decimal('700.00')}],
            user=self.admin
        )
        
        movement = InventoryMovement.objects.filter(
            product=self.product,
            movement_type='SALE',
            reference_id=sale.id
        ).first()
        
        self.assertIsNotNone(movement)
        self.assertEqual(movement.quantity, -7)  # Negative for sales
    
    def test_stock_derived_from_ledger(self):
        """Test that stock equals sum of all movements."""
        from django.db.models import Sum
        
        services.process_sale(
            idempotency_key=uuid.uuid4(),
            warehouse_id=self.warehouse.id,
            items=[{'barcode': 'TRAP-LEDGER-001', 'quantity': 15}],
            payments=[{'method': 'CASH', 'amount': Decimal('1500.00')}],
            user=self.admin
        )
        
        # Calculate stock from ledger
        ledger_total = InventoryMovement.objects.filter(
            product=self.product,
            warehouse=self.warehouse
        ).aggregate(total=Sum('quantity'))['total'] or 0
        
        # Get stock via service
        service_stock = inventory_services.get_product_stock(
            self.product.id, warehouse_id=self.warehouse.id
        )
        
        self.assertEqual(service_stock, ledger_total)


# =============================================================================
# PHASE 13: PAYMENT MISMATCH TESTS
# =============================================================================

class PaymentMismatchTest(TestCase):
    """
    Test: Reject when payments ≠ total.
    Phase 13: Payments must reconcile exactly.
    """
    
    def setUp(self):
        from users.models import User
        self.admin = User.objects.create_user(
            username='admin', password='adminpass', role='ADMIN'
        )
        self.warehouse = Warehouse.objects.create(
            name="Test WH",
            code="TST-WH"
        )
        self.product = Product.objects.create(
            name="Payment Test Product",
            brand="TEST",
            category="TEST",
            sku="PAY-001",
            barcode_value="TRAP-PAY-001"
        )
        ProductVariant.objects.create(
            product=self.product,
            sku="PAY-001-V1",
            cost_price=Decimal("50.00"),
            selling_price=Decimal("100.00")
        )
        
        inventory_services.create_inventory_movement(
            product_id=self.product.id,
            movement_type='OPENING',
            quantity=100,
            user=self.admin,
            warehouse_id=self.warehouse.id
        )
    
    def test_underpayment_rejected(self):
        """Test that sale is rejected when payments < total."""
        with self.assertRaises(services.PaymentMismatchError):
            services.process_sale(
                idempotency_key=uuid.uuid4(),
                warehouse_id=self.warehouse.id,
                items=[{'barcode': 'TRAP-PAY-001', 'quantity': 2}],  # 200.00 total
                payments=[{'method': 'CASH', 'amount': Decimal('150.00')}],  # Short
                user=self.admin
            )
    
    def test_overpayment_rejected(self):
        """Test that sale is rejected when payments > total."""
        with self.assertRaises(services.PaymentMismatchError):
            services.process_sale(
                idempotency_key=uuid.uuid4(),
                warehouse_id=self.warehouse.id,
                items=[{'barcode': 'TRAP-PAY-001', 'quantity': 2}],  # 200.00 total
                payments=[{'method': 'CASH', 'amount': Decimal('250.00')}],  # Over
                user=self.admin
            )
    
    def test_exact_multi_payment_accepted(self):
        """Test that exact split payment is accepted."""
        sale = services.process_sale(
            idempotency_key=uuid.uuid4(),
            warehouse_id=self.warehouse.id,
            items=[{'barcode': 'TRAP-PAY-001', 'quantity': 3}],  # 300.00 total
            payments=[
                {'method': 'CASH', 'amount': Decimal('150.00')},
                {'method': 'UPI', 'amount': Decimal('150.00')}
            ],
            user=self.admin
        )
        
        self.assertEqual(sale.status, Sale.Status.COMPLETED)


# =============================================================================
# PHASE 13: DISCOUNT VALIDATION TESTS
# =============================================================================

class DiscountValidationTest(TestCase):
    """
    Test: Discount rules enforced.
    Phase 13: Discounts must follow strict rules.
    """
    
    def setUp(self):
        from users.models import User
        self.admin = User.objects.create_user(
            username='admin', password='adminpass', role='ADMIN'
        )
        self.warehouse = Warehouse.objects.create(
            name="Test WH",
            code="TST-WH"
        )
        self.product = Product.objects.create(
            name="Discount Test Product",
            brand="TEST",
            category="TEST",
            sku="DISC-001",
            barcode_value="TRAP-DISC-001"
        )
        ProductVariant.objects.create(
            product=self.product,
            sku="DISC-001-V1",
            cost_price=Decimal("50.00"),
            selling_price=Decimal("100.00")
        )
        
        inventory_services.create_inventory_movement(
            product_id=self.product.id,
            movement_type='OPENING',
            quantity=100,
            user=self.admin,
            warehouse_id=self.warehouse.id
        )
    
    def test_percent_discount_over_100_rejected(self):
        """Test that percentage discount > 100% is rejected."""
        with self.assertRaises(services.InvalidDiscountError):
            services.process_sale(
                idempotency_key=uuid.uuid4(),
                warehouse_id=self.warehouse.id,
                items=[{'barcode': 'TRAP-DISC-001', 'quantity': 2}],
                payments=[{'method': 'CASH', 'amount': Decimal('0.00')}],
                user=self.admin,
                discount_type='PERCENT',
                discount_value=Decimal('150.00')  # 150% - invalid
            )
    
    def test_flat_discount_exceeding_subtotal_rejected(self):
        """Test that flat discount > subtotal is rejected."""
        with self.assertRaises(services.InvalidDiscountError):
            services.process_sale(
                idempotency_key=uuid.uuid4(),
                warehouse_id=self.warehouse.id,
                items=[{'barcode': 'TRAP-DISC-001', 'quantity': 2}],  # 200.00 subtotal
                payments=[{'method': 'CASH', 'amount': Decimal('0.00')}],
                user=self.admin,
                discount_type='FLAT',
                discount_value=Decimal('250.00')  # More than subtotal
            )
    
    def test_valid_percent_discount_accepted(self):
        """Test that valid percentage discount is applied correctly."""
        sale = services.process_sale(
            idempotency_key=uuid.uuid4(),
            warehouse_id=self.warehouse.id,
            items=[{'barcode': 'TRAP-DISC-001', 'quantity': 2}],  # 200.00 subtotal
            payments=[{'method': 'CASH', 'amount': Decimal('160.00')}],
            user=self.admin,
            discount_type='PERCENT',
            discount_value=Decimal('20.00')  # 20% off
        )
        
        self.assertEqual(sale.subtotal, Decimal('200.00'))
        self.assertEqual(sale.total, Decimal('160.00'))  # 200 - 40 = 160
    
    def test_valid_flat_discount_accepted(self):
        """Test that valid flat discount is applied correctly."""
        sale = services.process_sale(
            idempotency_key=uuid.uuid4(),
            warehouse_id=self.warehouse.id,
            items=[{'barcode': 'TRAP-DISC-001', 'quantity': 2}],  # 200.00 subtotal
            payments=[{'method': 'UPI', 'amount': Decimal('150.00')}],
            user=self.admin,
            discount_type='FLAT',
            discount_value=Decimal('50.00')  # 50.00 flat off
        )
        
        self.assertEqual(sale.subtotal, Decimal('200.00'))
        self.assertEqual(sale.total, Decimal('150.00'))  # 200 - 50 = 150


# =============================================================================
# PHASE 13: IDEMPOTENCY TESTS
# =============================================================================

class IdempotencyTest(TestCase):
    """
    Test: Duplicate sale requests are idempotent.
    Phase 13: Same idempotency_key returns same sale.
    """
    
    def setUp(self):
        from users.models import User
        self.admin = User.objects.create_user(
            username='admin', password='adminpass', role='ADMIN'
        )
        self.warehouse = Warehouse.objects.create(
            name="Test WH",
            code="TST-WH"
        )
        self.product = Product.objects.create(
            name="Idempotency Test Product",
            brand="TEST",
            category="TEST",
            sku="IDEMP-001",
            barcode_value="TRAP-IDEMP-001"
        )
        ProductVariant.objects.create(
            product=self.product,
            sku="IDEMP-001-V1",
            cost_price=Decimal("50.00"),
            selling_price=Decimal("100.00")
        )
        
        inventory_services.create_inventory_movement(
            product_id=self.product.id,
            movement_type='OPENING',
            quantity=100,
            user=self.admin,
            warehouse_id=self.warehouse.id
        )
    
    def test_duplicate_request_returns_same_sale(self):
        """Test that same idempotency_key returns same sale."""
        key = uuid.uuid4()
        
        sale1 = services.process_sale(
            idempotency_key=key,
            warehouse_id=self.warehouse.id,
            items=[{'barcode': 'TRAP-IDEMP-001', 'quantity': 2}],
            payments=[{'method': 'CASH', 'amount': Decimal('200.00')}],
            user=self.admin
        )
        
        sale2 = services.process_sale(
            idempotency_key=key,
            warehouse_id=self.warehouse.id,
            items=[{'barcode': 'TRAP-IDEMP-001', 'quantity': 2}],
            payments=[{'method': 'CASH', 'amount': Decimal('200.00')}],
            user=self.admin
        )
        
        self.assertEqual(sale1.id, sale2.id)
    
    def test_duplicate_does_not_reduce_stock_twice(self):
        """Test that duplicate request doesn't reduce stock again."""
        key = uuid.uuid4()
        
        initial_stock = inventory_services.get_product_stock(
            self.product.id, warehouse_id=self.warehouse.id
        )
        
        services.process_sale(
            idempotency_key=key,
            warehouse_id=self.warehouse.id,
            items=[{'barcode': 'TRAP-IDEMP-001', 'quantity': 10}],
            payments=[{'method': 'CASH', 'amount': Decimal('1000.00')}],
            user=self.admin
        )
        
        after_first = inventory_services.get_product_stock(
            self.product.id, warehouse_id=self.warehouse.id
        )
        
        services.process_sale(
            idempotency_key=key,  # Same key
            warehouse_id=self.warehouse.id,
            items=[{'barcode': 'TRAP-IDEMP-001', 'quantity': 10}],
            payments=[{'method': 'CASH', 'amount': Decimal('1000.00')}],
            user=self.admin
        )
        
        after_second = inventory_services.get_product_stock(
            self.product.id, warehouse_id=self.warehouse.id
        )
        
        self.assertEqual(after_first, initial_stock - 10)
        self.assertEqual(after_second, after_first)  # No further reduction


# =============================================================================
# PHASE 13.1: STATUS DEFAULT TESTS
# =============================================================================

class SaleStatusDefaultTest(TestCase):
    """
    Test: status = COMPLETED on creation.
    Phase 13.1: Verify sale lifecycle state is set correctly.
    """
    
    def setUp(self):
        from users.models import User
        self.admin = User.objects.create_user(
            username='admin', password='adminpass', role='ADMIN'
        )
        self.warehouse = Warehouse.objects.create(
            name="Test WH",
            code="TST-WH"
        )
        self.product = Product.objects.create(
            name="Status Test Product",
            brand="TEST",
            category="TEST",
            sku="STATUS-001",
            barcode_value="TRAP-STATUS-001"
        )
        ProductVariant.objects.create(
            product=self.product,
            sku="STATUS-001-V1",
            cost_price=Decimal("50.00"),
            selling_price=Decimal("100.00")
        )
        
        inventory_services.create_inventory_movement(
            product_id=self.product.id,
            movement_type='OPENING',
            quantity=100,
            user=self.admin,
            warehouse_id=self.warehouse.id
        )
    
    def test_sale_status_is_completed(self):
        """Test that sale status is COMPLETED after process_sale."""
        sale = services.process_sale(
            idempotency_key=uuid.uuid4(),
            warehouse_id=self.warehouse.id,
            items=[{'barcode': 'TRAP-STATUS-001', 'quantity': 2}],
            payments=[{'method': 'CASH', 'amount': Decimal('200.00')}],
            user=self.admin
        )
        
        self.assertEqual(sale.status, Sale.Status.COMPLETED)
    
    def test_refunded_status_exists(self):
        """Test that REFUNDED status exists in Sale.Status."""
        self.assertIn('REFUNDED', [s.value for s in Sale.Status])


# =============================================================================
# PHASE 13.1: DISCOUNT BEFORE GST TESTS
# =============================================================================

class DiscountBeforeGSTTest(TestCase):
    """
    Test: GST calculated AFTER discount.
    Phase 13.1: Verify correct calculation order.
    """
    
    def setUp(self):
        from users.models import User
        self.admin = User.objects.create_user(
            username='admin', password='adminpass', role='ADMIN'
        )
        self.warehouse = Warehouse.objects.create(
            name="Test WH",
            code="TST-WH"
        )
        self.product = Product.objects.create(
            name="GST Order Test Product",
            brand="TEST",
            category="TEST",
            sku="GSTORD-001",
            barcode_value="TRAP-GSTORD-001"
        )
        ProductVariant.objects.create(
            product=self.product,
            sku="GSTORD-001-V1",
            cost_price=Decimal("50.00"),
            selling_price=Decimal("100.00")
        )
        
        inventory_services.create_inventory_movement(
            product_id=self.product.id,
            movement_type='OPENING',
            quantity=100,
            user=self.admin,
            warehouse_id=self.warehouse.id
        )
    
    def test_gst_calculated_after_discount(self):
        """Test that GST is calculated on discounted amount."""
        # Subtotal: 2 × 100 = 200
        # Discount: 10% = 20
        # Discounted subtotal: 180
        # GST 18% on 180 = 32.40
        # Total: 180 + 32.40 = 212.40
        
        sale = services.process_sale(
            idempotency_key=uuid.uuid4(),
            warehouse_id=self.warehouse.id,
            items=[{'barcode': 'TRAP-GSTORD-001', 'quantity': 2, 'gst_percentage': Decimal('18.00')}],
            payments=[{'method': 'CASH', 'amount': Decimal('212.40')}],
            user=self.admin,
            discount_type='PERCENT',
            discount_value=Decimal('10.00')
        )
        
        self.assertEqual(sale.subtotal, Decimal('200.00'))
        self.assertEqual(sale.total_gst, Decimal('32.40'))
        self.assertEqual(sale.total, Decimal('212.40'))
        
        # Verify line item has correct GST
        item = sale.items.first()
        self.assertEqual(item.gst_percentage, Decimal('18.00'))
        self.assertEqual(item.gst_amount, Decimal('32.40'))


# =============================================================================
# PHASE 13.1: GST STORED TESTS
# =============================================================================

class GSTStoredTest(TestCase):
    """
    Test: Line GST persisted immutably.
    Phase 13.1: Verify GST is stored per line item.
    """
    
    def setUp(self):
        from users.models import User
        self.admin = User.objects.create_user(
            username='admin', password='adminpass', role='ADMIN'
        )
        self.warehouse = Warehouse.objects.create(
            name="Test WH",
            code="TST-WH"
        )
        self.product = Product.objects.create(
            name="GST Storage Test Product",
            brand="TEST",
            category="TEST",
            sku="GSTSTORE-001",
            barcode_value="TRAP-GSTSTORE-001"
        )
        ProductVariant.objects.create(
            product=self.product,
            sku="GSTSTORE-001-V1",
            cost_price=Decimal("50.00"),
            selling_price=Decimal("100.00")
        )
        
        inventory_services.create_inventory_movement(
            product_id=self.product.id,
            movement_type='OPENING',
            quantity=100,
            user=self.admin,
            warehouse_id=self.warehouse.id
        )
    
    def test_gst_fields_stored_on_sale_item(self):
        """Test that GST fields are stored on SaleItem."""
        sale = services.process_sale(
            idempotency_key=uuid.uuid4(),
            warehouse_id=self.warehouse.id,
            items=[{'barcode': 'TRAP-GSTSTORE-001', 'quantity': 3, 'gst_percentage': Decimal('12.00')}],
            payments=[{'method': 'UPI', 'amount': Decimal('336.00')}],  # 300 + 36 GST
            user=self.admin
        )
        
        item = sale.items.first()
        self.assertEqual(item.gst_percentage, Decimal('12.00'))
        self.assertEqual(item.gst_amount, Decimal('36.00'))
        self.assertEqual(item.line_total, Decimal('300.00'))
        self.assertEqual(item.line_total_with_gst, Decimal('336.00'))
    
    def test_total_gst_stored_on_sale(self):
        """Test that total_gst is stored on Sale."""
        sale = services.process_sale(
            idempotency_key=uuid.uuid4(),
            warehouse_id=self.warehouse.id,
            items=[{'barcode': 'TRAP-GSTSTORE-001', 'quantity': 2, 'gst_percentage': Decimal('5.00')}],
            payments=[{'method': 'CARD', 'amount': Decimal('210.00')}],  # 200 + 10 GST
            user=self.admin
        )
        
        self.assertEqual(sale.total_gst, Decimal('10.00'))


# =============================================================================
# PHASE 13.1: GST VALIDATION TESTS
# =============================================================================

class GSTValidationTest(TestCase):
    """
    Test: Reject GST < 0 or > 100.
    Phase 13.1: Verify GST validation rules.
    """
    
    def setUp(self):
        from users.models import User
        self.admin = User.objects.create_user(
            username='admin', password='adminpass', role='ADMIN'
        )
        self.warehouse = Warehouse.objects.create(
            name="Test WH",
            code="TST-WH"
        )
        self.product = Product.objects.create(
            name="GST Validation Test Product",
            brand="TEST",
            category="TEST",
            sku="GSTVAL-001",
            barcode_value="TRAP-GSTVAL-001"
        )
        ProductVariant.objects.create(
            product=self.product,
            sku="GSTVAL-001-V1",
            cost_price=Decimal("50.00"),
            selling_price=Decimal("100.00")
        )
        
        inventory_services.create_inventory_movement(
            product_id=self.product.id,
            movement_type='OPENING',
            quantity=100,
            user=self.admin,
            warehouse_id=self.warehouse.id
        )
    
    def test_negative_gst_rejected(self):
        """Test that negative GST percentage is rejected."""
        with self.assertRaises(services.InvalidGSTError):
            services.process_sale(
                idempotency_key=uuid.uuid4(),
                warehouse_id=self.warehouse.id,
                items=[{'barcode': 'TRAP-GSTVAL-001', 'quantity': 1, 'gst_percentage': Decimal('-5.00')}],
                payments=[{'method': 'CASH', 'amount': Decimal('100.00')}],
                user=self.admin
            )
    
    def test_gst_over_100_rejected(self):
        """Test that GST > 100% is rejected."""
        with self.assertRaises(services.InvalidGSTError):
            services.process_sale(
                idempotency_key=uuid.uuid4(),
                warehouse_id=self.warehouse.id,
                items=[{'barcode': 'TRAP-GSTVAL-001', 'quantity': 1, 'gst_percentage': Decimal('150.00')}],
                payments=[{'method': 'CASH', 'amount': Decimal('100.00')}],
                user=self.admin
            )
    
    def test_valid_gst_accepted(self):
        """Test that valid GST (0-100) is accepted."""
        sale = services.process_sale(
            idempotency_key=uuid.uuid4(),
            warehouse_id=self.warehouse.id,
            items=[{'barcode': 'TRAP-GSTVAL-001', 'quantity': 1, 'gst_percentage': Decimal('28.00')}],
            payments=[{'method': 'CASH', 'amount': Decimal('128.00')}],  # 100 + 28 GST
            user=self.admin
        )
        
        self.assertEqual(sale.total, Decimal('128.00'))


# =============================================================================
# PHASE 13.1: INVOICE MATH TESTS
# =============================================================================

class InvoiceMathTest(TestCase):
    """
    Test: All totals reconcile exactly.
    Phase 13.1: Verify complete calculation correctness.
    """
    
    def setUp(self):
        from users.models import User
        self.admin = User.objects.create_user(
            username='admin', password='adminpass', role='ADMIN'
        )
        self.warehouse = Warehouse.objects.create(
            name="Test WH",
            code="TST-WH"
        )
        self.product1 = Product.objects.create(
            name="Math Test Product 1",
            brand="TEST",
            category="TEST",
            sku="MATH-001",
            barcode_value="TRAP-MATH-001"
        )
        ProductVariant.objects.create(
            product=self.product1,
            sku="MATH-001-V1",
            cost_price=Decimal("50.00"),
            selling_price=Decimal("100.00")
        )
        self.product2 = Product.objects.create(
            name="Math Test Product 2",
            brand="TEST",
            category="TEST",
            sku="MATH-002",
            barcode_value="TRAP-MATH-002"
        )
        ProductVariant.objects.create(
            product=self.product2,
            sku="MATH-002-V1",
            cost_price=Decimal("75.00"),
            selling_price=Decimal("150.00")
        )
        
        inventory_services.create_inventory_movement(
            product_id=self.product1.id,
            movement_type='OPENING',
            quantity=100,
            user=self.admin,
            warehouse_id=self.warehouse.id
        )
        inventory_services.create_inventory_movement(
            product_id=self.product2.id,
            movement_type='OPENING',
            quantity=100,
            user=self.admin,
            warehouse_id=self.warehouse.id
        )
    
    def test_multi_item_totals_reconcile(self):
        """Test that multi-item sale with discount and GST reconciles."""
        # Item 1: 2 × 100 = 200, GST 18%
        # Item 2: 1 × 150 = 150, GST 12%
        # Subtotal: 350
        # Discount 10%: 35
        # Discounted subtotal: 315
        # Pro-rata discount:
        #   Item 1: (200/350) × 35 = 20, discounted = 180, GST = 32.40
        #   Item 2: (150/350) × 35 = 15, discounted = 135, GST = 16.20
        # Total GST: 48.60
        # Final: 315 + 48.60 = 363.60
        
        sale = services.process_sale(
            idempotency_key=uuid.uuid4(),
            warehouse_id=self.warehouse.id,
            items=[
                {'barcode': 'TRAP-MATH-001', 'quantity': 2, 'gst_percentage': Decimal('18.00')},
                {'barcode': 'TRAP-MATH-002', 'quantity': 1, 'gst_percentage': Decimal('12.00')},
            ],
            payments=[{'method': 'CASH', 'amount': Decimal('363.60')}],
            user=self.admin,
            discount_type='PERCENT',
            discount_value=Decimal('10.00')
        )
        
        self.assertEqual(sale.subtotal, Decimal('350.00'))
        self.assertEqual(sale.total_gst, Decimal('48.60'))
        self.assertEqual(sale.total, Decimal('363.60'))
        
        # Verify individual items
        items = list(sale.items.all())
        self.assertEqual(len(items), 2)
        
        # Sum of line totals with GST should equal final total
        line_totals_with_gst = sum(item.line_total_with_gst for item in items)
        self.assertEqual(line_totals_with_gst, sale.total)


# =============================================================================
# PHASE 13.1: REFUND PREPARATION TESTS
# =============================================================================

class RefundPreparationTest(TestCase):
    """
    Test: Sale immutability verified.
    Phase 13.1: Prepare for future refund logic.
    """
    
    def setUp(self):
        from users.models import User
        self.admin = User.objects.create_user(
            username='admin', password='adminpass', role='ADMIN'
        )
        self.warehouse = Warehouse.objects.create(
            name="Test WH",
            code="TST-WH"
        )
        self.product = Product.objects.create(
            name="Refund Prep Test Product",
            brand="TEST",
            category="TEST",
            sku="REFPREP-001",
            barcode_value="TRAP-REFPREP-001"
        )
        ProductVariant.objects.create(
            product=self.product,
            sku="REFPREP-001-V1",
            cost_price=Decimal("50.00"),
            selling_price=Decimal("100.00")
        )
        
        inventory_services.create_inventory_movement(
            product_id=self.product.id,
            movement_type='OPENING',
            quantity=100,
            user=self.admin,
            warehouse_id=self.warehouse.id
        )
    
    def test_sale_item_cannot_be_modified(self):
        """Test that SaleItem cannot be modified after creation."""
        sale = services.process_sale(
            idempotency_key=uuid.uuid4(),
            warehouse_id=self.warehouse.id,
            items=[{'barcode': 'TRAP-REFPREP-001', 'quantity': 2}],
            payments=[{'method': 'CASH', 'amount': Decimal('200.00')}],
            user=self.admin
        )
        
        item = sale.items.first()
        item.quantity = 5  # Try to modify
        
        with self.assertRaises(ValueError) as context:
            item.save()
        
        self.assertIn("cannot be modified", str(context.exception))
    
    def test_sale_item_cannot_be_deleted(self):
        """Test that SaleItem cannot be deleted."""
        sale = services.process_sale(
            idempotency_key=uuid.uuid4(),
            warehouse_id=self.warehouse.id,
            items=[{'barcode': 'TRAP-REFPREP-001', 'quantity': 2}],
            payments=[{'method': 'CASH', 'amount': Decimal('200.00')}],
            user=self.admin
        )
        
        item = sale.items.first()
        
        with self.assertRaises(ValueError) as context:
            item.delete()
        
        self.assertIn("cannot be deleted", str(context.exception))

