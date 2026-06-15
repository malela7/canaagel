from django.contrib import admin

from .models import Customer, CustomerPayment, Order, OrderItem, StandingOrderItem

admin.site.register(Customer)
admin.site.register(StandingOrderItem)
admin.site.register(Order)
admin.site.register(OrderItem)
admin.site.register(CustomerPayment)
