from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers

from apps.accounts.models import User

from .models import MpesaSTKRequest, Shop, SubscriptionPayment


class ShopSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shop
        fields = [
            "id",
            "name",
            "phone_number",
            "address",
            "status",
            "trial_ends_at",
            "current_period_end",
            "suspended_at",
            "created_at",
        ]
        read_only_fields = [
            "status",
            "trial_ends_at",
            "current_period_end",
            "suspended_at",
            "created_at",
        ]


class ShopRegisterSerializer(serializers.Serializer):
    """Super admin registers a new shop + its owner account in one go."""

    shop_name = serializers.CharField(max_length=255)
    shop_phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    shop_address = serializers.CharField(max_length=255, required=False, allow_blank=True)

    owner_username = serializers.CharField(max_length=150)
    owner_email = serializers.EmailField(required=False, allow_blank=True)
    owner_phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    owner_password = serializers.CharField(write_only=True, validators=[validate_password])

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
        )
        owner = User(
            username=validated_data["owner_username"],
            email=validated_data.get("owner_email", ""),
            phone_number=validated_data.get("owner_phone_number", ""),
            role=User.Role.OWNER,
            shop=shop,
        )
        owner.set_password(validated_data["owner_password"])
        owner.save()
        return shop


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
