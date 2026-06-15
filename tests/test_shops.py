from unittest.mock import patch

from apps.shops.models import MpesaSTKRequest, Shop, SubscriptionPayment

from .base import BaseAPITestCase


class SubscriptionFlowTests(BaseAPITestCase):
    def test_super_admin_can_register_shop_with_owner(self):
        self.login_as_super_admin()

        response = self.client.post("/api/v1/shops/", {
            "shop_name": "New Shop",
            "owner_username": "newowner",
            "owner_password": "NewOwnerSecret!",
        })
        self.assertEqual(response.status_code, 201, response.data)

        new_shop = Shop.objects.get(name="New Shop")
        self.assertEqual(new_shop.status, Shop.Status.TRIAL)
        self.assertIsNotNone(new_shop.trial_ends_at)

    def test_super_admin_record_payment_auto_reactivates_shop(self):
        self.shop.status = Shop.Status.SUSPENDED
        self.shop.current_period_end = None
        self.shop.save()

        self.login_as_super_admin()
        response = self.client.post(f"/api/v1/shops/{self.shop.id}/record-payment/", {
            "amount": "1500.00", "method": "CASH",
        })
        self.assertEqual(response.status_code, 201, response.data)

        self.shop.refresh_from_db()
        self.assertEqual(self.shop.status, Shop.Status.ACTIVE)
        self.assertIsNotNone(self.shop.current_period_end)
        self.assertIsNone(self.shop.suspended_at)

    def test_super_admin_can_suspend_and_activate(self):
        self.login_as_super_admin()

        response = self.client.post(f"/api/v1/shops/{self.shop.id}/suspend/")
        self.assertEqual(response.status_code, 200)
        self.shop.refresh_from_db()
        self.assertEqual(self.shop.status, Shop.Status.SUSPENDED)

        response = self.client.post(f"/api/v1/shops/{self.shop.id}/activate/")
        self.assertEqual(response.status_code, 200)
        self.shop.refresh_from_db()
        self.assertEqual(self.shop.status, Shop.Status.ACTIVE)

    @patch("apps.shops.views.stk_push")
    def test_owner_can_initiate_mpesa_stk_push(self, mock_stk_push):
        mock_stk_push.return_value = {
            "CheckoutRequestID": "ws_CO_123",
            "MerchantRequestID": "merchant_123",
        }
        self.login_as_owner()

        response = self.client.post("/api/v1/shops/mpesa/stk-push/", {
            "phone_number": "254712345678",
        })
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(MpesaSTKRequest.objects.filter(checkout_request_id="ws_CO_123").exists())

    def test_mpesa_callback_success_auto_reactivates_shop(self):
        self.shop.status = Shop.Status.SUSPENDED
        self.shop.current_period_end = None
        self.shop.save()

        stk_request = MpesaSTKRequest.objects.create(
            shop=self.shop, checkout_request_id="ws_CO_999",
            merchant_request_id="merchant_999", phone_number="254712345678", amount=1500,
        )

        self.client.credentials()  # public endpoint, no auth
        response = self.client.post("/api/v1/shops/mpesa/callback/", {
            "Body": {
                "stkCallback": {
                    "CheckoutRequestID": "ws_CO_999",
                    "ResultCode": 0,
                    "ResultDesc": "The service request is processed successfully.",
                    "CallbackMetadata": {
                        "Item": [
                            {"Name": "Amount", "Value": 1500},
                            {"Name": "MpesaReceiptNumber", "Value": "ABC123XYZ"},
                        ]
                    },
                }
            }
        }, format="json")
        self.assertEqual(response.status_code, 200, response.data)

        self.shop.refresh_from_db()
        self.assertEqual(self.shop.status, Shop.Status.ACTIVE)

        stk_request.refresh_from_db()
        self.assertEqual(stk_request.status, MpesaSTKRequest.Status.SUCCESS)

        self.assertTrue(
            SubscriptionPayment.objects.filter(shop=self.shop, mpesa_receipt_number="ABC123XYZ").exists()
        )

    def test_mpesa_callback_failure_does_not_reactivate(self):
        self.shop.status = Shop.Status.SUSPENDED
        self.shop.save()

        MpesaSTKRequest.objects.create(
            shop=self.shop, checkout_request_id="ws_CO_888",
            merchant_request_id="merchant_888", phone_number="254712345678", amount=1500,
        )

        self.client.credentials()
        response = self.client.post("/api/v1/shops/mpesa/callback/", {
            "Body": {
                "stkCallback": {
                    "CheckoutRequestID": "ws_CO_888",
                    "ResultCode": 1032,
                    "ResultDesc": "Request cancelled by user.",
                }
            }
        }, format="json")
        self.assertEqual(response.status_code, 200, response.data)

        self.shop.refresh_from_db()
        self.assertEqual(self.shop.status, Shop.Status.SUSPENDED)
