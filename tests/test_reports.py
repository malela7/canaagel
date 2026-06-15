from apps.inventory.models import MilkType, PackSize, Price, Stock
from apps.sales.models import Customer

from .base import BaseAPITestCase


class ReportsTests(BaseAPITestCase):
    def setUp(self):
        super().setUp()
        self.milk_type = MilkType.objects.create(shop=self.shop, name="Cow")
        self.pack_size = PackSize.objects.create(shop=self.shop, label="1L", litres=1)
        Price.objects.create(
            shop=self.shop, milk_type=self.milk_type, pack_size=self.pack_size, amount="60.00",
        )
        Stock.objects.create(
            shop=self.shop, milk_type=self.milk_type, pack_size=self.pack_size, quantity=100,
        )

    def test_sales_report_after_order(self):
        self.login_as_employee()
        self.client.post("/api/v1/sales/orders/", {
            "is_walk_in": True,
            "items": [{"milk_type": self.milk_type.id, "pack_size": self.pack_size.id, "quantity": "5"}],
        }, format="json")

        self.login_as_owner()
        response = self.client.get("/api/v1/reports/sales/")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["total_sales"], 300)
        self.assertEqual(response.data["order_count"], 1)

    def test_debt_report(self):
        Customer.objects.create(
            shop=self.shop, name="Jane",
            payment_schedule=Customer.PaymentSchedule.WEEKLY, debt_balance="500.00",
        )
        self.login_as_owner()
        response = self.client.get("/api/v1/reports/debt/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(str(response.data["total_debt"]), "500.00")

    def test_employee_without_reports_permission_blocked(self):
        self.login_as_employee()
        response = self.client.get("/api/v1/reports/sales/")
        self.assertEqual(response.status_code, 403)

    def test_subscriptions_report_super_admin_only(self):
        self.login_as_owner()
        response = self.client.get("/api/v1/reports/subscriptions/")
        self.assertEqual(response.status_code, 403)

        self.login_as_super_admin()
        response = self.client.get("/api/v1/reports/subscriptions/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total_shops"], 1)
