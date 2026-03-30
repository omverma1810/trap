from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0015_product_brand_code_alias'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='product_code',
            field=models.CharField(
                blank=True,
                help_text='Human-readable product code (shown in label as [code] after product name and beneath barcode bars)',
                max_length=100,
                null=True,
            ),
        ),
    ]
