from django.db import transaction
from django.db.models import Sum
from rest_framework import serializers

from apps.accounts.models import User

from .models import MpesaSTKRequest, Shop, SubscriptionPayment


class ShopSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()
    owner_phone_number = serializers.SerializerMethodField()
    owner_email = serializers.SerializerMethodField()
    total_sales = serializers.SerializerMethodField()
    customer_count = serializers.SerializerMethodField()

    class Meta:
        model = Shop
        fields = [
            "id",
            "name",
            "phone_number",
            "address",
            "status",
            "plan",
            "monthly_fee",
            "shop_type",
            "trial_ends_at",
            "current_period_end",
            "suspended_at",
            "created_at",
            "owner_name",
            "owner_phone_number",
            "owner_email",
            "total_sales",
            "customer_count",
        ]
        read_only_fields = [
            "status",
            "trial_ends_at",
            "current_period_end",
            "suspended_at",
            "created_at",
        ]

    def _owner(self, shop):
        if not hasattr(shop, "_owner_cache"):
            shop._owner_cache = shop.users.filter(role=User.Role.OWNER).first()
        return shop._owner_cache

    def get_owner_name(self, shop):
        owner = self._owner(shop)
        if not owner:
            return ""
        return f"{owner.first_name} {owner.last_name}".strip() or owner.username

    def get_owner_phone_number(self, shop):
        owner = self._owner(shop)
        return owner.phone_number if owner else ""

    def get_owner_email(self, shop):
        owner = self._owner(shop)
        return owner.email if owner else ""

    def get_total_sales(self, shop):
        from apps.sales.models import Order
        return Order.objects.filter(shop=shop).aggregate(total=Sum("total_amount"))["total"] or 0

    def get_customer_count(self, shop):
        from apps.sales.models import Customer
        return Customer.objects.filter(shop=shop).count()


class ShopRegisterSerializer(serializers.Serializer):
    """Super admin registers a new shop + its owner account in one go."""

    shop_name = serializers.CharField(max_length=255)
    shop_phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    shop_address = serializers.CharField(max_length=255, required=False, allow_blank=True)
    plan = serializers.ChoiceField(choices=Shop.Plan.choices, default=Shop.Plan.TRIAL)
    monthly_fee = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    shop_type = serializers.ChoiceField(choices=Shop.ShopType.choices, default=Shop.ShopType.MILK)

    owner_username = serializers.CharField(max_length=150)
    owner_first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    owner_last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    owner_email = serializers.EmailField(required=False, allow_blank=True)
    owner_phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    owner_password = serializers.CharField(write_only=True, min_length=4)

    def validate_owner_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("That username is already taken.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        shop = Shop.objects.create(
            name=validated_data["shop_name"],
            phone_number=validated_data.get("shop_phone_number", ""),
            address=validated_data.get("shop_address", ""),
            plan=validated_data.get("plan", Shop.Plan.TRIAL),
            monthly_fee=validated_data.get("monthly_fee", 0),
            shop_type=validated_data.get("shop_type", Shop.ShopType.MILK),
        )
        owner = User(
            username=validated_data["owner_username"],
            first_name=validated_data.get("owner_first_name", ""),
            last_name=validated_data.get("owner_last_name", ""),
            email=validated_data.get("owner_email", ""),
            phone_number=validated_data.get("owner_phone_number", ""),
            role=User.Role.OWNER,
            shop=shop,
        )
        owner.set_password(validated_data["owner_password"])
        owner.save()
        return shop


class ShopUpdateSerializer(serializers.ModelSerializer):
    """Admin edits an existing shop's basic details."""

    class Meta:
        model = Shop
        fields = ["name", "phone_number", "address", "plan", "monthly_fee", "shop_type"]


class SubscriptionPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPayment
        fields = [
            "id",
            "shop",
            "amount",
            "method",
            "mpesa_receipt_number",
            "period_start",
            "period_end",
            "note",
            "paid_at",
        ]
        read_only_fields = ["shop", "period_start", "period_end", "paid_at"]


class ExtendTrialSerializer(serializers.Serializer):
    days = serializers.IntegerField(min_value=1, default=30)


class STKPushSerializer(serializers.Serializer):
    phone_number = serializers.RegexField(
        regex=r"^2547\d{8}$",
        help_text="Format: 2547XXXXXXXX",
    )


class MpesaSTKRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = MpesaSTKRequest
        fields = [
            "id",
            "checkout_request_id",
            "phone_number",
            "amount",
            "status",
            "result_description",
            "created_at",
        ]
