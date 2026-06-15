from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.mixins import ShopScopedQuerysetMixin
from apps.common.permissions import HasShopPermission

from .models import DeliveryRecord, Transporter, TransporterPayment
from .serializers import (
    DeliveryRecordSerializer,
    DeliveryRecordUpdateSerializer,
    TransporterPaymentSerializer,
    TransporterSerializer,
)
from .services import generate_daily_delivery_list

ManageDelivery = HasShopPermission("can_manage_delivery")


class TransporterViewSet(ShopScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Transporter.objects.all().order_by("name")
    serializer_class = TransporterSerializer
    permission_classes = [ManageDelivery]


class TransporterPaymentViewSet(ShopScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = TransporterPayment.objects.all().select_related("transporter", "recorded_by")
    serializer_class = TransporterPaymentSerializer
    permission_classes = [ManageDelivery]
    http_method_names = ["get", "post"]

    def perform_create(self, serializer):
        serializer.save(shop=self.request.user.shop, recorded_by=self.request.user)


class DailyDeliveryListView(APIView):
    """GET: today's (or ?date=YYYY-MM-DD) auto-generated delivery list."""

    permission_classes = [ManageDelivery]

    def get(self, request):
        date_param = request.query_params.get("date")
        delivery_date = None
        if date_param:
            from datetime import date
            delivery_date = date.fromisoformat(date_param)

        records = generate_daily_delivery_list(shop=request.user.shop, delivery_date=delivery_date)
        return Response(DeliveryRecordSerializer(records, many=True).data)


class DeliveryRecordViewSet(ShopScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = DeliveryRecord.objects.all().select_related("customer", "transporter")
    serializer_class = DeliveryRecordSerializer
    permission_classes = [ManageDelivery]
    http_method_names = ["get", "patch"]

    def get_serializer_class(self):
        if self.action == "partial_update":
            return DeliveryRecordUpdateSerializer
        return DeliveryRecordSerializer
