from rest_framework import serializers

from .models import Customer, CustomerPayment, Order, OrderItem, StandingOrderItem
from .services import create_order, record_customer_payment


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            "id", "name", "phone_number", "address", "is_walk_in",
            "bottle_tracking", "bottles_out", "payment_schedule", "debt_balance",
            "delivery_frequency", "delivery_days", "is_active", "created_at",
        ]
        read_only_fields = ["debt_balance", "bottles_out", "created_at"]


class StandingOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = StandingOrderItem
        fields = ["id", "customer", "milk_type", "pack_size", "quantity"]


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ["id", "milk_type", "pack_size", "quantity", "unit_price", "line_total"]
        read_only_fields = ["unit_price", "line_total"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "customer", "is_walk_in", "total_amount", "payment_status",
            "paper_bags_used", "bottles_given", "bottles_collected",
            "created_by", "created_at", "cancelled_at", "items",
        ]
        read_only_fields = [
            "total_amount", "payment_status", "created_by", "created_at",
            "cancelled_at", "items",
        ]


class OrderItemInputSerializer(serializers.Serializer):
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from apps.inventory.models import MilkType, PackSize
        self.fields["milk_type"] = serializers.PrimaryKeyRelatedField(queryset=MilkType.objects.all())
        self.fields["pack_size"] = serializers.PrimaryKeyRelatedField(queryset=PackSize.objects.all())


class CreateOrderSerializer(serializers.Serializer):
    customer = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(), required=False, allow_null=True
    )
    is_walk_in = serializers.BooleanField(default=False)
    items = OrderItemInputSerializer(many=True)
    paper_bags_used = serializers.IntegerField(default=0, min_value=0)
    bottles_given = serializers.IntegerField(default=0, min_value=0)
    bottles_collected = serializers.IntegerField(default=0, min_value=0)

    def create(self, validated_data):
        request = self.context["request"]
        return create_order(
            shop=request.user.shop,
            customer=validated_data.get("customer"),
            items=validated_data["items"],
            paper_bags_used=validated_data["paper_bags_used"],
            bottles_given=validated_data["bottles_given"],
            bottles_collected=validated_data["bottles_collected"],
            created_by=request.user,
            is_walk_in=validated_data["is_walk_in"],
        )


class CustomerPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerPayment
        fields = [
            "id", "customer", "amount", "method", "reference",
            "recorded_by", "paid_at", "note",
        ]
        read_only_fields = ["recorded_by", "paid_at"]

    def create(self, validated_data):
        request = self.context["request"]
        return record_customer_payment(
            shop=request.user.shop,
            customer=validated_data["customer"],
            amount=validated_data["amount"],
            method=validated_data.get("method", CustomerPayment.Method.CASH),
            reference=validated_data.get("reference", ""),
            recorded_by=request.user,
            note=validated_data.get("note", ""),
        )
