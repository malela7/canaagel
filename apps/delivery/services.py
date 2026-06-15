from django.utils import timezone

from apps.sales.models import Customer

from .models import DeliveryRecord


def generate_daily_delivery_list(*, shop, delivery_date=None):
    """
    Build (or fetch) today's delivery list from each active customer's
    standing schedule. Idempotent -- existing records for the date are kept.
    """
    delivery_date = delivery_date or timezone.localdate()
    weekday = delivery_date.weekday()  # 0=Mon..6=Sun

    customers = Customer.objects.filter(shop=shop, is_active=True).exclude(
        delivery_frequency=Customer.DeliveryFrequency.NONE
    )

    for customer in customers:
        due = False
        if customer.delivery_frequency == Customer.DeliveryFrequency.DAILY:
            due = True
        elif customer.delivery_frequency == Customer.DeliveryFrequency.WEEKDAYS:
            due = weekday < 5
        elif customer.delivery_frequency == Customer.DeliveryFrequency.CUSTOM:
            days = [int(d) for d in customer.delivery_days.split(",") if d.strip().isdigit()]
            due = weekday in days

        if due:
            DeliveryRecord.objects.get_or_create(
                shop=shop, customer=customer, delivery_date=delivery_date,
            )

    return DeliveryRecord.objects.filter(shop=shop, delivery_date=delivery_date).select_related(
        "customer", "transporter"
    ).prefetch_related("customer__standing_items")
