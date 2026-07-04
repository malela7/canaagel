from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.mixins import ShopScopedQuerysetMixin
from apps.common.permissions import HasShopPermission

from .models import Customer, CustomerPayment, Expense, Order, StandingOrderItem
from .serializers import (
    CreateOrderSerializer,
    CustomerPaymentSerializer,
    CustomerSerializer,
    ExpenseSerializer,
    OrderSerializer,
    StandingOrderItemSerializer,
)
from .services import cancel_order

ManageCustomers = HasShopPermission("can_manage_customers")
UsePOS = HasShopPermission("can_use_pos")
RecordPayments = HasShopPermission("can_record_payments")
ManageExpenses = HasShopPermission("can_manage_inventory")


class CustomerViewSet(ShopScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [ManageCustomers]


class StandingOrderItemViewSet(ShopScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = StandingOrderItem.objects.all().select_related("customer", "milk_type", "pack_size")
    serializer_class = StandingOrderItemSerializer
    permission_classes = [ManageCustomers]

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.filter(customer__shop=self.request.user.shop)

    def perform_create(self, serializer):
        serializer.save()


class OrderViewSet(ShopScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Order.objects.all().select_related("customer", "created_by").prefetch_related("items")
    permission_classes = [UsePOS]
    http_method_names = ["get", "post"]

    def get_serializer_class(self):
        if self.action == "create":
            return CreateOrderSerializer
        return OrderSerializer

    def create(self, request, *args, **kwargs):
        serializer = CreateOrderSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        try:
            order = serializer.save()
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

    def cancel(self, request, pk=None):
        order = self.get_object()
        order = cancel_order(order=order)
        return Response(OrderSerializer(order).data)


class CustomerPaymentViewSet(ShopScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = CustomerPayment.objects.all().select_related("customer", "recorded_by")
    serializer_class = CustomerPaymentSerializer
    permission_classes = [RecordPayments]
    http_method_names = ["get", "post"]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        payment = serializer.save()
        return Response(self.get_serializer(payment).data, status=status.HTTP_201_CREATED)


class ExpenseViewSet(ShopScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [ManageExpenses]
    http_method_names = ["get", "post", "patch", "delete"]

    def perform_create(self, serializer):
        serializer.save(shop=self.request.user.shop, created_by=self.request.user)
