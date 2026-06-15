from django.urls import path

from .views import (
    InitiateSubscriptionPaymentView,
    MpesaCallbackView,
    MpesaSTKStatusView,
    MyShopView,
    ShopViewSet,
    SubscriptionPaymentListView,
)

app_name = "shops"

urlpatterns = [
    path("", ShopViewSet.as_view({"get": "list", "post": "create"}), name="shop-list"),
    path("me/", MyShopView.as_view(), name="shop-me"),
    path("<int:pk>/", ShopViewSet.as_view({"get": "retrieve", "patch": "partial_update"}), name="shop-detail"),
    path("<int:pk>/suspend/", ShopViewSet.as_view({"post": "suspend"}), name="shop-suspend"),
    path("<int:pk>/activate/", ShopViewSet.as_view({"post": "activate"}), name="shop-activate"),
    path("<int:pk>/extend-trial/", ShopViewSet.as_view({"post": "extend_trial"}), name="shop-extend-trial"),
    path("<int:pk>/record-payment/", ShopViewSet.as_view({"post": "record_payment"}), name="shop-record-payment"),
    path("subscription-payments/", SubscriptionPaymentListView.as_view(), name="subscription-payments"),
    path("mpesa/stk-push/", InitiateSubscriptionPaymentView.as_view(), name="mpesa-stk-push"),
    path("mpesa/callback/", MpesaCallbackView.as_view(), name="mpesa-callback"),
    path("mpesa/stk-status/", MpesaSTKStatusView.as_view(), name="mpesa-stk-status"),
]
