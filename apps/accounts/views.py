from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.shops.permissions import IsShopOwner

from .models import User
from .serializers import (
    EmployeeCreateSerializer,
    EmployeeUpdateSerializer,
    MilkshopTokenObtainPairSerializer,
    UserSerializer,
)


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
