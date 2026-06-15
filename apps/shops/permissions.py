from rest_framework.permissions import BasePermission

from apps.accounts.models import User


class SubscriptionActive(BasePermission):
    """
    Global guard: if the requesting user's shop is SUSPENDED or EXPIRED,
    every API request returns 403 -- except for SUPER_ADMIN, who is never
    blocked (they need access to manage subscriptions for blocked shops).
    """

    message = "This shop's subscription is suspended or expired. Please pay to restore access."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return True  # let auth permission classes handle this

        if user.role == User.Role.SUPER_ADMIN:
            return True

        shop = user.shop
        if shop is None:
            return True

        return not shop.is_blocked


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.SUPER_ADMIN
        )


class IsShopOwner(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.OWNER
        )


class IsOwnerOrEmployee(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in (User.Role.OWNER, User.Role.EMPLOYEE)
        )
