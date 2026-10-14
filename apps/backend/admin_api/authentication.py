"""JWT-Authentication via httpOnly-Cookies.

Liest Access-Tokens aus dem Cookie ``access_token`` statt aus dem
``Authorization``-Header. Damit speichert das Frontend keine Tokens im
``localStorage`` (XSS-Hardening).
"""

from __future__ import annotations

from django.conf import settings
from rest_framework.request import Request
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import Token

ACCESS_COOKIE = "access_token"
REFRESH_COOKIE = "refresh_token"


class CookieJWTAuthentication(JWTAuthentication):
    """JWT-Authentication, die zuerst das Access-Cookie liest, sonst Header."""

    def authenticate(self, request: Request) -> tuple[object, Token] | None:  # type: ignore[override]
        raw_token = request.COOKIES.get(getattr(settings, "JWT_ACCESS_COOKIE", ACCESS_COOKIE))
        if raw_token is None:
            return super().authenticate(request)
        validated = self.get_validated_token(raw_token.encode("utf-8"))
        return self.get_user(validated), validated
