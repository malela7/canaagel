from apps.inventory.models import MilkType, PackSize, Price

from .base import BaseAPITestCase


class InventoryTests(BaseAPITestCase):
    def setUp(self):
        super().setUp()
        self.milk_type = MilkType.objects.create(shop=self.shop, name="Cow")
        self.pack_size = PackSize.objects.create(shop=self.shop, label="1L", litres=1)

    def test_owner_can_set_price_and_old_price_is_closed(self):
        self.login_as_owner()

        response = self.client.post("/api/v1/inventory/prices/set/", {
            "milk_type": self.milk_type.id,
            "pack_size": self.pack_size.id,
            "amount": "60.00",
        })
        self.assertEqual(response.status_code, 201, response.data)

        response2 = self.client.post("/api/v1/inventory/prices/set/", {
            "milk_type": self.milk_type.id,
            "pack_size": self.pack_size.id,
            "amount": "65.00",
        })
        self.assertEqual(response2.status_code, 201, response2.data)

        prices = Price.objects.filter(
            shop=self.shop, milk_type=self.milk_type, pack_size=self.pack_size,
        ).order_by("valid_from")
        self.assertEqual(prices.count(), 2)
        self.assertFalse(prices.first().is_current)
        self.assertIsNotNone(prices.first().valid_to)
        self.assertTrue(prices.last().is_current)
        self.assertEqual(str(prices.last().amount), "65.00")

    def test_employee_without_permission_cannot_set_price(self):
        self.login_as_employee()
        response = self.client.post("/api/v1/inventory/prices/set/", {
            "milk_type": self.milk_type.id,
            "pack_size": self.pack_size.id,
            "amount": "60.00",
        })
        self.assertEqual(response.status_code, 403)

    def test_employee_with_permission_can_set_price(self):
        self.employee_permissions.can_manage_inventory = True
        self.employee_permissions.save()
        self.login_as_employee()

        response = self.client.post("/api/v1/inventory/prices/set/", {
            "milk_type": self.milk_type.id,
            "pack_size": self.pack_size.id,
            "amount": "60.00",
        })
        self.assertEqual(response.status_code, 201, response.data)

    def test_stock_create_and_list(self):
        self.login_as_owner()
        response = self.client.post("/api/v1/inventory/stock/", {
            "milk_type": self.milk_type.id,
            "pack_size": self.pack_size.id,
            "quantity": "100",
            "low_stock_threshold": "10",
        })
        self.assertEqual(response.status_code, 201, response.data)

        list_response = self.client.get("/api/v1/inventory/stock/")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(list_response.data["count"], 1)
