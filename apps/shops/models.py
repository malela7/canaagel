from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone


class Shop(models.Model):
    """A single tenant. All shop-scoped models have a FK to Shop."""

    class Status(models.TextChoices):
        TRIAL = "TRIAL", "Trial"
        ACTIVE = "ACTIVE", "Active"
        SUSPENDED = "SUSPENDED", "Suspended"
        EXPIRED = "EXPIRED", "Expired"

    name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20, blank=True)
    address = models.CharField(max_length=255, blank=True)

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.TRIAL
    )
    trial_ends_at = models.DateTimeField()
    current_period_end = models.DateTimeField(null=True, blank=True)
    suspended_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.pk and not self.trial_ends_at:
            self.trial_ends_at = timezone.now() + timedelta(
                days=settings.TRIAL_PERIOD_DAYS
            )
        super().save(*args, **kwargs)

    @property
    def is_blocked(self) -> bool:
        return self.status in (self.Status.SUSPENDED, self.Status.EXPIRED)


class SubscriptionPayment(models.Model):
    """A payment recorded against a shop's subscription (manual or M-Pesa)."""

    class Method(models.TextChoices):
        MPESA = "MPESA", "M-Pesa"
        CASH = "CASH", "Cash"
        BANK = "BANK", "Bank"
        OTHER = "OTHER", "Other"

    shop = models.ForeignKey(
        Shop, on_delete=models.CASCADE, related_name="subscription_payments"
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    method = models.CharField(max_length=20, choices=Method.choices, default=Method.MPESA)
    mpesa_receipt_number = models.CharField(max_length=50, blank=True)
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recorded_subscription_payments",
        help_text="Null when recorded automatically via M-Pesa callback.",
    )
    note = models.CharField(max_length=255, blank=True)
    paid_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-paid_at"]
        indexes = [
            models.Index(fields=["shop", "paid_at"]),
        ]

    def __str__(self):
        return f"{self.shop.name} - {self.amount} on {self.paid_at:%Y-%m-%d}"


class MpesaSTKRequest(models.Model):
    """Tracks an outstanding STK Push request until the callback arrives."""

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        SUCCESS = "SUCCESS", "Success"
        FAILED = "FAILED", "Failed"

    shop = models.ForeignKey(
        Shop, on_delete=models.CASCADE, related_name="mpesa_stk_requests"
    )
    checkout_request_id = models.CharField(max_length=100, unique=True)
    merchant_request_id = models.CharField(max_length=100, blank=True)
    phone_number = models.CharField(max_length=20)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    result_description = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"STK {self.checkout_request_id} ({self.status})"
