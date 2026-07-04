from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.mixins import ShopScopedQuerysetMixin
from apps.common.permissions import HasShopPermission

from .models import CustomerPrice, MilkType, PackSize, PaperBagStock, Price, ShopProduct, Stock
from .serializers import (
    CustomerPriceSerializer,
    MilkTypeSerializer,
    PackSizeSerializer,
    PaperBagStockSerializer,
    PriceSerializer,
    SetCustomerPriceSerializer,
    SetPriceSerializer,
    ShopProductSerializer,
    StockSerializer,
)
from .services import set_current_customer_price, set_current_price

ManageInventory = HasShopPermission("can_manage_inventory")
ViewInventory = HasShopPermission("can_view_inventory")


class MilkTypeViewSet(ShopScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = MilkType.objects.all().order_by("name")
    serializer_class = MilkTypeSerializer
    permission_classes = [ManageInventory]


class PackSizeViewSet(ShopScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = PackSize.objects.all().order_by("litres")
    serializer_class = PackSizeSerializer
    permission_classes = [ManageInventory]


class PriceListView(ShopScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    queryset = Price.objects.filter(is_current=True).select_related("milk_type", "pack_size")
    serializer_class = PriceSerializer
    permission_classes = [ViewInventory]


class SetPriceView(APIView):
    """Owner/employee with permission: set the shop's current price for a milk_type+pack_size."""

    permission_classes = [ManageInventory]

    def post(self, request):
        serializer = SetPriceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        price = set_current_price(
            shop=request.user.shop,
            milk_type=serializer.validated_data["milk_type"],
            pack_size=serializer.validated_data["pack_size"],
            amount=serializer.validated_data["amount"],
        )
        return Response(PriceSerializer(price).data, status=status.HTTP_201_CREATED)


class CustomerPriceListView(ShopScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    queryset = CustomerPrice.objects.filter(is_current=True).select_related(
        "customer", "milk_type", "pack_size"
    )
    serializer_class = CustomerPriceSerializer
    permission_classes = [ViewInventory]


class SetCustomerPriceView(APIView):
    permission_classes = [ManageInventory]

    def post(self, request):
        serializer = SetCustomerPriceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        price = set_current_customer_price(
            shop=request.user.shop,
            customer=serializer.validated_data["customer"],
            milk_type=serializer.validated_data["milk_type"],
            pack_size=serializer.validated_data["pack_size"],
            amount=serializer.validated_data["amount"],
        )
        return Response(CustomerPriceSerializer(price).data, status=status.HTTP_201_CREATED)


class StockViewSet(ShopScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Stock.objects.all().select_related("milk_type", "pack_size")
    serializer_class = StockSerializer
    permission_classes = [ManageInventory]
    http_method_names = ["get", "post", "patch", "delete"]


class ShopProductViewSet(ShopScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = ShopProduct.objects.all().order_by("name")
    serializer_class = ShopProductSerializer
    permission_classes = [ManageInventory]
    http_method_names = ["get", "post", "patch", "delete"]


class PaperBagStockViewSet(ShopScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = PaperBagStock.objects.all()
    serializer_class = PaperBagStockSerializer
    permission_classes = [ManageInventory]
    http_method_names = ["get", "post", "patch", "delete"]
