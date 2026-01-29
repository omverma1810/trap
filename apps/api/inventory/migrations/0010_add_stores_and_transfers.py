# Generated migration for Store Management module

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('inventory', '0009_add_purchase_orders'),
    ]

    operations = [
        # Create Store model
        migrations.CreateModel(
            name='Store',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(help_text='Store name', max_length=150, unique=True)),
                ('code', models.CharField(blank=True, help_text='Short code for store (auto-generated if blank)', max_length=20, unique=True)),
                ('address', models.TextField(help_text='Full street address')),
                ('city', models.CharField(help_text='City', max_length=100)),
                ('state', models.CharField(help_text='State/Province', max_length=100)),
                ('pincode', models.CharField(help_text='Postal/ZIP code', max_length=10)),
                ('phone', models.CharField(help_text='Store phone number', max_length=20)),
                ('email', models.EmailField(blank=True, default='', help_text='Store email address', max_length=254)),
                ('operator_phone', models.CharField(blank=True, default='', help_text="Operator's personal phone number", max_length=20)),
                ('low_stock_threshold', models.PositiveIntegerField(default=10, help_text='Alert when product stock falls below this level')),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('operator', models.ForeignKey(blank=True, help_text='Store operator/manager in charge', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='managed_stores', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Store',
                'verbose_name_plural': 'Stores',
                'ordering': ['name'],
            },
        ),
        # Add indexes for Store
        migrations.AddIndex(
            model_name='store',
            index=models.Index(fields=['code'], name='inventory_s_code_8a8c3d_idx'),
        ),
        migrations.AddIndex(
            model_name='store',
            index=models.Index(fields=['city'], name='inventory_s_city_9c1e4f_idx'),
        ),
        migrations.AddIndex(
            model_name='store',
            index=models.Index(fields=['is_active'], name='inventory_s_is_acti_a2b3c5_idx'),
        ),
        
        # Create StockTransfer model
        migrations.CreateModel(
            name='StockTransfer',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('transfer_number', models.CharField(help_text='Transfer reference number: TRF-YYYY-NNNNNN', max_length=50, unique=True)),
                ('status', models.CharField(choices=[('PENDING', 'Pending'), ('IN_TRANSIT', 'In Transit'), ('COMPLETED', 'Completed'), ('CANCELLED', 'Cancelled')], default='PENDING', max_length=20)),
                ('transfer_date', models.DateField(help_text='Date transfer was initiated')),
                ('dispatch_date', models.DateField(blank=True, help_text='Date stock was dispatched from warehouse', null=True)),
                ('received_date', models.DateField(blank=True, help_text='Date stock was received at store', null=True)),
                ('notes', models.TextField(blank=True, default='', help_text='Additional notes')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('source_warehouse', models.ForeignKey(help_text='Warehouse from which stock is transferred', on_delete=django.db.models.deletion.PROTECT, related_name='outgoing_transfers', to='inventory.warehouse')),
                ('destination_store', models.ForeignKey(help_text='Store receiving the stock', on_delete=django.db.models.deletion.PROTECT, related_name='incoming_transfers', to='inventory.store')),
                ('created_by', models.ForeignKey(help_text='User who created this transfer', on_delete=django.db.models.deletion.PROTECT, related_name='created_transfers', to=settings.AUTH_USER_MODEL)),
                ('dispatched_by', models.ForeignKey(blank=True, help_text='User who dispatched this transfer', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='dispatched_transfers', to=settings.AUTH_USER_MODEL)),
                ('received_by', models.ForeignKey(blank=True, help_text='User who received this transfer at store', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='received_transfers', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Stock Transfer',
                'verbose_name_plural': 'Stock Transfers',
                'ordering': ['-created_at'],
            },
        ),
        # Add indexes for StockTransfer
        migrations.AddIndex(
            model_name='stocktransfer',
            index=models.Index(fields=['transfer_number'], name='inventory_s_transfe_d4e5f6_idx'),
        ),
        migrations.AddIndex(
            model_name='stocktransfer',
            index=models.Index(fields=['status'], name='inventory_s_status_g7h8i9_idx'),
        ),
        migrations.AddIndex(
            model_name='stocktransfer',
            index=models.Index(fields=['source_warehouse'], name='inventory_s_source__j1k2l3_idx'),
        ),
        migrations.AddIndex(
            model_name='stocktransfer',
            index=models.Index(fields=['destination_store'], name='inventory_s_destin_m4n5o6_idx'),
        ),
        migrations.AddIndex(
            model_name='stocktransfer',
            index=models.Index(fields=['transfer_date'], name='inventory_s_transfe_p7q8r9_idx'),
        ),
        
        # Create StockTransferItem model
        migrations.CreateModel(
            name='StockTransferItem',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('quantity', models.PositiveIntegerField(help_text='Quantity to transfer', validators=[django.core.validators.MinValueValidator(1)])),
                ('received_quantity', models.PositiveIntegerField(default=0, help_text='Quantity actually received at store')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('transfer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='inventory.stocktransfer')),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='transfer_items', to='inventory.product')),
            ],
            options={
                'verbose_name': 'Stock Transfer Item',
                'verbose_name_plural': 'Stock Transfer Items',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='stocktransferitem',
            constraint=models.UniqueConstraint(fields=('transfer', 'product'), name='unique_product_per_transfer'),
        ),
        
        # Add store field to InventoryMovement
        migrations.AddField(
            model_name='inventorymovement',
            name='store',
            field=models.ForeignKey(blank=True, help_text='Store for this movement (for store-level inventory tracking)', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='inventory_movements', to='inventory.store'),
        ),
        # Add index for store on InventoryMovement
        migrations.AddIndex(
            model_name='inventorymovement',
            index=models.Index(fields=['product', 'store'], name='inventory_i_product_store_idx'),
        ),
    ]
