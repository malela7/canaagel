from datetime import date

from django.db.models import Sum
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import HasShopPermission
from apps.inventory.models import PaperBagStock
from apps.sales.models import Customer, Order, OrderItem
from apps.shops.models import Shop, SubscriptionPayment
from apps.shops.permissions import IsSuperAdmin
from apps.suppliers.models import SupplierDelivery

ViewReports = HasShopPermission("can_view_reports")


def _date_range(request):
    start = request.query_params.get("start")
    end = request.query_params.get("end")
    today = date.today()
    start_date = date.fromisoformat(start) if start else today
    end_date = date.fromisoformat(end) if end else today
    return start_date, end_date


class SalesReportView(APIView):
    permission_classes = [ViewReports]

    def get(self, request):
        start_date, end_date = _date_range(request)
        shop = request.user.shop

        orders = Order.objects.filter(
            shop=shop,
            payment_status__in=[Order.PaymentStatus.PAID, Order.PaymentStatus.UNPAID],
            created_at__date__range=(start_date, end_date),
        )
        totals = orders.aggregate(total_sales=Sum("total_amount"))

        by_item = (
            OrderItem.objects.filter(order__in=orders)
            .values("milk_type__name", "pack_size__label")
            .annotate(total_quantity=Sum("quantity"), total_revenue=Sum("line_total"))
            .order_by("milk_type__name", "pack_size__label")
        )

        return Response({
            "start_date": start_date,
            "end_date": end_date,
            "total_sales": totals["total_sales"] or 0,
            "order_count": orders.count(),
            "by_item": list(by_item),
        })


class DebtReportView(APIView):
    permission_classes = [ViewReports]

    def get(self, request):
        shop = request.user.shop
        customers = Customer.objects.filter(shop=shop, debt_balance__gt=0).order_by("-debt_balance")
        data = [
            {"id": c.id, "name": c.name, "phone_number": c.phone_number, "debt_balance": c.debt_balance}
            for c in customers
        ]
        return Response({
            "total_debt": sum(c.debt_balance for c in customers),
            "customers": data,
        })


class PaperBagsReportView(APIView):
    permission_classes = [ViewReports]

    def get(self, request):
        shop = request.user.shop
        start_date, end_date = _date_range(request)

        bought = SupplierDelivery.objects.filter(
            shop=shop, kind=SupplierDelivery.Kind.PAPER,
            delivered_at__date__range=(start_date, end_date),
        ).aggregate(total=Sum("quantity"))["total"] or 0

        used = Order.objects.filter(
            shop=shop, created_at__date__range=(start_date, end_date),
        ).exclude(payment_status=Order.PaymentStatus.CANCELLED).aggregate(
            total=Sum("paper_bags_used")
        )["total"] or 0

        stocks = PaperBagStock.objects.filter(shop=shop)

        return Response({
            "start_date": start_date,
            "end_date": end_date,
            "bought": bought,
            "used": used,
            "remaining": [
                {"label": s.label, "quantity": s.quantity, "is_low": s.is_low} for s in stocks
            ],
        })


class SuppliersReportView(APIView):
    permission_classes = [ViewReports]

    def get(self, request):
        shop = request.user.shop
        start_date, end_date = _date_range(request)

        deliveries = SupplierDelivery.objects.filter(
            shop=shop, delivered_at__date__range=(start_date, end_date),
        )
        by_supplier = (
            deliveries.values("supplier__name", "kind")
            .annotate(total_cost=Sum("total_cost"), total_quantity=Sum("quantity"))
            .order_by("supplier__name", "kind")
        )

        return Response({
            "start_date": start_date,
            "end_date": end_date,
            "total_cost": deliveries.aggregate(total=Sum("total_cost"))["total"] or 0,
            "by_supplier": list(by_supplier),
        })


class BottlesReportView(APIView):
    permission_classes = [ViewReports]

    def get(self, request):
        shop = request.user.shop
        customers = Customer.objects.filter(shop=shop, bottle_tracking=True, bottles_out__gt=0)
        data = [
            {"id": c.id, "name": c.name, "bottles_out": c.bottles_out}
            for c in customers
        ]
        return Response({
            "total_bottles_out": sum(c.bottles_out for c in customers),
            "customers": data,
        })


class SubscriptionsReportView(APIView):
    """Super admin only -- platform-wide subscription overview."""

    permission_classes = [IsSuperAdmin]

    def get(self, request):
        shops = Shop.objects.all()
        counts = {status: shops.filter(status=status).count() for status, _ in Shop.Status.choices}

        recent_payments = SubscriptionPayment.objects.select_related("shop").order_by("-paid_at")[:50]
        payments_data = [
            {
                "shop": p.shop.name,
                "amount": p.amount,
                "method": p.method,
                "paid_at": p.paid_at,
            }
            for p in recent_payments
        ]

        return Response({
            "shop_counts": counts,
            "total_shops": shops.count(),
            "recent_payments": payments_data,
        })
