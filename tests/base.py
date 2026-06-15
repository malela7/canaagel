from django.utils import timezone
from rest_framework.test import APITestCase

from apps.accounts.models import EmployeePermissions, User
from apps.shops.models import Shop


class BaseAPITestCase(APITestCase):
    """
    Common fixtures used across the test suite:
      - an ACTIVE shop
      - a SUPER_ADMIN (not tied to any shop)
      - an OWNER for the shop
      - an EMPLOYEE for the shop with default permissions
    Each test logs in as the relevant user via JWT.
    """

    def setUp(self):
        self.shop = Shop.objects.create(name="Test Shop", phone_number="2547000000")
        self.shop.status = Shop.Status.ACTIVE
        self.shop.current_period_end = timezone.now() + timezone.timedelta(days=30)
        self.shop.save()

        self.super_admin = User.objects.create_superuser(
            username="superadmin", email="super@example.com", password="Sup3rSecret!",
            role=User.Role.SUPER_ADMIN,
        )

        self.owner = User.objects.create_user(
            username="owner", password="OwnerSecret!",
            role=User.Role.OWNER, shop=self.shop,
        )

        self.employee = User.objects.create_user(
            username="employee", password="EmployeeSecret!",
            role=User.Role.EMPLOYEE, shop=self.shop,
        )
        self.employee_permissions = EmployeePermissions.objects.create(user=self.employee)

    def login_as(self, user, password):
        response = self.client.post(
            "/api/v1/auth/login/", {"username": user.username, "password": password},
        )
        token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        return token

    def login_as_owner(self):
        return self.login_as(self.owner, "OwnerSecret!")

    def login_as_employee(self):
        return self.login_as(self.employee, "EmployeeSecret!")

    def login_as_super_admin(self):
        return self.login_as(self.super_admin, "Sup3rSecret!")
