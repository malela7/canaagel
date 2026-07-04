from django.db import transaction
from django.utils import timezone

from .models import CustomerPrice, Price


@transaction.atomic
def set_current_price(*, shop, milk_type, pack_size, amount):
    """Close any existing current price for this combo and create a new one."""
    now = timezone.now()
    Price.objects.filter(
        shop=shop, milk_type=milk_type, pack_size=pack_size, is_current=True
    ).update(is_current=False, valid_to=now)

    return Price.objects.create(
        shop=shop,
        milk_type=milk_type,
        pack_size=pack_size,
        amount=amount,
        is_current=True,
        valid_from=now,
    )


@transaction.atomic
def set_current_customer_price(*, shop, customer, milk_type, pack_size, amount):
    now = timezone.now()
    CustomerPrice.objects.filter(
        shop=shop, customer=customer, milk_type=milk_type, pack_size=pack_size, is_current=True
    ).update(is_current=False, valid_to=now)

    return CustomerPrice.objects.create(
        shop=shop,
        customer=customer,
        milk_type=milk_type,
        pack_size=pack_size,
        amount=amount,
        is_current=True,
        valid_from=now,
    )


def get_unit_price(*, shop, milk_type, pack_size, customer=None):
    """
    Price lookup order: customer special price -> shop default price -> None.
    Returns a Decimal amount, or None if no price is configured.
    """
    if customer is not None:
        special = (
            CustomerPrice.objects.filter(
                shop=shop, customer=customer, milk_type=milk_type,
                pack_size=pack_size, is_current=True,
            )
            .order_by("-valid_from")
            .first()
        )
        if special:
            return special.amount

    default = (
        Price.objects.filter(
            shop=shop, milk_type=milk_type, pack_size=pack_size, is_current=True,
        )
        .order_by("-valid_from")
        .first()
    )
    return default.amount if default else None
