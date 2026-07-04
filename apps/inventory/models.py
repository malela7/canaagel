from django.conf import settings
from django.db import models
from django.utils import timezone


class MilkType(models.Model):
    """e.g. Cow, Goat, Camel -- per shop so owners can name/disable as needed."""

    shop = models.ForeignKey(
        "shops.Shop", on_delete=models.CASCADE, related_name="milk_types"
    )
    name = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("shop", "name")

    def __str__(self):
        return f"{self.name} ({self.shop.name})"


class PackSize(models.Model):
    """e.g. 500ml, 1L, 5L."""

    shop = models.ForeignKey(
        "shops.Shop", on_delete=models.CASCADE, related_name="pack_sizes"
    )
    label = models.CharField(max_length=50)
    litres = models.DecimalField(max_digits=6, decimal_places=3)

    class Meta:
        unique_together = ("shop", "label")

    def __str__(self):
        return f"{self.label} ({self.shop.name})"


class Price(models.Model):
    """
    Price for a milk_type + pack_size combo. Setting a new price for the
    same combo automatically closes the previous one (is_current=False,
    valid_to set) -- see apps/inventory/services.py.
    """

    shop = models.ForeignKey(
        "shops.Shop", on_delete=models.CASCADE, related_name="prices"
    )
    milk_type = models.ForeignKey(
        MilkType, on_delete=models.CASCADE, related_name="prices"
    )
    pack_size = models.ForeignKey(
        PackSize, on_delete=models.CASCADE, related_name="prices"
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_current = models.BooleanField(default=True)
    valid_from = models.DateTimeField(default=timezone.now)
    valid_to = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-valid_from"]
        indexes = [
            models.Index(fields=["shop", "milk_type", "pack_size", "is_current"]),
        ]

    def __str__(self):
        return f"{self.milk_type} {self.pack_size} = {self.amount}"


class CustomerPrice(models.Model):
    """A special (override) price for a specific customer + milk_type + pack_size."""

    shop = models.ForeignKey(
        "shops.Shop", on_delete=models.CASCADE, related_name="customer_prices"
    )
    customer = models.ForeignKey(
        "sales.Customer", on_delete=models.CASCADE, related_name="special_prices"
    )
    milk_type = models.ForeignKey(MilkType, on_delete=models.CASCADE)
    pack_size = models.ForeignKey(PackSize, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    is_current = models.BooleanField(default=True)
    valid_from = models.DateTimeField(default=timezone.now)
    valid_to = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-valid_from"]
        indexes = [
            models.Index(
                fields=["shop", "customer", "milk_type", "pack_size", "is_current"]
            ),
        ]

    def __str__(self):
        return f"{self.customer} special: {self.milk_type} {self.pack_size} = {self.amount}"


class Stock(models.Model):
    """Current stock quantity for a milk_type + pack_size combo."""

    shop = models.ForeignKey(
        "shops.Shop", on_delete=models.CASCADE, related_name="stock_items"
    )
    milk_type = models.ForeignKey(
        MilkType, on_delete=models.CASCADE, related_name="stock_items"
    )
    pack_size = models.ForeignKey(
        PackSize, on_delete=models.CASCADE, related_name="stock_items"
    )
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    low_stock_threshold = models.DecimalField(
        max_digits=10, decimal_places=2, default=0
    )

    class Meta:
        unique_together = ("shop", "milk_type", "pack_size")

    def __str__(self):
        return f"{self.milk_type} {self.pack_size}: {self.quantity}"

    @property
    def is_low(self) -> bool:
        return self.quantity <= self.low_stock_threshold


class ShopProduct(models.Model):
    """General products a shop sells beyond milk (e.g. bread, sugar)."""

    shop = models.ForeignKey(
        "shops.Shop", on_delete=models.CASCADE, related_name="shop_products"
    )
    name = models.CharField(max_length=255)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sell_price = models.DecimalField(max_digits=10, decimal_places=2)
    stock_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        unique_together = ("shop", "name")

    def __str__(self):
        return f"{self.name} ({self.shop.name})"

    @property
    def profit_margin(self):
        if self.cost_price and self.cost_price > 0:
            return round((self.sell_price - self.cost_price) / self.cost_price * 100, 1)
        return None


class Supplier(models.Model):
    """Milk supplier — a person or company that delivers milk to the shop."""

    shop = models.ForeignKey(
        "shops.Shop", on_delete=models.CASCADE, related_name="suppliers"
    )
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=30, blank=True)
    note = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        unique_together = ("shop", "name")

    def __str__(self):
        return f"{self.name} ({self.shop.name})"


class SupplierBill(models.Model):
    """A delivery / bill from a supplier. Tracks what was delivered and how much is owed."""

    supplier = models.ForeignKey(
        Supplier, on_delete=models.CASCADE, related_name="bills"
    )
    date = models.DateField()
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    note = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"{self.supplier.name} bill {self.date} KES {self.total_amount}"

    @property
    def balance(self):
        return self.total_amount - self.amount_paid


class PaperBagStock(models.Model):
    """
    Paper bags are packaging, not a product. One running stock count per
    shop (optionally per size). Deducted via Order.paper_bags_used.
    """

    shop = models.ForeignKey(
        "shops.Shop", on_delete=models.CASCADE, related_name="paper_bag_stocks"
    )
    label = models.CharField(max_length=50, default="Standard")
    quantity = models.IntegerField(default=0)
    low_stock_threshold = models.IntegerField(default=0)

    class Meta:
        unique_together = ("shop", "label")

    def __str__(self):
        return f"Paper bags ({self.label}): {self.quantity}"

    @property
    def is_low(self) -> bool:
        return self.quantity <= self.low_stock_threshold
