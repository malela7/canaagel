from django.db import models
from django.utils import timezone


class Supplier(models.Model):
    class Category(models.TextChoices):
        MILK = "MILK", "Milk"
        BOTTLE = "BOTTLE", "Bottles"
        PAPER = "PAPER", "Paper bags"
        OTHER = "OTHER", "Other"

    shop = models.ForeignKey(
        "shops.Shop", on_delete=models.CASCADE, related_name="suppliers"
    )
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=20, choices=Category.choices)
    phone_number = models.CharField(max_length=20, blank=True)
    notes = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        indexes = [models.Index(fields=["shop", "category"])]

    def __str__(self):
        return f"{self.name} ({self.category})"


class SupplierDelivery(models.Model):
    """
    A delivery received from a supplier -- milk (adds to Stock), bottles,
    or paper bags (adds to PaperBagStock). Always recorded as a cost.
    """

    class Kind(models.TextChoices):
        MILK = "MILK", "Milk"
        BOTTLE = "BOTTLE", "Bottles"
        PAPER = "PAPER", "Paper bags"
        OTHER = "OTHER", "Other"

    shop = models.ForeignKey(
        "shops.Shop", on_delete=models.CASCADE, related_name="supplier_deliveries"
    )
    supplier = models.ForeignKey(
        Supplier, on_delete=models.CASCADE, related_name="deliveries"
    )
    kind = models.CharField(max_length=20, choices=Kind.choices)

    # For MILK deliveries
    milk_type = models.ForeignKey(
        "inventory.MilkType", on_delete=models.SET_NULL, null=True, blank=True
    )
    pack_size = models.ForeignKey(
        "inventory.PackSize", on_delete=models.SET_NULL, null=True, blank=True
    )

    # For PAPER deliveries
    paper_bag_stock = models.ForeignKey(
        "inventory.PaperBagStock", on_delete=models.SET_NULL, null=True, blank=True
    )

    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2)
    total_cost = models.DecimalField(max_digits=12, decimal_places=2)

    recorded_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True
    )
    delivered_at = models.DateTimeField(default=timezone.now)
    notes = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-delivered_at"]
        indexes = [models.Index(fields=["shop", "kind", "delivered_at"])]

    def __str__(self):
        return f"{self.kind} from {self.supplier.name}: {self.quantity}"
