from django.db import models
from django.utils import timezone


class Transporter(models.Model):
    """
    Not a system user -- no login, no app access. Exists only as a record
    for assigning deliveries and tracking what they're paid.
    """

    shop = models.ForeignKey(
        "shops.Shop", on_delete=models.CASCADE, related_name="transporters"
    )
    name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class TransporterPayment(models.Model):
    shop = models.ForeignKey(
        "shops.Shop", on_delete=models.CASCADE, related_name="transporter_payments"
    )
    transporter = models.ForeignKey(
        Transporter, on_delete=models.CASCADE, related_name="payments"
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    paid_at = models.DateTimeField(default=timezone.now)
    note = models.CharField(max_length=255, blank=True)
    recorded_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True
    )

    class Meta:
        ordering = ["-paid_at"]

    def __str__(self):
        return f"{self.transporter}: {self.amount} on {self.paid_at:%Y-%m-%d}"


class DeliveryRecord(models.Model):
    """
    One row per customer per day on the auto-generated delivery list.
    Owner/employee mark it done after briefing/handing to the transporter.
    """

    shop = models.ForeignKey(
        "shops.Shop", on_delete=models.CASCADE, related_name="delivery_records"
    )
    customer = models.ForeignKey(
        "sales.Customer", on_delete=models.CASCADE, related_name="delivery_records"
    )
    transporter = models.ForeignKey(
        Transporter,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="delivery_records",
    )
    delivery_date = models.DateField()
    order = models.ForeignKey(
        "sales.Order",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="delivery_records",
        help_text="Linked once the order for this delivery is created.",
    )
    is_completed = models.BooleanField(default=False)
    notes = models.CharField(max_length=255, blank=True)

    class Meta:
        unique_together = ("shop", "customer", "delivery_date")
        ordering = ["delivery_date"]
        indexes = [models.Index(fields=["shop", "delivery_date"])]

    def __str__(self):
        return f"{self.customer} - {self.delivery_date}"
