from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0014_supplier_barcode_tracking'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='brand_code',
            field=models.CharField(
                blank=True,
                help_text="Brand's internal article/style code for this product (printed on barcode label)",
                max_length=100,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='product',
            name='alias',
            field=models.CharField(
                blank=True,
                help_text='Alternative name or style identifier (printed on barcode label if provided)',
                max_length=255,
                null=True,
            ),
        ),
    ]
