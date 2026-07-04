from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("sales", "0003_customer_house_number"),
        ("inventory", "0003_shopproduct"),
        ("shops", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ProductSale",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("is_walk_in", models.BooleanField(default=False)),
                ("total_amount", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("payment_status", models.CharField(
                    choices=[("PAID", "Paid"), ("UNPAID", "Unpaid (added to customer bill)"), ("CANCELLED", "Cancelled")],
                    default="PAID", max_length=20,
                )),
                ("payment_method", models.CharField(
                    choices=[("CASH", "Cash"), ("MPESA", "M-Pesa"), ("BANK", "Bank"), ("OTHER", "Other")],
                    default="CASH", max_length=20,
                )),
                ("note", models.CharField(blank=True, max_length=255)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("shop", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="product_sales", to="shops.shop")),
                ("customer", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="product_sales", to="sales.customer")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="productsale",
            index=models.Index(fields=["shop", "created_at"], name="sales_prods_shop_id_createdat_idx"),
        ),
        migrations.AddIndex(
            model_name="productsale",
            index=models.Index(fields=["shop", "payment_status"], name="sales_prods_shop_id_paystatus_idx"),
        ),
        migrations.CreateModel(
            name="ProductSaleItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("quantity", models.DecimalField(decimal_places=2, max_digits=10)),
                ("unit_price", models.DecimalField(decimal_places=2, max_digits=10)),
                ("line_total", models.DecimalField(decimal_places=2, max_digits=12)),
                ("sale", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="items", to="sales.productsale")),
                ("product", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="inventory.shopproduct")),
            ],
        ),
    ]
