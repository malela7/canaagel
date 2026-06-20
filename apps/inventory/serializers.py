from rest_framework import serializers

from .models import CustomerPrice, MilkType, PackSize, PaperBagStock, Price, Stock


class MilkTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MilkType
        fields = ["id", "name", "is_active"]


class PackSizeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PackSize
        fields = ["id", "label", "litres"]


class PriceSerializer(serializers.ModelSerializer):
    milk_type_name = serializers.CharField(source="milk_type.name", read_only=True)
    pack_size_label = serializers.CharField(source="pack_size.label", read_only=True)

    class Meta:
        model = Price
        fields = [
            "id", "milk_type", "milk_type_name", "pack_size", "pack_size_label", "amount",
            "is_current", "valid_from", "valid_to",
        ]
        read_only_fields = ["is_current", "valid_from", "valid_to"]


class SetPriceSerializer(serializers.Serializer):
    """Used to create a new current price (auto-closes the previous one)."""

    milk_type = serializers.PrimaryKeyRelatedField(queryset=MilkType.objects.all())
    pack_size = serializers.PrimaryKeyRelatedField(queryset=PackSize.objects.all())
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)


class CustomerPriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerPrice
        fields = [
            "id", "customer", "milk_type", "pack_size", "amount",
            "is_current", "valid_from", "valid_to",
        ]
        read_only_fields = ["is_current", "valid_from", "valid_to"]


class SetCustomerPriceSerializer(serializers.Serializer):
    milk_type = serializers.PrimaryKeyRelatedField(queryset=MilkType.objects.all())
    pack_size = serializers.PrimaryKeyRelatedField(queryset=PackSize.objects.all())
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from apps.sales.models import Customer
        self.fields["customer"] = serializers.PrimaryKeyRelatedField(queryset=Customer.objects.all())


class StockSerializer(serializers.ModelSerializer):
    is_low = serializers.BooleanField(read_only=True)
    milk_type_name = serializers.CharField(source="milk_type.name", read_only=True)
    pack_size_label = serializers.CharField(source="pack_size.label", read_only=True)

    class Meta:
        model = Stock
        fields = [
            "id", "milk_type", "milk_type_name", "pack_size", "pack_size_label", "quantity",
            "low_stock_threshold", "is_low",
        ]


class PaperBagStockSerializer(serializers.ModelSerializer):
    is_low = serializers.BooleanField(read_only=True)

    class Meta:
        model = PaperBagStock
        fields = ["id", "label", "quantity", "low_stock_threshold", "is_low"]
