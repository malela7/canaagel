from django.db import models
from django.utils import timezone


class Customer(models.Model):
    class PaymentSchedule(models.TextChoices):
        CASH = "CASH", "Cash (pay on delivery)"
        WEEKLY = "WEEKLY", "Weekly credit"
        MONTHLY = "MONTHLY", "Monthly credit"

    class DeliveryFrequency(models.TextChoices):
        DAILY = "DAILY", "Daily"
        WEEKDAYS = "WEEKDAYS", "Weekdays only"
        CUSTOM = "CUSTOM", "Custom days"
        NONE = "NONE", "No standing delivery"

    shop = models.ForeignKey(
        "shops.Shop", on_delete=models.CASCADE, related_name="customers"
    )
    name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20, blank=True)
    address = models.CharField(max_length=255, blank=True)
    house_number = models.CharField(max_length=50, blank=True)

    is_walk_in = models.BooleanField(default=False)
    bottle_tracking = models.BooleanField(
        default=False,
        help_text="If true, bottles given to this customer are tracked and must be collected back.",
    )
    bottles_out = models.IntegerField(default=0)

    payment_schedule = models.CharField(
        max_length=20, choices=PaymentSchedule.choices, default=PaymentSchedule.CASH
    )
    debt_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Delivery schedule
    delivery_frequency = models.CharField(
        max_length=20, choices=DeliveryFrequency.choices, default=DeliveryFrequency.NONE
    )
    delivery_days = models.CharField(
        max_length=50,
        blank=True,
        help_text="Comma-separated weekday numbers (0=Mon..6=Sun) for CUSTOM frequency.",
    )

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["shop", "is_active"]),
            models.Index(fields=["shop", "delivery_frequency"]),
        ]

    def __str__(self):
        return self.name


class StandingOrderItem(models.Model):
    """What a customer normally receives on a delivery day (used to build the daily list)."""

    customer = models.ForeignKey(
        Customer, on_delete=models.CASCADE, related_name="standing_items"
    )
    milk_type = models.ForeignKey("inventory.MilkType", on_delete=models.CASCADE)
    pack_size = models.ForeignKey("inventory.PackSize", on_delete=models.CASCADE)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        unique_together = ("customer", "milk_type", "pack_size")

    def __str__(self):
        return f"{self.customer}: {self.quantity} x {self.milk_type}/{self.pack_size}"


class Order(models.Model):
    class PaymentStatus(models.TextChoices):
        PAID = "PAID", "Paid"
        UNPAID = "UNPAID", "Unpaid"
        CANCELLED = "CANCELLED", "Cancelled"

    class PaymentMethod(models.TextChoices):
        CASH = "CASH", "Cash"
        MPESA = "MPESA", "M-Pesa"
        BANK = "BANK", "Bank"
        OTHER = "OTHER", "Other"

    shop = models.ForeignKey(
        "shops.Shop", on_delete=models.CASCADE, related_name="orders"
    )
    customer = models.ForeignKey(
        Customer, on_delete=models.CASCADE, related_name="orders", null=True, blank=True
    )
    is_walk_in = models.BooleanField(default=False)

    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_status = models.CharField(
        max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.UNPAID
    )
    payment_method = models.CharField(
        max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.CASH
    )

    paper_bags_used = models.IntegerField(default=0)
    bottles_given = models.IntegerField(
        default=0, help_text="Bottles handed out with this order."
    )
    bottles_collected = models.IntegerField(
        default=0, help_text="Empty bottles collected back from the customer."
    )

    created_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True
    )
    created_at = models.DateTimeField(default=timezone.now)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["shop", "created_at"]),
            models.Index(fields=["shop", "payment_status"]),
            models.Index(fields=["customer", "created_at"]),
        ]

    def __str__(self):
        who = self.customer.name if self.customer else "Walk-in"
        return f"Order #{self.pk} - {who} - {self.total_amount}"


class OrderItem(models.Model):
    """unit_price is a permanent snapshot taken at order-creation time."""

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    milk_type = models.ForeignKey("inventory.MilkType", on_delete=models.CASCADE)
    pack_size = models.ForeignKey("inventory.PackSize", on_delete=models.CASCADE)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    line_total = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"{self.quantity} x {self.milk_type}/{self.pack_size} @ {self.unit_price}"


class CustomerPayment(models.Model):
    """A payment made by a customer towards their debt_balance."""

    class Method(models.TextChoices):
        CASH = "CASH", "Cash"
        MPESA = "MPESA", "M-Pesa"
        BANK = "BANK", "Bank"
        OTHER = "OTHER", "Other"

    shop = models.ForeignKey(
        "shops.Shop", on_delete=models.CASCADE, related_name="customer_payments"
    )
    customer = models.ForeignKey(
        Customer, on_delete=models.CASCADE, related_name="payments"
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    method = models.CharField(max_length=20, choices=Method.choices, default=Method.CASH)
    reference = models.CharField(max_length=100, blank=True)
    recorded_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True
    )
    paid_at = models.DateTimeField(default=timezone.now)
    note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-paid_at"]
        indexes = [models.Index(fields=["shop", "customer", "paid_at"])]

    def __str__(self):
        return f"{self.customer}: {self.amount} on {self.paid_at:%Y-%m-%d}"
