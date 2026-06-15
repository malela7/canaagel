from django.contrib import admin

from .models import MpesaSTKRequest, Shop, SubscriptionPayment

admin.site.register(Shop)
admin.site.register(SubscriptionPayment)
admin.site.register(MpesaSTKRequest)
