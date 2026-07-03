from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("shops", "0002_shop_plan_monthly_fee"),
    ]

    operations = [
        migrations.AddField(
            model_name="shop",
            name="shop_type",
            field=models.CharField(
                choices=[("MILK", "Milk Shop"), ("GENERAL", "General Retail")],
                default="MILK",
                max_length=20,
            ),
        ),
    ]
