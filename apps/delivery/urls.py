from django.urls import path

from .views import (
    DailyDeliveryListView,
    DeliveryRecordViewSet,
    TransporterPaymentViewSet,
    TransporterViewSet,
)

app_name = "delivery"

urlpatterns = [
    path("transporters/", TransporterViewSet.as_view({"get": "list", "post": "create"}), name="transporter-list"),
    path("transporters/<int:pk>/", TransporterViewSet.as_view(
        {"get": "retrieve", "patch": "partial_update", "delete": "destroy"}), name="transporter-detail"),

    path("transporter-payments/", TransporterPaymentViewSet.as_view({"get": "list", "post": "create"}), name="transporter-payment-list"),

    path("daily-list/", DailyDeliveryListView.as_view(), name="daily-list"),

    path("records/<int:pk>/", DeliveryRecordViewSet.as_view(
        {"get": "retrieve", "patch": "partial_update"}), name="record-detail"),
]
