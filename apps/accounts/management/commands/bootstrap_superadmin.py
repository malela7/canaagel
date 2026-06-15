import getpass

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError

from apps.accounts.models import User


class Command(BaseCommand):
    """
    Run once after first deploy:

        python manage.py bootstrap_superadmin

    Prompts interactively for username/email/password -- nothing is ever
    written to code, fixtures, or .env files.
    """

    help = "Create the first SUPER_ADMIN user interactively."

    def handle(self, *args, **options):
        if User.objects.filter(role=User.Role.SUPER_ADMIN).exists():
            raise CommandError("A super admin already exists.")

        username = input("Super admin username: ").strip()
        if not username:
            raise CommandError("Username cannot be empty.")
        if User.objects.filter(username=username).exists():
            raise CommandError("That username is already taken.")

        email = input("Super admin email: ").strip()

        while True:
            password = getpass.getpass("Super admin password: ")
            password_confirm = getpass.getpass("Confirm password: ")
            if password != password_confirm:
                self.stderr.write("Passwords do not match. Try again.")
                continue
            try:
                validate_password(password)
            except ValidationError as exc:
                self.stderr.write("\n".join(exc.messages))
                continue
            break

        User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            role=User.Role.SUPER_ADMIN,
        )
        self.stdout.write(self.style.SUCCESS(f"Super admin '{username}' created."))
