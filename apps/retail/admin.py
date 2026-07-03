from django.contrib import admin
from .models import ProductCategory, Product, Expense, StockOrder, StockOrderItem

admin.site.register(ProductCategory)
admin.site.register(Product)
admin.site.register(Expense)
admin.site.register(StockOrder)
admin.site.register(StockOrderItem)
