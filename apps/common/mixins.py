from apps.accounts.models import User


class ShopScopedQuerysetMixin:
    """
    Restricts a ViewSet's queryset to the requesting user's shop.
    SUPER_ADMIN sees nothing through these endpoints (they have their own
    shops/superadmin endpoints) unless the view overrides this.
    """

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == User.Role.SUPER_ADMIN:
            return qs.none()
        return qs.filter(shop=user.shop)

    def perform_create(self, serializer):
        serializer.save(shop=self.request.user.shop)
