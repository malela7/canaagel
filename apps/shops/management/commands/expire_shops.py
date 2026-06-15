from django.core.management.base import BaseCommand

from apps.shops.services import check_and_expire_shops


class Command(BaseCommand):
    """
    Run daily (via cron / Celery beat):

        python manage.py expire_shops

    Suspends any shop whose trial or paid subscription period has ended
    without a new payment.
    """

    help = "Suspend shops whose trial/subscription period has expired."

    def handle(self, *args, **options):
        updated = check_and_expire_shops()
        self.stdout.write(self.style.SUCCESS(f"Suspended {updated} shop(s)."))
