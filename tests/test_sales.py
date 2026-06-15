from apps.inventory.models import MilkType, PackSize, Price, Stock
from apps.sales.models import Customer, Order

from .base import BaseAPITestCase


class OrderTests(BaseAPITestCase):
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

    def test_walk_in_order_deducts_stock_and_is_paid(self):
        self.login_as_employee()

        response = self.client.post("/api/v1/sales/orders/", {
            "is_walk_in": True,
            "items": [{"milk_type": self.milk_type.id, "pack_size": self.pack_size.id, "quantity": "5"}],
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["payment_status"], "PAID")
        self.assertEqual(response.data["total_amount"], "300.00")

        stock = Stock.objects.get(shop=self.shop, milk_type=self.milk_type, pack_size=self.pack_size)
        self.assertEqual(stock.quantity, 95)

    def test_credit_customer_order_is_unpaid_and_adds_debt(self):
        self.login_as_employee()
        customer = Customer.objects.create(
            shop=self.shop, name="Jane", payment_schedule=Customer.PaymentSchedule.WEEKLY,
        )

        response = self.client.post("/api/v1/sales/orders/", {
            "customer": customer.id,
            "items": [{"milk_type": self.milk_type.id, "pack_size": self.pack_size.id, "quantity": "10"}],
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["payment_status"], "UNPAID")

        customer.refresh_from_db()
        self.assertEqual(str(customer.debt_balance), "600.00")

    def test_cancel_order_restores_stock_and_debt(self):
        self.login_as_employee()
        customer = Customer.objects.create(
            shop=self.shop, name="Jane", payment_schedule=Customer.PaymentSchedule.WEEKLY,
        )

        create_response = self.client.post("/api/v1/sales/orders/", {
            "customer": customer.id,
            "items": [{"milk_type": self.milk_type.id, "pack_size": self.pack_size.id, "quantity": "10"}],
        }, format="json")
        order_id = create_response.data["id"]

        cancel_response = self.client.post(f"/api/v1/sales/orders/{order_id}/cancel/")
        self.assertEqual(cancel_response.status_code, 200, cancel_response.data)
        self.assertEqual(cancel_response.data["payment_status"], "CANCELLED")

        stock = Stock.objects.get(shop=self.shop, milk_type=self.milk_type, pack_size=self.pack_size)
        self.assertEqual(stock.quantity, 100)

        customer.refresh_from_db()
        self.assertEqual(str(customer.debt_balance), "0.00")

    def test_order_without_price_fails(self):
        self.login_as_employee()
        other_pack = PackSize.objects.create(shop=self.shop, label="2L", litres=2)

        response = self.client.post("/api/v1/sales/orders/", {
            "is_walk_in": True,
            "items": [{"milk_type": self.milk_type.id, "pack_size": other_pack.id, "quantity": "1"}],
        }, format="json")
        self.assertEqual(response.status_code, 400)

    def test_employee_without_pos_permission_is_blocked(self):
        self.employee_permissions.can_use_pos = False
        self.employee_permissions.save()
        self.login_as_employee()

        response = self.client.post("/api/v1/sales/orders/", {
            "is_walk_in": True,
            "items": [{"milk_type": self.milk_type.id, "pack_size": self.pack_size.id, "quantity": "1"}],
        }, format="json")
        self.assertEqual(response.status_code, 403)


class CustomerPaymentTests(BaseAPITestCase):
    def test_payment_reduces_debt_balance(self):
        self.login_as_owner()
        customer = Customer.objects.create(
            shop=self.shop, name="Jane",
            payment_schedule=Customer.PaymentSchedule.WEEKLY, debt_balance="500.00",
        )

        response = self.client.post("/api/v1/sales/payments/", {
            "customer": customer.id, "amount": "200.00", "method": "CASH",
        })
        self.assertEqual(response.status_code, 201, response.data)

        customer.refresh_from_db()
        self.assertEqual(str(customer.debt_balance), "300.00")
