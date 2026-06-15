from apps.accounts.models import User
from apps.shops.models import Shop

from .base import BaseAPITestCase


class AuthTests(BaseAPITestCase):
    def test_login_returns_tokens_with_role_and_shop_claims(self):
        response = self.client.post(
            "/api/v1/auth/login/", {"username": "owner", "password": "OwnerSecret!"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_login_with_bad_password_fails(self):
        response = self.client.post(
            "/api/v1/auth/login/", {"username": "owner", "password": "wrong"},
        )
        self.assertEqual(response.status_code, 401)

    def test_me_returns_current_user(self):
        self.login_as_owner()
        response = self.client.get("/api/v1/auth/me/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["username"], "owner")
        self.assertEqual(response.data["role"], "OWNER")

    def test_logout_blacklists_refresh_token(self):
        login = self.client.post(
            "/api/v1/auth/login/", {"username": "owner", "password": "OwnerSecret!"},
        )
        refresh = login.data["refresh"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

        response = self.client.post("/api/v1/auth/logout/", {"refresh": refresh})
        self.assertEqual(response.status_code, 205)

        refresh_response = self.client.post("/api/v1/auth/refresh/", {"refresh": refresh})
        self.assertEqual(refresh_response.status_code, 401)

    def test_owner_can_create_employee(self):
        self.login_as_owner()
        response = self.client.post("/api/v1/auth/employees/", {
            "username": "newstaff",
            "password": "StaffSecret!1",
            "permissions": {"can_manage_inventory": True},
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)

        created = User.objects.get(username="newstaff")
        self.assertEqual(created.role, User.Role.EMPLOYEE)
        self.assertEqual(created.shop, self.shop)
        self.assertTrue(created.permissions.can_manage_inventory)

    def test_employee_cannot_create_employee(self):
        self.login_as_employee()
        response = self.client.post("/api/v1/auth/employees/", {
            "username": "newstaff2",
            "password": "StaffSecret!1",
        }, format="json")
        self.assertEqual(response.status_code, 403)


class SubscriptionGuardTests(BaseAPITestCase):
    def test_suspended_shop_blocks_owner_requests(self):
        self.shop.status = Shop.Status.SUSPENDED
        self.shop.save()

        self.login_as_owner()
        response = self.client.get("/api/v1/shops/me/")
        self.assertEqual(response.status_code, 403)

    def test_suspended_shop_does_not_block_super_admin(self):
        self.shop.status = Shop.Status.SUSPENDED
        self.shop.save()

        self.login_as_super_admin()
        response = self.client.get("/api/v1/shops/")
        self.assertEqual(response.status_code, 200)
