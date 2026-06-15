from apps.inventory.models import MilkType, PackSize, PaperBagStock, Stock
from apps.suppliers.models import Supplier

from .base import BaseAPITestCase


class SupplierDeliveryTests(BaseAPITestCase):
    def setUp(self):
        super().setUp()
        self.milk_type = MilkType.objects.create(shop=self.shop, name="Cow")
        self.pack_size = PackSize.objects.create(shop=self.shop, label="1L", litres=1)
        self.supplier = Supplier.objects.create(
            shop=self.shop, name="Milk Co", category=Supplier.Category.MILK,
        )

    def test_milk_delivery_increments_stock(self):
        self.login_as_owner()

        response = self.client.post("/api/v1/suppliers/deliveries/", {
            "supplier": self.supplier.id,
            "kind": "MILK",
            "milk_type": self.milk_type.id,
            "pack_size": self.pack_size.id,
            "quantity": "50",
            "unit_cost": "40.00",
        })
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["total_cost"], "2000.00")

        stock = Stock.objects.get(shop=self.shop, milk_type=self.milk_type, pack_size=self.pack_size)
        self.assertEqual(stock.quantity, 50)

    def test_paper_bag_delivery_increments_paper_stock(self):
        self.login_as_owner()
        paper_stock = PaperBagStock.objects.create(shop=self.shop, label="Standard", quantity=10)
        paper_supplier = Supplier.objects.create(
            shop=self.shop, name="Paper Co", category=Supplier.Category.PAPER,
        )

        response = self.client.post("/api/v1/suppliers/deliveries/", {
            "supplier": paper_supplier.id,
            "kind": "PAPER",
            "paper_bag_stock": paper_stock.id,
            "quantity": "100",
            "unit_cost": "2.00",
        })
        self.assertEqual(response.status_code, 201, response.data)

        paper_stock.refresh_from_db()
        self.assertEqual(paper_stock.quantity, 110)

    def test_employee_without_permission_cannot_record_delivery(self):
        self.login_as_employee()
        response = self.client.post("/api/v1/suppliers/deliveries/", {
            "supplier": self.supplier.id,
            "kind": "MILK",
            "milk_type": self.milk_type.id,
            "pack_size": self.pack_size.id,
            "quantity": "50",
            "unit_cost": "40.00",
        })
        self.assertEqual(response.status_code, 403)
