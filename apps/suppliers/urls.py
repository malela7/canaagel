from django.urls import path

from .views import SupplierDeliveryViewSet, SupplierViewSet

app_name = "suppliers"

urlpatterns = [
    path("", SupplierViewSet.as_view({"get": "list", "post": "create"}), name="supplier-list"),
    path("<int:pk>/", SupplierViewSet.as_view(
        {"get": "retrieve", "patch": "partial_update", "delete": "destroy"}), name="supplier-detail"),
    path("deliveries/", SupplierDeliveryViewSet.as_view({"get": "list", "post": "create"}), name="delivery-list"),
    path("deliveries/<int:pk>/", SupplierDeliveryViewSet.as_view({"get": "retrieve"}), name="delivery-detail"),
]
