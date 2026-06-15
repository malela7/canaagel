from rest_framework import serializers

from apps.sales.serializers import CustomerSerializer, StandingOrderItemSerializer

from .models import DeliveryRecord, Transporter, TransporterPayment


class TransporterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transporter
        fields = ["id", "name", "phone_number", "is_active"]


class TransporterPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TransporterPayment
        fields = ["id", "transporter", "amount", "paid_at", "note", "recorded_by"]
        read_only_fields = ["recorded_by", "paid_at"]


class DeliveryRecordSerializer(serializers.ModelSerializer):
    customer = CustomerSerializer(read_only=True)
    standing_items = serializers.SerializerMethodField()

    class Meta:
        model = DeliveryRecord
        fields = [
            "id", "customer", "transporter", "delivery_date",
            "order", "is_completed", "notes", "standing_items",
        ]

    def get_standing_items(self, obj):
        return StandingOrderItemSerializer(obj.customer.standing_items.all(), many=True).data


class DeliveryRecordUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryRecord
        fields = ["transporter", "is_completed", "notes"]
