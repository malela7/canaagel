from django.contrib import admin

from .models import CustomerPrice, MilkType, PackSize, PaperBagStock, Price, Stock

admin.site.register(MilkType)
admin.site.register(PackSize)
admin.site.register(Price)
admin.site.register(CustomerPrice)
admin.site.register(Stock)
admin.site.register(PaperBagStock)
