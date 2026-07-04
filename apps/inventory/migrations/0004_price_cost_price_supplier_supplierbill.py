from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0003_shopproduct"),
        ("shops", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="price",
            name="cost_price",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
        migrations.CreateModel(
            name="Supplier",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=200)),
                ("phone", models.CharField(blank=True, max_length=30)),
                ("note", models.CharField(blank=True, max_length=300)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("shop", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="suppliers", to="shops.shop")),
            ],
            options={
                "ordering": ["name"],
                "unique_together": {("shop", "name")},
            },
        ),
        migrations.CreateModel(
            name="SupplierBill",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date", models.DateField()),
                ("total_amount", models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ("amount_paid", models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ("note", models.CharField(blank=True, max_length=300)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("supplier", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="bills", to="inventory.supplier")),
            ],
            options={
                "ordering": ["-date"],
            },
        ),
    ]
