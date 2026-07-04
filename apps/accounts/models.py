from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom user model. Every user except SUPER_ADMIN belongs to a Shop.

    Permissions for EMPLOYEE users are controlled via the related
    EmployeePermissions row -- the Shop Owner decides what each employee
    can access.
    """

    class Role(models.TextChoices):
        SUPER_ADMIN = "SUPER_ADMIN", "Super Admin"
        OWNER = "OWNER", "Shop Owner"
        EMPLOYEE = "EMPLOYEE", "Employee"

    role = models.CharField(max_length=20, choices=Role.choices)
    shop = models.ForeignKey(
        "shops.Shop",
        on_delete=models.CASCADE,
        related_name="users",
        null=True,
        blank=True,
        help_text="Null for SUPER_ADMIN. Required for OWNER/EMPLOYEE.",
    )
    phone_number = models.CharField(max_length=20, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["shop", "role"]),
        ]

    def __str__(self):
        return f"{self.username} ({self.role})"


class EmployeePermissions(models.Model):
    """
    Per-employee feature toggles, set by the Shop Owner.
    Owners always have full access regardless of these flags.
    """

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="permissions"
    )
    can_use_pos = models.BooleanField(default=True)
    can_view_inventory = models.BooleanField(default=True)
    can_manage_inventory = models.BooleanField(default=False)
    can_manage_suppliers = models.BooleanField(default=False)
    can_manage_customers = models.BooleanField(default=True)
    can_view_reports = models.BooleanField(default=False)
    can_manage_delivery = models.BooleanField(default=True)
    can_record_payments = models.BooleanField(default=True)

    def __str__(self):
        return f"Permissions for {self.user.username}"
