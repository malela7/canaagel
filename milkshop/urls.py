from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/shops/", include("apps.shops.urls")),
    path("api/v1/inventory/", include("apps.inventory.urls")),
    path("api/v1/suppliers/", include("apps.suppliers.urls")),
    path("api/v1/sales/", include("apps.sales.urls")),
    path("api/v1/delivery/", include("apps.delivery.urls")),
    path("api/v1/reports/", include("apps.reports.urls")),
]
