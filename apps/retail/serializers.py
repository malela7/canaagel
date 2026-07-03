from rest_framework import serializers
from .models import Expense, Product, ProductCategory, StockOrder, StockOrderItem


class ProductCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductCategory
        fields = ["id", "name"]
        read_only_fields = ["id"]


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    is_low = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id", "name", "category", "category_name",
            "cost_price", "sell_price", "wholesale_price",
            "quantity", "low_stock_threshold", "is_active", "is_low",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_category_name(self, obj):
        return obj.category.name if obj.category else ""


class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = ["id", "description", "amount", "category", "expense_date", "created_at"]
        read_only_fields = ["id", "created_at"]


class StockOrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField()

    class Meta:
        model = StockOrderItem
        fields = ["id", "product", "product_name", "quantity", "unit_cost", "line_total"]

    def get_product_name(self, obj):
        return obj.product.name


class StockOrderSerializer(serializers.ModelSerializer):
    items = StockOrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = StockOrder
        fields = [
            "id", "supplier_name", "status", "total_cost", "notes",
            "ordered_at", "received_at", "cancelled_at", "items",
        ]
        read_only_fields = ["id", "ordered_at", "received_at", "cancelled_at"]


class StockOrderCreateSerializer(serializers.Serializer):
    supplier_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    items = serializers.ListField(child=serializers.DictField(), min_length=1)

    def validate_items(self, value):
        for item in value:
            if "product" not in item or "quantity" not in item or "unit_cost" not in item:
                raise serializers.ValidationError("Each item needs product, quantity, and unit_cost.")
        return value
