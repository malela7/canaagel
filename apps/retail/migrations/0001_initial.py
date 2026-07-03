from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("shops", "0003_shop_shop_type"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ProductCategory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=100)),
                ("shop", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="product_categories", to="shops.shop")),
            ],
            options={"ordering": ["name"], "unique_together": {("shop", "name")}},
        ),
        migrations.CreateModel(
            name="Product",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=255)),
                ("cost_price", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("sell_price", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("wholesale_price", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("quantity", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("low_stock_threshold", models.DecimalField(decimal_places=2, default=5, max_digits=12)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("category", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="products", to="retail.productcategory")),
                ("shop", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="products", to="shops.shop")),
            ],
            options={"ordering": ["name"], "indexes": [models.Index(fields=["shop", "is_active"], name="retail_prod_shop_id_idx")]},
        ),
        migrations.CreateModel(
            name="Expense",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("description", models.CharField(max_length=255)),
                ("amount", models.DecimalField(decimal_places=2, max_digits=12)),
                ("category", models.CharField(choices=[("RENT","Rent"),("SALARY","Salary"),("UTILITIES","Utilities"),("TRANSPORT","Transport"),("SUPPLIES","Supplies"),("OTHER","Other")], default="OTHER", max_length=20)),
                ("expense_date", models.DateField(default=django.utils.timezone.now)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("recorded_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ("shop", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="expenses", to="shops.shop")),
            ],
            options={"ordering": ["-expense_date", "-created_at"], "indexes": [models.Index(fields=["shop", "expense_date"], name="retail_exp_shop_date_idx")]},
        ),
        migrations.CreateModel(
            name="StockOrder",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("supplier_name", models.CharField(blank=True, max_length=255)),
                ("status", models.CharField(choices=[("PENDING","Pending"),("RECEIVED","Received"),("CANCELLED","Cancelled")], default="PENDING", max_length=20)),
                ("total_cost", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("notes", models.TextField(blank=True)),
                ("ordered_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("received_at", models.DateTimeField(blank=True, null=True)),
                ("cancelled_at", models.DateTimeField(blank=True, null=True)),
                ("ordered_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ("shop", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="stock_orders", to="shops.shop")),
            ],
            options={"ordering": ["-ordered_at"], "indexes": [models.Index(fields=["shop", "status"], name="retail_ord_shop_status_idx")]},
        ),
        migrations.CreateModel(
            name="StockOrderItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("quantity", models.DecimalField(decimal_places=2, max_digits=12)),
                ("unit_cost", models.DecimalField(decimal_places=2, max_digits=12)),
                ("line_total", models.DecimalField(decimal_places=2, max_digits=12)),
                ("order", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="items", to="retail.stockorder")),
                ("product", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="retail.product")),
            ],
        ),
    ]
