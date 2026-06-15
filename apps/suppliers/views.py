from rest_framework import viewsets

from apps.common.mixins import ShopScopedQuerysetMixin
from apps.common.permissions import HasShopPermission

from .models import Supplier, SupplierDelivery
from .serializers import SupplierDeliverySerializer, SupplierSerializer

ManageSuppliers = HasShopPermission("can_manage_suppliers")


class SupplierViewSet(ShopScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Supplier.objects.all().order_by("name")
    serializer_class = SupplierSerializer
    permission_classes = [ManageSuppliers]


class SupplierDeliveryViewSet(ShopScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = SupplierDelivery.objects.all().select_related(
        "supplier", "milk_type", "pack_size", "paper_bag_stock"
    )
    serializer_class = SupplierDeliverySerializer
    permission_classes = [ManageSuppliers]
    http_method_names = ["get", "post"]
