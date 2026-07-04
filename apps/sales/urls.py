from django.urls import path

from .views import (
    CustomerPaymentViewSet,
    CustomerViewSet,
    ExpenseViewSet,
    OrderViewSet,
    StandingOrderItemViewSet,
)

app_name = "sales"

urlpatterns = [
    path("customers/", CustomerViewSet.as_view({"get": "list", "post": "create"}), name="customer-list"),
    path("customers/<int:pk>/", CustomerViewSet.as_view(
        {"get": "retrieve", "patch": "partial_update", "delete": "destroy"}), name="customer-detail"),

    path("standing-items/", StandingOrderItemViewSet.as_view({"get": "list", "post": "create"}), name="standing-item-list"),
    path("standing-items/<int:pk>/", StandingOrderItemViewSet.as_view(
        {"get": "retrieve", "patch": "partial_update", "delete": "destroy"}), name="standing-item-detail"),

    path("orders/", OrderViewSet.as_view({"get": "list", "post": "create"}), name="order-list"),
    path("orders/<int:pk>/", OrderViewSet.as_view({"get": "retrieve"}), name="order-detail"),
    path("orders/<int:pk>/cancel/", OrderViewSet.as_view({"post": "cancel"}), name="order-cancel"),

    path("payments/", CustomerPaymentViewSet.as_view({"get": "list", "post": "create"}), name="payment-list"),

    path("expenses/", ExpenseViewSet.as_view({"get": "list", "post": "create"}), name="expense-list"),
    path("expenses/<int:pk>/", ExpenseViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"}), name="expense-detail"),
]
