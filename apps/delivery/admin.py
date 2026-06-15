from django.contrib import admin

from .models import DeliveryRecord, Transporter, TransporterPayment

admin.site.register(Transporter)
admin.site.register(TransporterPayment)
admin.site.register(DeliveryRecord)
