from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import EmployeePermissions, User


class MilkshopTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["shop_id"] = user.shop_id
        return token


class EmployeePermissionsSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeePermissions
        fields = [
            "can_use_pos",
            "can_view_inventory",
            "can_manage_inventory",
            "can_manage_suppliers",
            "can_manage_customers",
            "can_view_reports",
            "can_manage_delivery",
            "can_record_payments",
        ]


class UserSerializer(serializers.ModelSerializer):
    permissions = EmployeePermissionsSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "role",
            "shop",
            "permissions",
        ]
        read_only_fields = ["role", "shop"]


class EmployeeCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    permissions = EmployeePermissionsSerializer(required=False)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "password",
            "permissions",
        ]

    def create(self, validated_data):
        permissions_data = validated_data.pop("permissions", {})
        password = validated_data.pop("password")
        request = self.context["request"]

        user = User(
            role=User.Role.EMPLOYEE,
            shop=request.user.shop,
            **validated_data,
        )
        user.set_password(password)
        user.save()
        EmployeePermissions.objects.create(user=user, **permissions_data)
        return user


class EmployeeUpdateSerializer(serializers.ModelSerializer):
    permissions = EmployeePermissionsSerializer(required=False)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "is_active",
            "permissions",
        ]

    def update(self, instance, validated_data):
        permissions_data = validated_data.pop("permissions", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if permissions_data is not None:
            perms, _ = EmployeePermissions.objects.get_or_create(user=instance)
            for attr, value in permissions_data.items():
                setattr(perms, attr, value)
            perms.save()

        return instance
