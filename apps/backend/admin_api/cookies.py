"""Helper für das Setzen/Löschen der JWT-Cookies."""

from __future__ import annotations

from datetime import timedelta
from typing import Any, cast

from django.conf import settings
from rest_framework.response import Response

from .authentication import ACCESS_COOKIE, REFRESH_COOKIE


def _common_kwargs() -> dict[str, Any]:
    domain = getattr(settings, "AUTH_COOKIE_DOMAIN", "") or None
    return {
        "httponly": True,
        "secure": bool(getattr(settings, "AUTH_COOKIE_SECURE", False)),
        "samesite": getattr(settings, "AUTH_COOKIE_SAMESITE", "Lax"),
        "domain": domain,
        "path": "/",
    }


def set_auth_cookies(response: Response, access: str, refresh: str) -> Response:
    access_lifetime = cast(timedelta, settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"])
    refresh_lifetime = cast(timedelta, settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"])
    common = _common_kwargs()
    response.set_cookie(
        ACCESS_COOKIE,
        access,
        max_age=int(access_lifetime.total_seconds()),
        httponly=common["httponly"],
        secure=common["secure"],
        samesite=common["samesite"],
        domain=common["domain"],
        path=common["path"],
    )
    response.set_cookie(
        REFRESH_COOKIE,
        refresh,
        max_age=int(refresh_lifetime.total_seconds()),
        httponly=common["httponly"],
        secure=common["secure"],
        samesite=common["samesite"],
        domain=common["domain"],
        path=common["path"],
    )
    return response


def clear_auth_cookies(response: Response) -> Response:
    domain = getattr(settings, "AUTH_COOKIE_DOMAIN", "") or None
    response.delete_cookie(ACCESS_COOKIE, domain=domain, path="/")
    response.delete_cookie(REFRESH_COOKIE, domain=domain, path="/")
    return response
