from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("sales", "0002_order_payment_method")]

    operations = [
        migrations.AddField(
            model_name="customer",
            name="house_number",
            field=models.CharField(blank=True, max_length=50),
        ),
    ]
