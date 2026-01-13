"""
Invoice Tests for TRAP Inventory System.
Tests for invoice generation with discounts.
"""

import uuid
from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status

from inventory.models import Warehouse, Product, ProductVariant
from inventory.services import record_purchase
from sales.models import Sale
from sales.services import process_sale
from invoices.models import Invoice, InvoiceItem, InvoiceSequence
from invoices import services


class InvoiceGenerationTest(TestCase):
    """Tests for invoice generation."""
    
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
            selling_price=Decimal("100.00")
        )
        record_purchase(self.variant, self.warehouse, 100)
        
        # Create a completed sale
        self.sale = process_sale(
            idempotency_key=uuid.uuid4(),
            items=[{'barcode': self.variant.barcode, 'quantity': 2}],
            warehouse_id=str(self.warehouse.id),
            payment_method='CASH'
        )
    
    def test_invoice_generation_no_discount(self):
        """Test invoice generation without discount."""
        invoice = services.generate_invoice_for_sale(
            sale_id=str(self.sale.id),
            billing_name="John Doe",
            billing_phone="9999999999"
        )
        
        self.assertIsNotNone(invoice.id)
        self.assertIn('TRAP/INV', invoice.invoice_number)
        self.assertEqual(invoice.subtotal_amount, Decimal("200.00"))
        self.assertEqual(invoice.discount_type, 'NONE')
        self.assertEqual(invoice.discount_amount, Decimal("0.00"))
        self.assertEqual(invoice.total_amount, Decimal("200.00"))
    
    def test_invoice_generation_percentage_discount(self):
        """Test invoice generation with percentage discount."""
        invoice = services.generate_invoice_for_sale(
            sale_id=str(self.sale.id),
            billing_name="John Doe",
            billing_phone="9999999999",
            discount_type='PERCENTAGE',
            discount_value=Decimal("10")
        )
        
        self.assertEqual(invoice.discount_type, 'PERCENTAGE')
        self.assertEqual(invoice.discount_value, Decimal("10"))
        self.assertEqual(invoice.discount_amount, Decimal("20.00"))  # 10% of 200
        self.assertEqual(invoice.total_amount, Decimal("180.00"))  # 200 - 20
    
    def test_invoice_generation_flat_discount(self):
        """Test invoice generation with flat discount."""
        invoice = services.generate_invoice_for_sale(
            sale_id=str(self.sale.id),
            billing_name="John Doe",
            billing_phone="9999999999",
            discount_type='FLAT',
            discount_value=Decimal("50")
        )
        
        self.assertEqual(invoice.discount_type, 'FLAT')
        self.assertEqual(invoice.discount_value, Decimal("50"))
        self.assertEqual(invoice.discount_amount, Decimal("50.00"))
        self.assertEqual(invoice.total_amount, Decimal("150.00"))  # 200 - 50
    
    def test_invoice_items_snapshotted(self):
        """Test that invoice items are properly snapshotted."""
        invoice = services.generate_invoice_for_sale(
            sale_id=str(self.sale.id),
            billing_name="John Doe",
            billing_phone="9999999999"
        )
        
        self.assertEqual(invoice.items.count(), 1)
        item = invoice.items.first()
        self.assertEqual(item.product_name, "Test Product")
        self.assertEqual(item.quantity, 2)
        self.assertEqual(item.unit_price, Decimal("100.00"))
        self.assertEqual(item.line_total, Decimal("200.00"))


class DiscountValidationTest(TestCase):
    """Tests for discount validation."""
    
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
            selling_price=Decimal("100.00")
        )
        record_purchase(self.variant, self.warehouse, 100)
        
        self.sale = process_sale(
            idempotency_key=uuid.uuid4(),
            items=[{'barcode': self.variant.barcode, 'quantity': 1}],
            warehouse_id=str(self.warehouse.id),
            payment_method='CASH'
        )
    
    def test_percentage_discount_over_100_fails(self):
        """Test that percentage > 100% fails validation."""
        with self.assertRaises(services.InvalidDiscountError):
            services.generate_invoice_for_sale(
                sale_id=str(self.sale.id),
                billing_name="John Doe",
                billing_phone="9999999999",
                discount_type='PERCENTAGE',
                discount_value=Decimal("150")
            )
    
    def test_flat_discount_exceeds_subtotal_fails(self):
        """Test that flat discount > subtotal fails validation."""
        with self.assertRaises(services.InvalidDiscountError):
            services.generate_invoice_for_sale(
                sale_id=str(self.sale.id),
                billing_name="John Doe",
                billing_phone="9999999999",
                discount_type='FLAT',
                discount_value=Decimal("500")  # Subtotal is 100
            )
    
    def test_negative_discount_fails(self):
        """Test that negative discount fails validation."""
        with self.assertRaises(services.InvalidDiscountError):
            services.generate_invoice_for_sale(
                sale_id=str(self.sale.id),
                billing_name="John Doe",
                billing_phone="9999999999",
                discount_type='PERCENTAGE',
                discount_value=Decimal("-10")
            )
    
    def test_discount_type_without_value_fails(self):
        """Test that discount type without value fails."""
        with self.assertRaises(services.InvalidDiscountError):
            services.generate_invoice_for_sale(
                sale_id=str(self.sale.id),
                billing_name="John Doe",
                billing_phone="9999999999",
                discount_type='PERCENTAGE',
                discount_value=None
            )


class InvoiceImmutabilityTest(TestCase):
    """Tests for invoice immutability."""
    
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
            selling_price=Decimal("100.00")
        )
        record_purchase(self.variant, self.warehouse, 100)
        
        self.sale = process_sale(
            idempotency_key=uuid.uuid4(),
            items=[{'barcode': self.variant.barcode, 'quantity': 1}],
            warehouse_id=str(self.warehouse.id),
            payment_method='CASH'
        )
        
        self.invoice = services.generate_invoice_for_sale(
            sale_id=str(self.sale.id),
            billing_name="John Doe",
            billing_phone="9999999999"
        )
    
    def test_invoice_update_blocked(self):
        """Test that invoice cannot be updated."""
        self.invoice.total_amount = Decimal("500.00")
        with self.assertRaises(ValueError):
            self.invoice.save()
    
    def test_invoice_delete_blocked(self):
        """Test that invoice cannot be deleted."""
        with self.assertRaises(ValueError):
            self.invoice.delete()
    
    def test_invoice_item_update_blocked(self):
        """Test that invoice item cannot be updated."""
        item = self.invoice.items.first()
        item.quantity = 10
        with self.assertRaises(ValueError):
            item.save()
    
    def test_invoice_item_delete_blocked(self):
        """Test that invoice item cannot be deleted."""
        item = self.invoice.items.first()
        with self.assertRaises(ValueError):
            item.delete()


class DuplicateInvoiceTest(TestCase):
    """Tests for duplicate invoice prevention."""
    
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
            selling_price=Decimal("100.00")
        )
        record_purchase(self.variant, self.warehouse, 100)
        
        self.sale = process_sale(
            idempotency_key=uuid.uuid4(),
            items=[{'barcode': self.variant.barcode, 'quantity': 1}],
            warehouse_id=str(self.warehouse.id),
            payment_method='CASH'
        )
    
    def test_duplicate_invoice_generation_blocked(self):
        """Test that duplicate invoice for same sale is blocked."""
        # First invoice
        services.generate_invoice_for_sale(
            sale_id=str(self.sale.id),
            billing_name="John Doe",
            billing_phone="9999999999"
        )
        
        # Second invoice attempt should fail
        with self.assertRaises(services.InvoiceAlreadyExistsError):
            services.generate_invoice_for_sale(
                sale_id=str(self.sale.id),
                billing_name="Jane Doe",
                billing_phone="8888888888"
            )


class InvoiceNumberSequenceTest(TestCase):
    """Tests for invoice number sequencing."""
    
    def test_invoice_numbers_are_sequential(self):
        """Test that invoice numbers are sequential within same year."""
        # Create test data
        warehouse = Warehouse.objects.create(name="Test WH", code="TWH")
        product = Product.objects.create(name="Test", brand="Test", category="Test")
        
        invoices = []
        for i in range(3):
            variant = ProductVariant.objects.create(
                product=product,
                sku=f"SEQ-{i:03d}",
                cost_price=Decimal("10.00"),
                selling_price=Decimal("100.00")
            )
            record_purchase(variant, warehouse, 10)
            
            sale = process_sale(
                idempotency_key=uuid.uuid4(),
                items=[{'barcode': variant.barcode, 'quantity': 1}],
                warehouse_id=str(warehouse.id),
                payment_method='CASH'
            )
            
            invoice = services.generate_invoice_for_sale(
                sale_id=str(sale.id),
                billing_name=f"Customer {i}",
                billing_phone=f"999999900{i}"
            )
            invoices.append(invoice)
        
        # Verify sequential numbering
        numbers = [inv.invoice_number for inv in invoices]
        for i in range(len(numbers) - 1):
            self.assertLess(numbers[i], numbers[i + 1])


class SaleStatusValidationTest(TestCase):
    """Tests for sale status validation."""
    
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
            selling_price=Decimal("100.00")
        )
        record_purchase(self.variant, self.warehouse, 100)
    
    def test_invoice_for_non_completed_sale_fails(self):
        """Test that invoice cannot be generated for non-COMPLETED sale."""
        # Create a pending sale directly
        sale = Sale.objects.create(
            idempotency_key=uuid.uuid4(),
            warehouse=self.warehouse,
            total_amount=Decimal("100.00"),
            total_items=1,
            payment_method='CASH',
            status=Sale.Status.PENDING
        )
        
        with self.assertRaises(services.SaleNotCompletedError):
            services.generate_invoice_for_sale(
                sale_id=str(sale.id),
                billing_name="John Doe",
                billing_phone="9999999999"
            )


class InvoiceAPITest(APITestCase):
    """API tests for invoice endpoints."""
    
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
            selling_price=Decimal("100.00")
        )
        record_purchase(self.variant, self.warehouse, 100)
        
        self.sale = process_sale(
            idempotency_key=uuid.uuid4(),
            items=[{'barcode': self.variant.barcode, 'quantity': 2}],
            warehouse_id=str(self.warehouse.id),
            payment_method='CASH'
        )
    
    def test_generate_invoice_endpoint_no_discount(self):
        """Test generate invoice API without discount."""
        response = self.client.post('/api/v1/invoices/generate/', {
            'sale_id': str(self.sale.id),
            'billing_name': 'Test Customer',
            'billing_phone': '9999999999'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['discount_type'], 'NONE')
        self.assertEqual(response.data['total_amount'], '200.00')
    
    def test_generate_invoice_endpoint_with_discount(self):
        """Test generate invoice API with discount."""
        response = self.client.post('/api/v1/invoices/generate/', {
            'sale_id': str(self.sale.id),
            'billing_name': 'Test Customer',
            'billing_phone': '9999999999',
            'discount_type': 'PERCENTAGE',
            'discount_value': '10'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['discount_type'], 'PERCENTAGE')
        self.assertEqual(response.data['discount_amount'], '20.00')
        self.assertEqual(response.data['total_amount'], '180.00')
    
    def test_invoice_list_endpoint(self):
        """Test invoice list API."""
        # Generate an invoice first
        services.generate_invoice_for_sale(
            sale_id=str(self.sale.id),
            billing_name="Test Customer",
            billing_phone="9999999999"
        )
        
        response = self.client.get('/api/v1/invoices/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
