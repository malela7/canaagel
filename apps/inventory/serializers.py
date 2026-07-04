from rest_framework import serializers

from .models import CustomerPrice, MilkType, PackSize, PaperBagStock, Price, ShopProduct, Stock, Supplier, SupplierBill


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
            "id", "milk_type", "milk_type_name", "pack_size", "pack_size_label",
            "amount", "cost_price", "is_current", "valid_from", "valid_to",
        ]
        read_only_fields = ["is_current", "valid_from", "valid_to"]


class SetPriceSerializer(serializers.Serializer):
    """Used to create a new current price (auto-closes the previous one)."""

    milk_type = serializers.PrimaryKeyRelatedField(queryset=MilkType.objects.all())
    pack_size = serializers.PrimaryKeyRelatedField(queryset=PackSize.objects.all())
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    cost_price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0, default=0, required=False)


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


class ShopProductSerializer(serializers.ModelSerializer):
    profit_margin = serializers.FloatField(read_only=True)

    class Meta:
        model = ShopProduct
        fields = [
            "id", "name", "cost_price", "sell_price", "stock_quantity",
            "is_active", "profit_margin", "created_at",
        ]
        read_only_fields = ["created_at"]


class PaperBagStockSerializer(serializers.ModelSerializer):
    is_low = serializers.BooleanField(read_only=True)

    class Meta:
        model = PaperBagStock
        fields = ["id", "label", "quantity", "low_stock_threshold", "is_low"]


class SupplierBillSerializer(serializers.ModelSerializer):
    balance = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = SupplierBill
        fields = ["id", "date", "total_amount", "amount_paid", "balance", "note", "created_at"]
        read_only_fields = ["created_at"]


class SupplierSerializer(serializers.ModelSerializer):
    bills = SupplierBillSerializer(many=True, read_only=True)
    total_owed = serializers.SerializerMethodField()

    class Meta:
        model = Supplier
        fields = ["id", "name", "phone", "note", "bills", "total_owed", "created_at"]
        read_only_fields = ["created_at"]

    def get_total_owed(self, obj):
        return sum(b.balance for b in obj.bills.all())
