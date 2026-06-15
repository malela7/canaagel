from apps.delivery.models import DeliveryRecord, Transporter
from apps.sales.models import Customer

from .base import BaseAPITestCase


class DeliveryTests(BaseAPITestCase):
    def setUp(self):
        super().setUp()
        self.customer = Customer.objects.create(
            shop=self.shop, name="Jane",
            delivery_frequency=Customer.DeliveryFrequency.DAILY,
        )

    def test_daily_list_generates_records_for_due_customers(self):
        self.login_as_owner()
        response = self.client.get("/api/v1/delivery/daily-list/")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["customer"]["id"], self.customer.id)

        self.assertEqual(
            DeliveryRecord.objects.filter(shop=self.shop, customer=self.customer).count(), 1,
        )

    def test_daily_list_is_idempotent(self):
        self.login_as_owner()
        self.client.get("/api/v1/delivery/daily-list/")
        self.client.get("/api/v1/delivery/daily-list/")
        self.assertEqual(
            DeliveryRecord.objects.filter(shop=self.shop, customer=self.customer).count(), 1,
        )

    def test_owner_can_mark_record_completed(self):
        self.login_as_owner()
        self.client.get("/api/v1/delivery/daily-list/")
        record = DeliveryRecord.objects.get(shop=self.shop, customer=self.customer)

        response = self.client.patch(f"/api/v1/delivery/records/{record.id}/", {
            "is_completed": True,
        })
        self.assertEqual(response.status_code, 200, response.data)

        record.refresh_from_db()
        self.assertTrue(record.is_completed)

    def test_customer_with_no_standing_schedule_is_excluded(self):
        Customer.objects.create(
            shop=self.shop, name="NoSchedule",
            delivery_frequency=Customer.DeliveryFrequency.NONE,
        )
        self.login_as_owner()
        response = self.client.get("/api/v1/delivery/daily-list/")
        self.assertEqual(len(response.data), 1)
