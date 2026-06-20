from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='payment_method',
            field=models.CharField(
                choices=[('CASH', 'Cash'), ('MPESA', 'M-Pesa'), ('BANK', 'Bank'), ('OTHER', 'Other')],
                default='CASH',
                max_length=20,
            ),
        ),
    ]
