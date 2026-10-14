"""Auth-Endpoints für das Admin-UI.

- POST /api/v1/admin/auth/login/    – Username/Passwort, Cookies setzen
- POST /api/v1/admin/auth/refresh/  – Access-Token aus Refresh-Cookie erneuern
- POST /api/v1/admin/auth/logout/   – Cookies löschen + Refresh blacklisten
- GET  /api/v1/admin/auth/me/       – Aktuellen Admin-User zurückgeben
"""

from __future__ import annotations

from typing import Any

from django.conf import settings
from django.contrib.auth import authenticate
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from rest_framework import permissions, serializers, status
from rest_framework.permissions import IsAdminUser
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .authentication import REFRESH_COOKIE
from .cookies import clear_auth_cookies, set_auth_cookies


class LoginSerializer(serializers.Serializer[Any]):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True)


def _user_payload(user: Any) -> dict[str, Any]:
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
    }


@method_decorator(
    ratelimit(key="ip", rate="5/m", method="POST", block=False),
    name="dispatch",
)
class LoginView(APIView):
    """Login mit Rate-Limit (5 Versuche/min/IP)."""

    permission_classes = [permissions.AllowAny]
    authentication_classes: list[Any] = []

    def post(self, request: Request) -> Response:
        if getattr(request, "limited", False):
            return Response(
                {
                    "error": "rate_limited",
                    "message": "Zu viele Login-Versuche. Bitte später erneut probieren.",
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            request,
            username=serializer.validated_data["username"],
            password=serializer.validated_data["password"],
        )
        if user is None or not user.is_staff or not user.is_active:
            return Response(
                {"error": "invalid_credentials", "message": "Login fehlgeschlagen."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        access = refresh.access_token
        response = Response(
            {"user": _user_payload(user)},
            status=status.HTTP_200_OK,
        )
        set_auth_cookies(response, access=str(access), refresh=str(refresh))
        return response


class RefreshView(APIView):
    """Erneuert das Access-Cookie auf Basis des Refresh-Cookies.

    Bei aktiver Rotation wird das alte Refresh-Token blacklistet und ein
    neues ausgestellt. Voraussetzung: ``rest_framework_simplejwt.token_blacklist``
    in ``INSTALLED_APPS`` und ``BLACKLIST_AFTER_ROTATION``-Setting.
    """

    permission_classes = [permissions.AllowAny]
    authentication_classes: list[Any] = []

    def post(self, request: Request) -> Response:
        raw_refresh = request.COOKIES.get(REFRESH_COOKIE)
        if not raw_refresh:
            return Response(
                {"error": "no_refresh_token"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        try:
            refresh = RefreshToken(raw_refresh.encode("utf-8"))  # type: ignore[arg-type]
        except TokenError as exc:
            raise InvalidToken({"error": "invalid_refresh_token"}) from exc

        access = refresh.access_token
        new_refresh_str = str(refresh)

        if settings.SIMPLE_JWT.get("ROTATE_REFRESH_TOKENS"):
            if settings.SIMPLE_JWT.get("BLACKLIST_AFTER_ROTATION"):
                try:
                    refresh.blacklist()
                except AttributeError:
                    pass
            refresh.set_jti()
            refresh.set_exp()
            refresh.set_iat()
            new_refresh_str = str(refresh)

        response = Response({"refreshed": True}, status=status.HTTP_200_OK)
        set_auth_cookies(response, access=str(access), refresh=new_refresh_str)
        return response


class LogoutView(APIView):
    """Löscht Cookies und versucht das Refresh-Token zu blacklisten."""

    permission_classes = [permissions.AllowAny]
    authentication_classes: list[Any] = []

    def post(self, request: Request) -> Response:
        raw_refresh = request.COOKIES.get(REFRESH_COOKIE)
        if raw_refresh:
            try:
                RefreshToken(raw_refresh.encode("utf-8")).blacklist()  # type: ignore[arg-type]
            except (TokenError, AttributeError):
                pass
        response = Response({"detail": "logged_out"}, status=status.HTTP_200_OK)
        clear_auth_cookies(response)
        return response


class MeView(APIView):
    """Gibt den aktuellen Admin-User zurück (200) oder 401."""

    permission_classes = [IsAdminUser]

    def get(self, request: Request) -> Response:
        return Response({"user": _user_payload(request.user)})
