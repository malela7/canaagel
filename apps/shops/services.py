from datetime import timedelta

from django.utils import timezone

from apps.common.sms import send_sms

from .models import Shop, SubscriptionPayment


def _notify_shop(shop, message):
    phone_number = shop.phone_number
    if phone_number:
        send_sms(phone_number=phone_number, message=message)


def record_subscription_payment(
    *, shop: Shop, amount, method, period_days=30, recorded_by=None,
    mpesa_receipt_number="", note="",
):
    """
    Record a subscription payment and IMMEDIATELY reactivate the shop.

    Per the business rules: this happens automatically whether the payment
    came from the M-Pesa STK callback or was recorded manually by the
    super admin -- no separate "reactivate" step.
    """
    now = timezone.now()

    # New period starts from "now" if the shop was suspended/expired/trial,
    # or extends from the existing period end if still within a paid period.
    if shop.current_period_end and shop.current_period_end > now:
        period_start = shop.current_period_end
    else:
        period_start = now

    period_end = period_start + timedelta(days=period_days)

    payment = SubscriptionPayment.objects.create(
        shop=shop,
        amount=amount,
        method=method,
        mpesa_receipt_number=mpesa_receipt_number,
        period_start=period_start,
        period_end=period_end,
        recorded_by=recorded_by,
        note=note,
        paid_at=now,
    )

    shop.status = Shop.Status.ACTIVE
    shop.current_period_end = period_end
    shop.suspended_at = None
    shop.save(update_fields=["status", "current_period_end", "suspended_at", "updated_at"])

    _notify_shop(
        shop,
        f"Milkshop SaaS: payment of KES {amount} received. Your subscription is "
        f"active until {period_end:%Y-%m-%d}. Thank you!",
    )

    return payment


def check_and_expire_shops():
    """
    Run periodically (e.g. daily via cron/Celery). Any shop whose trial or
    paid period has ended with no new payment gets auto-suspended.
    Super admin is never affected by this.
    """
    now = timezone.now()
    updated = 0

    suspension_message = (
        "Milkshop SaaS: your subscription has expired and access is now "
        "suspended. Pay via M-Pesa from the app to reactivate instantly."
    )

    trial_expired = Shop.objects.filter(
        status=Shop.Status.TRIAL, trial_ends_at__lt=now
    )
    for shop in trial_expired:
        shop.status = Shop.Status.SUSPENDED
        shop.suspended_at = now
        shop.save(update_fields=["status", "suspended_at", "updated_at"])
        _notify_shop(shop, suspension_message)
        updated += 1

    period_expired = Shop.objects.filter(
        status=Shop.Status.ACTIVE,
        current_period_end__lt=now,
    )
    for shop in period_expired:
        shop.status = Shop.Status.SUSPENDED
        shop.suspended_at = now
        shop.save(update_fields=["status", "suspended_at", "updated_at"])
        _notify_shop(shop, suspension_message)
        updated += 1

    return updated
