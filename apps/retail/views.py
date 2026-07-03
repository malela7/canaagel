from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Expense, Product, ProductCategory, StockOrder, StockOrderItem
from .serializers import (
    ExpenseSerializer,
    ProductCategorySerializer,
    ProductSerializer,
    StockOrderCreateSerializer,
    StockOrderSerializer,
)


def get_shop(request):
    return request.user.shop


class ProductCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ProductCategorySerializer

    def get_queryset(self):
        return ProductCategory.objects.filter(shop=get_shop(self.request))

    def perform_create(self, serializer):
        serializer.save(shop=get_shop(self.request))


class ProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ProductSerializer

    def get_queryset(self):
        qs = Product.objects.filter(shop=get_shop(self.request))
        active_only = self.request.query_params.get("active")
        if active_only == "1":
            qs = qs.filter(is_active=True)
        return qs

    def perform_create(self, serializer):
        serializer.save(shop=get_shop(self.request))


class ExpenseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ExpenseSerializer

    def get_queryset(self):
        qs = Expense.objects.filter(shop=get_shop(self.request))
        date_from = self.request.query_params.get("from")
        date_to = self.request.query_params.get("to")
        if date_from:
            qs = qs.filter(expense_date__gte=date_from)
        if date_to:
            qs = qs.filter(expense_date__lte=date_to)
        return qs

    def perform_create(self, serializer):
        serializer.save(shop=get_shop(self.request), recorded_by=self.request.user)


class StockOrderViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = StockOrderSerializer

    def get_queryset(self):
        return StockOrder.objects.filter(shop=get_shop(self.request)).prefetch_related("items__product")

    def create(self, request, *args, **kwargs):
        ser = StockOrderCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        shop = get_shop(request)

        total = 0
        item_objects = []
        for item in data["items"]:
            product = Product.objects.get(pk=item["product"], shop=shop)
            qty = float(item["quantity"])
            unit = float(item["unit_cost"])
            line = round(qty * unit, 2)
            total += line
            item_objects.append((product, qty, unit, line))

        order = StockOrder.objects.create(
            shop=shop,
            supplier_name=data.get("supplier_name", ""),
            notes=data.get("notes", ""),
            total_cost=total,
            ordered_by=request.user,
        )
        for product, qty, unit, line in item_objects:
            StockOrderItem.objects.create(
                order=order, product=product,
                quantity=qty, unit_cost=unit, line_total=line,
            )
        return Response(StockOrderSerializer(order).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def receive(self, request, pk=None):
        order = self.get_object()
        if order.status != StockOrder.Status.PENDING:
            return Response({"detail": "Only pending orders can be received."}, status=400)
        order.status = StockOrder.Status.RECEIVED
        order.received_at = timezone.now()
        order.save()
        for item in order.items.all():
            item.product.quantity = float(item.product.quantity) + float(item.quantity)
            item.product.save(update_fields=["quantity", "updated_at"])
        return Response(StockOrderSerializer(order).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        order = self.get_object()
        if order.status != StockOrder.Status.PENDING:
            return Response({"detail": "Only pending orders can be cancelled."}, status=400)
        order.status = StockOrder.Status.CANCELLED
        order.cancelled_at = timezone.now()
        order.save()
        return Response(StockOrderSerializer(order).data)
