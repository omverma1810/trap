"""
Seed Demo Data Command for TRAP Inventory System.

Creates realistic demo data for development and testing.
Idempotent - running multiple times will not create duplicates.

Usage: python manage.py seed_demo_data
"""

import random
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from datetime import timedelta

from inventory.models import (
    Warehouse, Product, ProductVariant, 
    StockLedger, StockSnapshot
)
from sales.models import Sale, SaleItem
from invoices.models import Invoice, InvoiceItem, InvoiceSequence


class Command(BaseCommand):
    help = 'Seed the database with realistic demo data'

    def handle(self, *args, **options):
        self.stdout.write('\n🌱 Starting TRAP Demo Data Seed...\n')
        
        try:
            with transaction.atomic():
                warehouses = self.create_warehouses()
                products = self.create_products()
                variants = self.create_variants(products)
                self.create_initial_stock(variants, warehouses[0])
                sales = self.create_sales(variants, warehouses[0])
                self.create_invoices(sales, warehouses[0])
            
            self.stdout.write(self.style.SUCCESS('\n✅ Demo data seeded successfully!\n'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n❌ Error seeding data: {e}'))
            raise

    def create_warehouses(self):
        """Create demo warehouses."""
        warehouses_data = [
            {'name': 'Main Warehouse', 'code': 'MAIN', 'address': '123 Fashion Street, Mumbai 400001'},
            {'name': 'Secondary Store', 'code': 'SEC', 'address': '456 Retail Lane, Mumbai 400002'},
        ]
        
        warehouses = []
        created_count = 0
        
        for data in warehouses_data:
            warehouse, created = Warehouse.objects.get_or_create(
                code=data['code'],
                defaults=data
            )
            warehouses.append(warehouse)
            if created:
                created_count += 1
        
        self.stdout.write(f'✔ Warehouses: {created_count} created, {len(warehouses) - created_count} existing')
        return warehouses

    def create_products(self):
        """Create demo products."""
        products_data = [
            {'name': 'Premium Cotton T-Shirt', 'brand': 'TRAP Essentials', 'category': 'T-Shirts'},
            {'name': 'Slim Fit Denim Jeans', 'brand': 'TRAP Denim', 'category': 'Jeans'},
            {'name': 'Classic Polo Shirt', 'brand': 'TRAP Essentials', 'category': 'Shirts'},
            {'name': 'Leather Biker Jacket', 'brand': 'TRAP Premium', 'category': 'Jackets'},
            {'name': 'Canvas Sneakers', 'brand': 'TRAP Footwear', 'category': 'Footwear'},
            {'name': 'Crew Neck Sweater', 'brand': 'TRAP Winter', 'category': 'Sweaters'},
            {'name': 'Chino Trousers', 'brand': 'TRAP Basics', 'category': 'Trousers'},
            {'name': 'Leather Wallet', 'brand': 'TRAP Accessories', 'category': 'Accessories'},
            {'name': 'Aviator Sunglasses', 'brand': 'TRAP Eyewear', 'category': 'Accessories'},
            {'name': 'Chelsea Boots', 'brand': 'TRAP Footwear', 'category': 'Footwear'},
            {'name': 'Linen Summer Shirt', 'brand': 'TRAP Summer', 'category': 'Shirts'},
            {'name': 'Cargo Shorts', 'brand': 'TRAP Casual', 'category': 'Shorts'},
            {'name': 'Running Shoes', 'brand': 'TRAP Active', 'category': 'Footwear'},
            {'name': 'Baseball Cap', 'brand': 'TRAP Accessories', 'category': 'Accessories'},
            {'name': 'Formal Dress Shirt', 'brand': 'TRAP Formal', 'category': 'Shirts'},
        ]
        
        products = []
        created_count = 0
        
        for data in products_data:
            product, created = Product.objects.get_or_create(
                name=data['name'],
                brand=data['brand'],
                defaults=data
            )
            products.append(product)
            if created:
                created_count += 1
        
        self.stdout.write(f'✔ Products: {created_count} created, {len(products) - created_count} existing')
        return products

    def create_variants(self, products):
        """Create product variants with SKUs and pricing."""
        variants_config = [
            # T-Shirts
            {'product': 0, 'sku': 'TSH-001-WHT-M', 'size': 'M', 'color': 'White', 'cost': 650, 'sell': 1299},
            {'product': 0, 'sku': 'TSH-001-WHT-L', 'size': 'L', 'color': 'White', 'cost': 650, 'sell': 1299},
            {'product': 0, 'sku': 'TSH-001-BLK-M', 'size': 'M', 'color': 'Black', 'cost': 650, 'sell': 1299},
            # Jeans
            {'product': 1, 'sku': 'JNS-001-BLU-32', 'size': '32', 'color': 'Blue', 'cost': 1200, 'sell': 2499},
            {'product': 1, 'sku': 'JNS-001-BLU-34', 'size': '34', 'color': 'Blue', 'cost': 1200, 'sell': 2499},
            # Polo
            {'product': 2, 'sku': 'POL-001-NAV-M', 'size': 'M', 'color': 'Navy', 'cost': 850, 'sell': 1799},
            {'product': 2, 'sku': 'POL-001-NAV-L', 'size': 'L', 'color': 'Navy', 'cost': 850, 'sell': 1799},
            # Jacket
            {'product': 3, 'sku': 'JKT-001-BLK-M', 'size': 'M', 'color': 'Black', 'cost': 4500, 'sell': 8999},
            {'product': 3, 'sku': 'JKT-001-BRN-M', 'size': 'M', 'color': 'Brown', 'cost': 4500, 'sell': 8999},
            # Sneakers
            {'product': 4, 'sku': 'SNK-001-WHT-9', 'size': '9', 'color': 'White', 'cost': 1500, 'sell': 2999},
            {'product': 4, 'sku': 'SNK-001-BLK-10', 'size': '10', 'color': 'Black', 'cost': 1500, 'sell': 2999},
            # Sweater
            {'product': 5, 'sku': 'SWT-001-GRY-M', 'size': 'M', 'color': 'Grey', 'cost': 1100, 'sell': 2199},
            {'product': 5, 'sku': 'SWT-001-GRY-L', 'size': 'L', 'color': 'Grey', 'cost': 1100, 'sell': 2199},
            # Chino
            {'product': 6, 'sku': 'CHN-001-KHK-32', 'size': '32', 'color': 'Khaki', 'cost': 900, 'sell': 1899},
            {'product': 6, 'sku': 'CHN-001-KHK-34', 'size': '34', 'color': 'Khaki', 'cost': 900, 'sell': 1899},
            # Wallet
            {'product': 7, 'sku': 'WLT-001-BLK', 'size': None, 'color': 'Black', 'cost': 800, 'sell': 1599},
            {'product': 7, 'sku': 'WLT-001-BRN', 'size': None, 'color': 'Brown', 'cost': 800, 'sell': 1599},
            # Sunglasses
            {'product': 8, 'sku': 'SNG-001-GLD', 'size': None, 'color': 'Gold', 'cost': 750, 'sell': 1499},
            # Chelsea Boots
            {'product': 9, 'sku': 'BTS-001-BLK-9', 'size': '9', 'color': 'Black', 'cost': 2700, 'sell': 5499},
            {'product': 9, 'sku': 'BTS-001-BRN-10', 'size': '10', 'color': 'Brown', 'cost': 2700, 'sell': 5499},
            # Linen Shirt
            {'product': 10, 'sku': 'LNS-001-WHT-M', 'size': 'M', 'color': 'White', 'cost': 950, 'sell': 1999},
            # Cargo Shorts
            {'product': 11, 'sku': 'CRG-001-OLV-32', 'size': '32', 'color': 'Olive', 'cost': 700, 'sell': 1499},
            # Running Shoes
            {'product': 12, 'sku': 'RUN-001-BLU-9', 'size': '9', 'color': 'Blue', 'cost': 2000, 'sell': 3999},
            # Cap - Out of stock item
            {'product': 13, 'sku': 'CAP-001-BLK', 'size': None, 'color': 'Black', 'cost': 300, 'sell': 599},
            # Formal Shirt - Low stock item  
            {'product': 14, 'sku': 'FRM-001-WHT-M', 'size': 'M', 'color': 'White', 'cost': 800, 'sell': 1699},
        ]
        
        variants = []
        created_count = 0
        
        for config in variants_config:
            variant, created = ProductVariant.objects.get_or_create(
                sku=config['sku'],
                defaults={
                    'product': products[config['product']],
                    'size': config['size'],
                    'color': config['color'],
                    'cost_price': Decimal(str(config['cost'])),
                    'selling_price': Decimal(str(config['sell'])),
                    'reorder_threshold': 5,
                }
            )
            variants.append(variant)
            if created:
                created_count += 1
        
        self.stdout.write(f'✔ Product Variants: {created_count} created, {len(variants) - created_count} existing')
        return variants

    def create_initial_stock(self, variants, warehouse):
        """Create initial stock purchase entries."""
        # Stock quantities: some high, some low, some zero
        stock_quantities = [
            45, 30, 25,  # T-shirts: good stock
            20, 15,      # Jeans: medium stock
            35, 28,      # Polo: good stock
            8, 5,        # Jacket: low stock (expensive)
            42, 38,      # Sneakers: good stock
            22, 18,      # Sweater: medium stock
            50, 45,      # Chino: high stock
            30, 25,      # Wallet: medium stock
            15,          # Sunglasses: medium stock
            12, 8,       # Chelsea Boots: low stock
            18,          # Linen Shirt: medium stock
            55,          # Cargo Shorts: high stock
            4,           # Running Shoes: low stock
            0,           # Cap: out of stock
            3,           # Formal Shirt: very low stock
        ]
        
        # Check if stock already exists
        existing_entries = StockLedger.objects.filter(
            warehouse=warehouse,
            event_type=StockLedger.EventType.PURCHASE,
            notes='Initial demo stock'
        ).count()
        
        if existing_entries > 0:
            self.stdout.write(f'✔ Stock Ledger: Entries already exist, skipping...')
            return
        
        created_count = 0
        for i, variant in enumerate(variants):
            qty = stock_quantities[i] if i < len(stock_quantities) else 10
            
            if qty > 0:
                # Create purchase entry
                StockLedger.objects.create(
                    variant=variant,
                    warehouse=warehouse,
                    event_type=StockLedger.EventType.PURCHASE,
                    quantity=qty,
                    reference_type=StockLedger.ReferenceType.PURCHASE,
                    reference_id=f'INIT-{variant.sku}',
                    notes='Initial demo stock',
                    created_by='seed_demo_data'
                )
                
                # Update snapshot
                StockSnapshot.recalculate(variant, warehouse)
                created_count += 1
        
        self.stdout.write(f'✔ Stock Ledger Entries: {created_count} purchase entries created')

    def create_sales(self, variants, warehouse):
        """Create demo sales spread across last 30 days."""
        # Check if sales already exist
        existing_sales = Sale.objects.filter(
            created_by='seed_demo_data'
        ).count()
        
        if existing_sales > 0:
            self.stdout.write(f'✔ Sales: {existing_sales} already exist, skipping...')
            return list(Sale.objects.filter(created_by='seed_demo_data', status=Sale.Status.COMPLETED))
        
        # Get variants with stock
        variants_with_stock = []
        for v in variants:
            stock = v.get_total_stock()
            if stock > 0:
                variants_with_stock.append((v, stock))
        
        sales = []
        now = timezone.now()
        
        for day_offset in range(30, 0, -1):
            # 0-3 sales per day
            num_sales = random.choices([0, 1, 1, 2, 2, 3], weights=[1, 3, 3, 3, 2, 1])[0]
            
            for _ in range(num_sales):
                if not variants_with_stock:
                    break
                    
                sale_date = now - timedelta(days=day_offset, hours=random.randint(9, 20))
                
                # Create sale
                sale = Sale(
                    warehouse=warehouse,
                    total_amount=Decimal('0.00'),
                    total_items=0,
                    payment_method=random.choice([Sale.PaymentMethod.CASH, Sale.PaymentMethod.CASH, Sale.PaymentMethod.CARD]),
                    status=Sale.Status.PENDING,
                    created_by='seed_demo_data'
                )
                sale.save()
                
                # Add 1-4 items
                num_items = random.randint(1, 4)
                total = Decimal('0.00')
                items_count = 0
                
                for _ in range(min(num_items, len(variants_with_stock))):
                    # Pick random variant with stock
                    idx = random.randint(0, len(variants_with_stock) - 1)
                    variant, stock = variants_with_stock[idx]
                    
                    qty = min(random.randint(1, 3), stock)
                    if qty <= 0:
                        continue
                    
                    line_total = variant.selling_price * qty
                    
                    # Create sale item
                    SaleItem.objects.create(
                        sale=sale,
                        variant=variant,
                        quantity=qty,
                        selling_price=variant.selling_price,
                        line_total=line_total
                    )
                    
                    # Deduct stock
                    StockLedger.objects.create(
                        variant=variant,
                        warehouse=warehouse,
                        event_type=StockLedger.EventType.SALE,
                        quantity=-qty,
                        reference_type=StockLedger.ReferenceType.SALE,
                        reference_id=str(sale.id),
                        notes=f'Sale {sale.sale_number}',
                        created_by='seed_demo_data'
                    )
                    StockSnapshot.recalculate(variant, warehouse)
                    
                    # Update tracking
                    new_stock = variant.get_total_stock()
                    variants_with_stock[idx] = (variant, new_stock)
                    if new_stock <= 0:
                        variants_with_stock.pop(idx)
                    
                    total += line_total
                    items_count += qty
                
                # Update sale totals
                sale.total_amount = total
                sale.total_items = items_count
                sale.status = Sale.Status.COMPLETED
                sale.save()
                
                # Manually set created_at to past date
                Sale.objects.filter(pk=sale.pk).update(created_at=sale_date)
                
                sales.append(sale)
        
        self.stdout.write(f'✔ Sales: {len(sales)} completed sales created')
        return sales

    def create_invoices(self, sales, warehouse):
        """Create invoices for completed sales."""
        # Check if invoices already exist
        existing_invoices = Invoice.objects.filter(
            billing_name__startswith='Demo'
        ).count()
        
        if existing_invoices > 0:
            self.stdout.write(f'✔ Invoices: {existing_invoices} already exist, skipping...')
            return
        
        customer_names = [
            'Rahul Sharma', 'Priya Patel', 'Amit Kumar', 'Sneha Gupta',
            'Vikram Singh', 'Anjali Reddy', 'Arjun Nair', 'Kavya Iyer',
            'Rohan Joshi', 'Meera Krishnan', 'Walk-in Customer'
        ]
        
        invoices_created = 0
        
        for sale in sales:
            if sale.status != Sale.Status.COMPLETED:
                continue
                
            # Skip if invoice already exists
            if hasattr(sale, 'invoice') and sale.invoice:
                continue
            
            # Random discount for some invoices
            discount_type = random.choices(
                [Invoice.DiscountType.NONE, Invoice.DiscountType.PERCENTAGE],
                weights=[7, 3]
            )[0]
            
            subtotal = sale.total_amount
            discount_value = None
            discount_amount = Decimal('0.00')
            
            if discount_type == Invoice.DiscountType.PERCENTAGE:
                discount_value = Decimal(random.choice([5, 10, 15]))
                discount_amount = (subtotal * discount_value / 100).quantize(Decimal('0.01'))
            
            total = subtotal - discount_amount
            
            customer = random.choice(customer_names)
            
            invoice = Invoice(
                invoice_number=InvoiceSequence.get_next_invoice_number(),
                sale=sale,
                warehouse=warehouse,
                subtotal_amount=subtotal,
                discount_type=discount_type,
                discount_value=discount_value,
                discount_amount=discount_amount,
                total_amount=total,
                billing_name=f'Demo - {customer}',
                billing_phone=f'+91 {random.randint(70000, 99999)} {random.randint(10000, 99999)}'
            )
            invoice.save()
            
            # Create invoice items
            for sale_item in sale.items.all():
                variant_details = []
                if sale_item.variant.size:
                    variant_details.append(sale_item.variant.size)
                if sale_item.variant.color:
                    variant_details.append(sale_item.variant.color)
                
                InvoiceItem.objects.create(
                    invoice=invoice,
                    product_name=sale_item.variant.product.name,
                    variant_details=' / '.join(variant_details),
                    quantity=sale_item.quantity,
                    unit_price=sale_item.selling_price,
                    line_total=sale_item.line_total
                )
            
            invoices_created += 1
        
        self.stdout.write(f'✔ Invoices: {invoices_created} generated')
