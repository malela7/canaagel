from django.db import transaction
from rest_framework import serializers

from apps.inventory.models import PaperBagStock, Stock

from .models import Supplier, SupplierDelivery


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ["id", "name", "category", "phone_number", "notes", "is_active"]


class SupplierDeliverySerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierDelivery
        fields = [
            "id", "supplier", "kind", "milk_type", "pack_size", "paper_bag_stock",
            "quantity", "unit_cost", "total_cost", "recorded_by", "delivered_at", "notes",
        ]
        read_only_fields = ["total_cost", "recorded_by", "delivered_at"]

    def validate(self, attrs):
        kind = attrs["kind"]
        if kind == SupplierDelivery.Kind.MILK:
            if not attrs.get("milk_type") or not attrs.get("pack_size"):
                raise serializers.ValidationError(
                    "milk_type and pack_size are required for MILK deliveries."
                )
        if kind == SupplierDelivery.Kind.PAPER:
            if not attrs.get("paper_bag_stock"):
                raise serializers.ValidationError(
                    "paper_bag_stock is required for PAPER deliveries."
                )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        validated_data["total_cost"] = validated_data["quantity"] * validated_data["unit_cost"]
        validated_data["recorded_by"] = self.context["request"].user
        delivery = super().create(validated_data)

        shop = delivery.shop
        if delivery.kind == SupplierDelivery.Kind.MILK:
            stock, _ = Stock.objects.get_or_create(
                shop=shop, milk_type=delivery.milk_type, pack_size=delivery.pack_size,
            )
            stock.quantity += delivery.quantity
            stock.save(update_fields=["quantity"])
        elif delivery.kind == SupplierDelivery.Kind.PAPER:
            paper_stock = delivery.paper_bag_stock
            paper_stock.quantity += int(delivery.quantity)
            paper_stock.save(update_fields=["quantity"])

        return delivery
