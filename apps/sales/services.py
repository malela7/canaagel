from django.db import transaction
from django.utils import timezone

from apps.common.sms import send_sms
from apps.inventory.models import PaperBagStock, Stock
from apps.inventory.services import get_unit_price

from .models import Customer, Order, OrderItem


@transaction.atomic
def create_order(*, shop, customer, items, paper_bags_used=0, bottles_given=0,
                  bottles_collected=0, created_by=None, is_walk_in=False,
                  payment_method=Order.PaymentMethod.CASH):
    """
    items: list of dicts with keys milk_type, pack_size, quantity.

    Deducts Stock per item and PaperBagStock if paper_bags_used > 0.
    Sets payment_status based on customer.payment_schedule
    (CASH -> PAID immediately, credit schedules -> UNPAID).
    """
    order = Order.objects.create(
        shop=shop,
        customer=customer,
        is_walk_in=is_walk_in or customer is None,
        paper_bags_used=paper_bags_used,
        bottles_given=bottles_given,
        bottles_collected=bottles_collected,
        created_by=created_by,
        payment_method=payment_method,
    )

    total_amount = 0
    for item in items:
        milk_type = item["milk_type"]
        pack_size = item["pack_size"]
        quantity = item["quantity"]

        unit_price = get_unit_price(
            shop=shop, milk_type=milk_type, pack_size=pack_size, customer=customer,
        )
        if unit_price is None:
            raise ValueError(
                f"No price configured for {milk_type} / {pack_size}."
            )

        line_total = unit_price * quantity
        total_amount += line_total

        OrderItem.objects.create(
            order=order, milk_type=milk_type, pack_size=pack_size,
            quantity=quantity, unit_price=unit_price, line_total=line_total,
        )

        stock, _ = Stock.objects.get_or_create(shop=shop, milk_type=milk_type, pack_size=pack_size)
        stock.quantity -= quantity
        stock.save(update_fields=["quantity"])

    if paper_bags_used:
        paper_stock, _ = PaperBagStock.objects.get_or_create(shop=shop)
        paper_stock.quantity -= paper_bags_used
        paper_stock.save(update_fields=["quantity"])

    order.total_amount = total_amount

    if customer is not None and customer.payment_schedule == Customer.PaymentSchedule.CASH:
        order.payment_status = Order.PaymentStatus.PAID
    elif customer is None:
        order.payment_status = Order.PaymentStatus.PAID
    else:
        order.payment_status = Order.PaymentStatus.UNPAID
        customer.debt_balance += total_amount
        customer.save(update_fields=["debt_balance"])

    if customer is not None and customer.bottle_tracking:
        customer.bottles_out += bottles_given - bottles_collected
        customer.save(update_fields=["bottles_out"])

    order.save(update_fields=["total_amount", "payment_status"])
    return order


@transaction.atomic
def cancel_order(*, order):
    """Restore Stock/PaperBagStock and reverse any debt/bottle effects."""
    if order.payment_status == Order.PaymentStatus.CANCELLED:
        return order

    for item in order.items.all():
        stock, _ = Stock.objects.get_or_create(
            shop=order.shop, milk_type=item.milk_type, pack_size=item.pack_size
        )
        stock.quantity += item.quantity
        stock.save(update_fields=["quantity"])

    if order.paper_bags_used:
        paper_stock, _ = PaperBagStock.objects.get_or_create(shop=order.shop)
        paper_stock.quantity += order.paper_bags_used
        paper_stock.save(update_fields=["quantity"])

    customer = order.customer
    if customer is not None:
        if order.payment_status == Order.PaymentStatus.UNPAID:
            customer.debt_balance -= order.total_amount
            customer.save(update_fields=["debt_balance"])
        if customer.bottle_tracking:
            customer.bottles_out -= (order.bottles_given - order.bottles_collected)
            customer.save(update_fields=["bottles_out"])

    order.payment_status = Order.PaymentStatus.CANCELLED
    order.cancelled_at = timezone.now()
    order.save(update_fields=["payment_status", "cancelled_at"])
    return order


@transaction.atomic
def record_customer_payment(*, shop, customer, amount, method, reference="",
                             recorded_by=None, note=""):
    from .models import CustomerPayment

    payment = CustomerPayment.objects.create(
        shop=shop, customer=customer, amount=amount, method=method,
        reference=reference, recorded_by=recorded_by, note=note,
    )
    customer.debt_balance -= amount
    customer.save(update_fields=["debt_balance"])

    if customer.phone_number:
        send_sms(
            phone_number=customer.phone_number,
            message=(
                f"Payment of KES {amount} received, thank you. "
                f"Your balance is now KES {customer.debt_balance}."
            ),
        )

    return payment
