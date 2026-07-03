import logging

from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .mpesa import stk_push
from .models import MpesaSTKRequest, Shop, SubscriptionPayment
from .permissions import IsShopOwner, IsSuperAdmin, SubscriptionActive
from .serializers import (
    ExtendTrialSerializer,
    MpesaSTKRequestSerializer,
    STKPushSerializer,
    ShopRegisterSerializer,
    ShopSerializer,
    ShopUpdateSerializer,
    SubscriptionPaymentSerializer,
)
from .services import record_subscription_payment

logger = logging.getLogger(__name__)


class ShopViewSet(viewsets.ModelViewSet):
    """
    Super-admin only. List/create shops (with owner), suspend/activate,
    extend trial, record manual subscription payments.
    """

    queryset = Shop.objects.all().order_by("-created_at")
    permission_classes = [IsSuperAdmin]
    http_method_names = ["get", "post", "patch"]

    def get_serializer_class(self):
        if self.action == "create":
            return ShopRegisterSerializer
        if self.action == "partial_update":
            return ShopUpdateSerializer
        return ShopSerializer

    def create(self, request, *args, **kwargs):
        serializer = ShopRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        shop = serializer.save()
        return Response(ShopSerializer(shop).data, status=status.HTTP_201_CREATED)

    def suspend(self, request, pk=None):
        shop = self.get_object()
        shop.status = Shop.Status.SUSPENDED
        shop.suspended_at = timezone.now()
        shop.save(update_fields=["status", "suspended_at", "updated_at"])
        return Response(ShopSerializer(shop).data)

    def activate(self, request, pk=None):
        shop = self.get_object()
        shop.status = Shop.Status.ACTIVE
        shop.suspended_at = None
        shop.save(update_fields=["status", "suspended_at", "updated_at"])
        return Response(ShopSerializer(shop).data)

    def extend_trial(self, request, pk=None):
        shop = self.get_object()
        serializer = ExtendTrialSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        days = serializer.validated_data["days"]

        base = shop.trial_ends_at if shop.trial_ends_at > timezone.now() else timezone.now()
        shop.trial_ends_at = base + timezone.timedelta(days=days)
        if shop.status in (Shop.Status.SUSPENDED, Shop.Status.EXPIRED):
            shop.status = Shop.Status.TRIAL
            shop.suspended_at = None
        shop.save()
        return Response(ShopSerializer(shop).data)

    def record_payment(self, request, pk=None):
        shop = self.get_object()
        serializer = SubscriptionPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = record_subscription_payment(
            shop=shop,
            amount=serializer.validated_data["amount"],
            method=serializer.validated_data.get("method", SubscriptionPayment.Method.OTHER),
            recorded_by=request.user,
            note=serializer.validated_data.get("note", ""),
        )
        return Response(SubscriptionPaymentSerializer(payment).data, status=status.HTTP_201_CREATED)


class MyShopView(generics.RetrieveAPIView):
    """Owner/employee: view their own shop's subscription status."""

    serializer_class = ShopSerializer
    permission_classes = [permissions.IsAuthenticated, SubscriptionActive]

    def get_object(self):
        return self.request.user.shop


class InitiateSubscriptionPaymentView(APIView):
    """Owner taps "Pay Subscription" -> triggers an M-Pesa STK push."""

    permission_classes = [IsShopOwner]

    def post(self, request):
        serializer = STKPushSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        shop = request.user.shop

        amount = settings.SUBSCRIPTION_MONTHLY_FEE_KES

        try:
            result = stk_push(
                phone_number=serializer.validated_data["phone_number"],
                amount=amount,
                account_reference=f"SHOP-{shop.id}",
                description="Milkshop SaaS subscription",
            )
        except Exception:
            logger.exception("M-Pesa STK push failed for shop %s", shop.id)
            return Response(
                {"detail": "Could not reach M-Pesa. Please try again."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        MpesaSTKRequest.objects.create(
            shop=shop,
            checkout_request_id=result["CheckoutRequestID"],
            merchant_request_id=result.get("MerchantRequestID", ""),
            phone_number=serializer.validated_data["phone_number"],
            amount=amount,
        )
        return Response({"detail": "Payment request sent. Enter your M-Pesa PIN on your phone."})


class MpesaCallbackView(APIView):
    """
    Public endpoint -- Safaricom calls this once the STK push completes.
    On success: records the SubscriptionPayment and auto-reactivates the shop.
    """

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        body = request.data.get("Body", {})
        callback = body.get("stkCallback", {})
        checkout_id = callback.get("CheckoutRequestID")
        result_code = callback.get("ResultCode")
        result_desc = callback.get("ResultDesc", "")

        stk_request = get_object_or_404(MpesaSTKRequest, checkout_request_id=checkout_id)
        stk_request.result_description = result_desc

        if result_code == 0:
            metadata = {
                item["Name"]: item.get("Value")
                for item in callback.get("CallbackMetadata", {}).get("Item", [])
            }
            receipt = metadata.get("MpesaReceiptNumber", "")
            stk_request.status = MpesaSTKRequest.Status.SUCCESS
            stk_request.save()

            record_subscription_payment(
                shop=stk_request.shop,
                amount=stk_request.amount,
                method=SubscriptionPayment.Method.MPESA,
                mpesa_receipt_number=receipt,
            )
        else:
            stk_request.status = MpesaSTKRequest.Status.FAILED
            stk_request.save()

        return Response({"ResultCode": 0, "ResultDesc": "Accepted"})


class SubscriptionPaymentListView(generics.ListAPIView):
    """Super admin: view payment history. Owner: view their own shop's payments."""

    serializer_class = SubscriptionPaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = SubscriptionPayment.objects.all().order_by("-paid_at")
        if user.role != user.Role.SUPER_ADMIN:
            qs = qs.filter(shop=user.shop)
        return qs


class MpesaSTKStatusView(generics.ListAPIView):
    """Owner: check status of their recent STK push attempts."""

    serializer_class = MpesaSTKRequestSerializer
    permission_classes = [IsShopOwner]

    def get_queryset(self):
        return MpesaSTKRequest.objects.filter(shop=self.request.user.shop).order_by("-created_at")
