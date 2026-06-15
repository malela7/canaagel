from django.urls import path

from .views import (
    BottlesReportView,
    DebtReportView,
    PaperBagsReportView,
    SalesReportView,
    SubscriptionsReportView,
    SuppliersReportView,
)

app_name = "reports"

urlpatterns = [
    path("sales/", SalesReportView.as_view(), name="sales"),
    path("debt/", DebtReportView.as_view(), name="debt"),
    path("paper-bags/", PaperBagsReportView.as_view(), name="paper-bags"),
    path("suppliers/", SuppliersReportView.as_view(), name="suppliers"),
    path("bottles/", BottlesReportView.as_view(), name="bottles"),
    path("subscriptions/", SubscriptionsReportView.as_view(), name="subscriptions"),
]
