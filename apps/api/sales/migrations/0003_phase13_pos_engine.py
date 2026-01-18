# Generated manually for Phase 13: POS Engine
# This migration transforms the sales models for Phase 13

from decimal import Decimal
import django.core.validators
from django.db import migrations, models
from django.conf import settings
import django.db.models.deletion
import uuid


def generate_invoice_numbers(apps, schema_editor):
    """Generate invoice numbers for existing sales."""
    Sale = apps.get_model('sales', 'Sale')
    for idx, sale in enumerate(Sale.objects.all().order_by('created_at'), start=1):
        sale.invoice_number = f"INV-2026-{idx:06d}"
        sale.save(update_fields=['invoice_number'])


def copy_sale_number_to_invoice(apps, schema_editor):
    """Copy sale_number to invoice_number for existing sales."""
    Sale = apps.get_model('sales', 'Sale')
    for sale in Sale.objects.all():
        # Convert SALE-YYYYMMDD-XXXX to INV-YYYY-NNNNNN format
        sale.invoice_number = sale.sale_number.replace('SALE-', 'INV-')[:20]
        sale.save(update_fields=['invoice_number'])


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0002_add_idempotency_and_status_lifecycle'),
        ('inventory', '0007_phase12_warehouse_normalization'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # 1. Create InvoiceSequence model
        migrations.CreateModel(
            name='InvoiceSequence',
            fields=[
                ('year', models.PositiveIntegerField(primary_key=True, serialize=False, unique=True)),
                ('last_number', models.PositiveIntegerField(default=0)),
            ],
            options={
                'verbose_name': 'Invoice Sequence',
                'verbose_name_plural': 'Invoice Sequences',
            },
        ),
        
        # 2. Create Payment model
        migrations.CreateModel(
            name='Payment',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('method', models.CharField(choices=[('CASH', 'Cash'), ('CARD', 'Card'), ('UPI', 'UPI')], max_length=20)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12, validators=[django.core.validators.MinValueValidator(Decimal('0.01'))])),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('sale', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='payments', to='sales.sale')),
            ],
            options={
                'verbose_name': 'Payment',
                'verbose_name_plural': 'Payments',
                'ordering': ['created_at'],
            },
        ),
        
        # 3. Add new fields to Sale with defaults
        migrations.AddField(
            model_name='sale',
            name='invoice_number',
            field=models.CharField(default='INV-0000-000000', help_text='Sequential invoice number: INV-YYYY-NNNNNN', max_length=50),
            preserve_default=False,
        ),
        
        migrations.AddField(
            model_name='sale',
            name='customer_name',
            field=models.CharField(blank=True, default='', help_text='Optional customer name', max_length=255),
        ),
        
        migrations.AddField(
            model_name='sale',
            name='subtotal',
            field=models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=12, validators=[django.core.validators.MinValueValidator(Decimal('0.00'))]),
            preserve_default=False,
        ),
        
        migrations.AddField(
            model_name='sale',
            name='discount_type',
            field=models.CharField(blank=True, choices=[('PERCENT', 'Percent'), ('FLAT', 'Flat')], max_length=10, null=True),
        ),
        
        migrations.AddField(
            model_name='sale',
            name='discount_value',
            field=models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=10, validators=[django.core.validators.MinValueValidator(Decimal('0.00'))]),
        ),
        
        migrations.AddField(
            model_name='sale',
            name='total',
            field=models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=12, validators=[django.core.validators.MinValueValidator(Decimal('0.00'))]),
            preserve_default=False,
        ),
        
        # 4. Data migration: Generate invoice numbers for existing sales
        migrations.RunPython(generate_invoice_numbers, migrations.RunPython.noop),
        
        # 5. Copy total_amount to subtotal and total for existing data
        migrations.RunSQL(
            "UPDATE sales_sale SET subtotal = total_amount, total = total_amount WHERE subtotal = 0;",
            migrations.RunSQL.noop
        ),
        
        # 6. Make invoice_number unique after data migration
        migrations.AlterField(
            model_name='sale',
            name='invoice_number',
            field=models.CharField(help_text='Sequential invoice number: INV-YYYY-NNNNNN', max_length=50, unique=True),
        ),
        
        # 7. Add product field to SaleItem (allowing null initially)
        migrations.AddField(
            model_name='saleitem',
            name='product',
            field=models.ForeignKey(help_text='Product sold (Phase 13: product-level)', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='sale_items', to='inventory.product'),
        ),
        
        # 8. Add new indexes
        migrations.AddIndex(
            model_name='sale',
            index=models.Index(fields=['invoice_number'], name='sales_sale_invoice_idx'),
        ),
        migrations.AddIndex(
            model_name='sale',
            index=models.Index(fields=['warehouse', 'created_at'], name='sales_sale_wh_created_idx'),
        ),
        
        # 9. Rename created_by from CharField to FK (requires data handling)
        # First, remove the old created_by field
        migrations.RemoveField(
            model_name='sale',
            name='created_by',
        ),
        
        # 10. Add new created_by as ForeignKey
        migrations.AddField(
            model_name='sale',
            name='created_by',
            field=models.ForeignKey(default=1, help_text='User who created the sale', on_delete=django.db.models.deletion.PROTECT, related_name='sales_created', to=settings.AUTH_USER_MODEL),
            preserve_default=False,
        ),
    ]
