from django.contrib import admin

from .models import EmployeePermissions, User

admin.site.register(User)
admin.site.register(EmployeePermissions)
