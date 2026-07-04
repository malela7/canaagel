from django.urls import path

from .views import (
    CustomerPriceListView,
    MilkTypeViewSet,
    PackSizeViewSet,
    PaperBagStockViewSet,
    PriceListView,
    SetCustomerPriceView,
    SetPriceView,
    ShopProductViewSet,
    StockViewSet,
)

app_name = "inventory"

urlpatterns = [
    path("milk-types/", MilkTypeViewSet.as_view({"get": "list", "post": "create"}), name="milk-type-list"),
    path("milk-types/<int:pk>/", MilkTypeViewSet.as_view(
        {"get": "retrieve", "patch": "partial_update", "delete": "destroy"}), name="milk-type-detail"),

    path("pack-sizes/", PackSizeViewSet.as_view({"get": "list", "post": "create"}), name="pack-size-list"),
    path("pack-sizes/<int:pk>/", PackSizeViewSet.as_view(
        {"get": "retrieve", "patch": "partial_update", "delete": "destroy"}), name="pack-size-detail"),

    path("prices/", PriceListView.as_view({"get": "list"}), name="price-list"),
    path("prices/set/", SetPriceView.as_view(), name="price-set"),

    path("customer-prices/", CustomerPriceListView.as_view({"get": "list"}), name="customer-price-list"),
    path("customer-prices/set/", SetCustomerPriceView.as_view(), name="customer-price-set"),

    path("stock/", StockViewSet.as_view({"get": "list", "post": "create"}), name="stock-list"),
    path("stock/<int:pk>/", StockViewSet.as_view({"get": "retrieve", "patch": "partial_update"}), name="stock-detail"),

    path("paper-bag-stock/", PaperBagStockViewSet.as_view({"get": "list", "post": "create"}), name="paper-bag-stock-list"),
    path("paper-bag-stock/<int:pk>/", PaperBagStockViewSet.as_view(
        {"get": "retrieve", "patch": "partial_update"}), name="paper-bag-stock-detail"),

    path("products/", ShopProductViewSet.as_view({"get": "list", "post": "create"}), name="product-list"),
    path("products/<int:pk>/", ShopProductViewSet.as_view(
        {"get": "retrieve", "patch": "partial_update", "delete": "destroy"}), name="product-detail"),
]
