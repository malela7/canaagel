from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("shops", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="shop",
            name="plan",
            field=models.CharField(
                max_length=20,
                choices=[
                    ("TRIAL", "Trial (Free)"),
                    ("BASIC", "Basic"),
                    ("STANDARD", "Standard"),
                    ("PREMIUM", "Premium"),
                ],
                default="TRIAL",
            ),
        ),
        migrations.AddField(
            model_name="shop",
            name="monthly_fee",
            field=models.DecimalField(max_digits=10, decimal_places=2, default=0),
        ),
    ]
