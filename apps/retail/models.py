from django.conf import settings
from django.db import models
from django.utils import timezone


class ProductCategory(models.Model):
    shop = models.ForeignKey("shops.Shop", on_delete=models.CASCADE, related_name="product_categories")
    name = models.CharField(max_length=100)

    class Meta:
        unique_together = ("shop", "name")
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.shop.name})"


class Product(models.Model):
    shop = models.ForeignKey("shops.Shop", on_delete=models.CASCADE, related_name="products")
    category = models.ForeignKey(ProductCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name="products")
    name = models.CharField(max_length=255)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sell_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    wholesale_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    low_stock_threshold = models.DecimalField(max_digits=12, decimal_places=2, default=5)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [models.Index(fields=["shop", "is_active"])]

    def __str__(self):
        return f"{self.name} ({self.shop.name})"

    @property
    def is_low(self):
        return self.quantity <= self.low_stock_threshold


class Expense(models.Model):
    class Category(models.TextChoices):
        RENT = "RENT", "Rent"
        SALARY = "SALARY", "Salary"
        UTILITIES = "UTILITIES", "Utilities"
        TRANSPORT = "TRANSPORT", "Transport"
        SUPPLIES = "SUPPLIES", "Supplies"
        OTHER = "OTHER", "Other"

    shop = models.ForeignKey("shops.Shop", on_delete=models.CASCADE, related_name="expenses")
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.OTHER)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    expense_date = models.DateField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-expense_date", "-created_at"]
        indexes = [models.Index(fields=["shop", "expense_date"])]

    def __str__(self):
        return f"{self.description}: {self.amount} on {self.expense_date}"


class StockOrder(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        RECEIVED = "RECEIVED", "Received"
        CANCELLED = "CANCELLED", "Cancelled"

    shop = models.ForeignKey("shops.Shop", on_delete=models.CASCADE, related_name="stock_orders")
    supplier_name = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    ordered_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    ordered_at = models.DateTimeField(default=timezone.now)
    received_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-ordered_at"]
        indexes = [models.Index(fields=["shop", "status"])]

    def __str__(self):
        return f"Order #{self.pk} ({self.status}) - {self.shop.name}"


class StockOrderItem(models.Model):
    order = models.ForeignKey(StockOrder, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2)
    line_total = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"{self.quantity} x {self.product.name} @ {self.unit_cost}"
