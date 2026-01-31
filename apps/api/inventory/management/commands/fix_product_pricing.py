"""
Management command to fix products without pricing records.

Usage:
    python manage.py fix_product_pricing --dry-run  # Preview changes
    python manage.py fix_product_pricing             # Actually fix

This will add default ProductPricing records for all products that don't have one.
"""

from django.core.management.base import BaseCommand
from decimal import Decimal
from inventory.models import Product, ProductPricing


class Command(BaseCommand):
    help = 'Add ProductPricing records to products that are missing them'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview changes without making them',
        )
        parser.add_argument(
            '--default-cost',
            type=Decimal,
            default=Decimal('0.00'),
            help='Default cost price for products without pricing',
        )
        parser.add_argument(
            '--default-mrp',
            type=Decimal,
            default=Decimal('0.00'),
            help='Default MRP for products without pricing',
        )
        parser.add_argument(
            '--default-selling',
            type=Decimal,
            default=Decimal('0.00'),
            help='Default selling price for products without pricing',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        default_cost = options['default_cost']
        default_mrp = options['default_mrp']
        default_selling = options['default_selling']

        # Find all products without pricing
        products_without_pricing = Product.objects.filter(
            pricing__isnull=True
        )

        total = products_without_pricing.count()
        
        if total == 0:
            self.stdout.write(
                self.style.SUCCESS('All products already have pricing records!')
            )
            return

        self.stdout.write(f'Found {total} products without pricing records:')
        
        for product in products_without_pricing:
            self.stdout.write(f'  - {product.name} (ID: {product.id})')

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'\nDRY RUN: Would create {total} ProductPricing records with defaults:'
                    f'\n  cost_price: {default_cost}'
                    f'\n  mrp: {default_mrp}'
                    f'\n  selling_price: {default_selling}'
                    f'\n\nRun without --dry-run to apply changes.'
                )
            )
            return

        # Create pricing records
        created_count = 0
        for product in products_without_pricing:
            ProductPricing.objects.create(
                product=product,
                cost_price=default_cost,
                mrp=default_mrp,
                selling_price=default_selling,
                gst_percentage=Decimal('0.00'),
            )
            created_count += 1
            self.stdout.write(f'  Created pricing for: {product.name}')

        self.stdout.write(
            self.style.SUCCESS(
                f'\nSuccessfully created {created_count} ProductPricing records.'
                f'\nNote: All prices set to defaults. Update them via the API or admin.'
            )
        )
