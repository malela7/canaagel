from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0002_initial"),
        ("shops", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="ShopProduct",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=255)),
                ("cost_price", models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ("sell_price", models.DecimalField(decimal_places=2, max_digits=10)),
                ("stock_quantity", models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("shop", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="shop_products", to="shops.shop")),
            ],
            options={"ordering": ["name"], "unique_together": {("shop", "name")}},
        ),
    ]
