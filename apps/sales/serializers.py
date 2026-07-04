from decimal import Decimal

from rest_framework import serializers

from .models import Customer, CustomerPayment, Order, OrderItem, ProductSale, ProductSaleItem, StandingOrderItem
from .services import create_order, record_customer_payment


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            "id", "name", "phone_number", "address", "house_number", "is_walk_in",
            "bottle_tracking", "bottles_out", "payment_schedule", "debt_balance",
            "delivery_frequency", "delivery_days", "is_active", "created_at",
        ]
        read_only_fields = ["debt_balance", "bottles_out", "created_at"]


class StandingOrderItemSerializer(serializers.ModelSerializer):
    milk_type_name = serializers.CharField(source="milk_type.name", read_only=True)
    pack_size_label = serializers.CharField(source="pack_size.label", read_only=True)

    class Meta:
        model = StandingOrderItem
        fields = ["id", "customer", "milk_type", "milk_type_name", "pack_size", "pack_size_label", "quantity"]


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
            "id", "customer", "is_walk_in", "total_amount", "payment_status", "payment_method",
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
    payment_method = serializers.ChoiceField(choices=Order.PaymentMethod.choices, default=Order.PaymentMethod.CASH)

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
            payment_method=validated_data["payment_method"],
        )


class ProductSaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = ProductSaleItem
        fields = ["id", "product", "product_name", "quantity", "unit_price", "line_total"]
        read_only_fields = ["unit_price", "line_total"]


class ProductSaleSerializer(serializers.ModelSerializer):
    items = ProductSaleItemSerializer(many=True, read_only=True)
    customer_name = serializers.SerializerMethodField()

    def get_customer_name(self, obj):
        return obj.customer.name if obj.customer else "Walk-in"

    class Meta:
        model = ProductSale
        fields = [
            "id", "customer", "customer_name", "is_walk_in", "total_amount",
            "payment_status", "payment_method", "note",
            "created_by", "created_at", "items",
        ]
        read_only_fields = ["total_amount", "payment_status", "created_by", "created_at", "items"]


class ProductSaleItemInputSerializer(serializers.Serializer):
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("0.01"))

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from apps.inventory.models import ShopProduct
        self.fields["product"] = serializers.PrimaryKeyRelatedField(queryset=ShopProduct.objects.all())


class CreateProductSaleSerializer(serializers.Serializer):
    customer = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(), required=False, allow_null=True
    )
    is_walk_in = serializers.BooleanField(default=False)
    items = ProductSaleItemInputSerializer(many=True)
    payment_method = serializers.ChoiceField(choices=ProductSale.PaymentMethod.choices, default=ProductSale.PaymentMethod.CASH)
    note = serializers.CharField(required=False, allow_blank=True, default="")

    def create(self, validated_data):
        from apps.inventory.models import ShopProduct
        request = self.context["request"]
        shop = request.user.shop
        customer = validated_data.get("customer")
        items_data = validated_data["items"]
        payment_method = validated_data["payment_method"]
        is_walk_in = validated_data.get("is_walk_in", False)
        note = validated_data.get("note", "")

        # Determine payment status: UNPAID for non-cash credit customers
        is_credit = (
            customer is not None and
            payment_method == ProductSale.PaymentMethod.CASH and
            customer.payment_schedule != "CASH"
        )
        # If customer has credit schedule, sale goes unpaid (bill); otherwise paid
        payment_status = (
            ProductSale.PaymentStatus.UNPAID
            if (customer and customer.payment_schedule != "CASH")
            else ProductSale.PaymentStatus.PAID
        )

        total = Decimal("0")
        item_rows = []
        for it in items_data:
            product = it["product"]
            qty = it["quantity"]
            unit_price = product.sell_price
            line_total = qty * unit_price
            total += line_total
            item_rows.append((product, qty, unit_price, line_total))

        sale = ProductSale.objects.create(
            shop=shop,
            customer=customer,
            is_walk_in=is_walk_in or customer is None,
            total_amount=total,
            payment_status=payment_status,
            payment_method=payment_method,
            note=note,
            created_by=request.user,
        )

        for product, qty, unit_price, line_total in item_rows:
            ProductSaleItem.objects.create(
                sale=sale, product=product,
                quantity=qty, unit_price=unit_price, line_total=line_total,
            )
            # Deduct stock
            product.stock_quantity = max(Decimal("0"), product.stock_quantity - qty)
            product.save(update_fields=["stock_quantity"])

        # If unpaid, add to customer's debt balance
        if payment_status == ProductSale.PaymentStatus.UNPAID and customer:
            customer.debt_balance += total
            customer.save(update_fields=["debt_balance"])

        return sale


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
