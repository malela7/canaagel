from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.common.sms import send_sms
from apps.shops.permissions import IsShopOwner

from .models import PasswordResetCode, User
from .serializers import (
    EmployeeCreateSerializer,
    EmployeeUpdateSerializer,
    MilkshopTokenObtainPairSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    UserSerializer,
)

MAX_RESET_REQUESTS_PER_WINDOW = 3
RESET_REQUEST_WINDOW_MINUTES = 10


class MilkshopTokenObtainPairView(TokenObtainPairView):
    """Login. Returns access + refresh tokens with role/shop embedded."""

    serializer_class = MilkshopTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]


class LogoutView(APIView):
    """Blacklists the supplied refresh token."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response({"detail": "refresh token is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            return Response({"detail": "invalid token"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_205_RESET_CONTENT)


class MeView(generics.RetrieveAPIView):
    """Returns the currently logged-in user, including role/shop/permissions."""

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class PasswordResetRequestView(APIView):
    """
    Send a 6-digit SMS OTP to the user's phone. Always returns 200 regardless
    of whether the username exists, to avoid leaking which usernames are valid.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        username = serializer.validated_data["username"]

        user = User.objects.filter(username=username).first()
        if user and user.phone_number:
            window_start = timezone.now() - timezone.timedelta(minutes=RESET_REQUEST_WINDOW_MINUTES)
            recent_count = PasswordResetCode.objects.filter(
                user=user, created_at__gte=window_start
            ).count()
            if recent_count < MAX_RESET_REQUESTS_PER_WINDOW:
                reset_code = PasswordResetCode.generate(user)
                send_sms(
                    phone_number=user.phone_number,
                    message=f"Your Milkshop password reset code is {reset_code.code}. It expires in 10 minutes.",
                )

        return Response({"detail": "If that account exists, a reset code has been sent by SMS."})


class PasswordResetConfirmView(APIView):
    """Validates the OTP and sets the new password."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        username = serializer.validated_data["username"]
        code = serializer.validated_data["code"]
        new_password = serializer.validated_data["new_password"]

        user = User.objects.filter(username=username).first()
        reset_code = None
        if user:
            reset_code = PasswordResetCode.objects.filter(
                user=user, code=code
            ).order_by("-created_at").first()

        if not user or not reset_code or not reset_code.is_valid:
            return Response({"detail": "Invalid or expired code."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        reset_code.used_at = timezone.now()
        reset_code.save(update_fields=["used_at"])

        return Response({"detail": "Password reset successfully."})


class EmployeeViewSet(viewsets.ModelViewSet):
    """
    Shop Owner manages their employees here: create accounts, set
    per-employee permissions, deactivate.
    """

    permission_classes = [IsShopOwner]

    def get_queryset(self):
        return User.objects.filter(
            shop=self.request.user.shop, role=User.Role.EMPLOYEE
        ).select_related("permissions")

    def get_serializer_class(self):
        if self.action == "create":
            return EmployeeCreateSerializer
        return EmployeeUpdateSerializer
