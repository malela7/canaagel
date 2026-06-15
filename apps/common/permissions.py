from rest_framework.permissions import BasePermission

from apps.accounts.models import User


def HasShopPermission(flag: str):
    """
    Factory for a permission class that allows:
      - OWNER: always (owners have full access to their own shop)
      - EMPLOYEE: only if their EmployeePermissions.<flag> is True

    `flag` must be one of the boolean fields on apps.accounts.models.EmployeePermissions
    (e.g. "can_use_pos", "can_manage_inventory").
    """

    class _Permission(BasePermission):
        def has_permission(self, request, view):
            user = request.user
            if not user or not user.is_authenticated:
                return False
            if user.role == User.Role.OWNER:
                return True
            if user.role == User.Role.EMPLOYEE:
                permissions = getattr(user, "permissions", None)
                return bool(permissions and getattr(permissions, flag, False))
            return False

    _Permission.__name__ = f"HasShopPermission_{flag}"
    return _Permission
