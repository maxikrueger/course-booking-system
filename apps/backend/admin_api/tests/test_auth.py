"""Tests für Login/Refresh/Logout/Me und CookieJWT-Authentication."""

from __future__ import annotations

from typing import Any

import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from admin_api.authentication import ACCESS_COOKIE, REFRESH_COOKIE

User = get_user_model()

LOGIN_URL = reverse("admin_api:login")
REFRESH_URL = reverse("admin_api:refresh")
LOGOUT_URL = reverse("admin_api:logout")
ME_URL = reverse("admin_api:me")


@pytest.fixture
def admin_user(db: Any) -> Any:
    return User.objects.create_user(
        username="admin",
        email="admin@example.com",
        password="secret-pw-1234",
        is_staff=True,
    )


@pytest.fixture
def non_staff_user(db: Any) -> Any:
    return User.objects.create_user(
        username="alice",
        email="alice@example.com",
        password="secret-pw-1234",
        is_staff=False,
    )


@pytest.fixture
def client() -> APIClient:
    return APIClient()


def test_login_sets_httpOnly_cookies(client: APIClient, admin_user: Any) -> None:
    response = client.post(
        LOGIN_URL,
        {"username": "admin", "password": "secret-pw-1234"},
        format="json",
    )
    assert response.status_code == 200
    assert response.data["user"]["username"] == "admin"
    assert ACCESS_COOKIE in response.cookies
    assert REFRESH_COOKIE in response.cookies
    access_morsel = response.cookies[ACCESS_COOKIE]
    assert access_morsel["httponly"]
    refresh_morsel = response.cookies[REFRESH_COOKIE]
    assert refresh_morsel["httponly"]


def test_login_rejects_wrong_password(client: APIClient, admin_user: Any) -> None:
    response = client.post(
        LOGIN_URL,
        {"username": "admin", "password": "WRONG"},
        format="json",
    )
    assert response.status_code == 401
    assert response.data["error"] == "invalid_credentials"
    assert ACCESS_COOKIE not in response.cookies


def test_login_rejects_non_staff(client: APIClient, non_staff_user: Any) -> None:
    response = client.post(
        LOGIN_URL,
        {"username": "alice", "password": "secret-pw-1234"},
        format="json",
    )
    assert response.status_code == 401


def test_me_requires_auth(client: APIClient) -> None:
    response = client.get(ME_URL)
    assert response.status_code in (401, 403)


def test_me_returns_user_with_cookie(client: APIClient, admin_user: Any) -> None:
    login = client.post(
        LOGIN_URL,
        {"username": "admin", "password": "secret-pw-1234"},
        format="json",
    )
    assert login.status_code == 200
    response = client.get(ME_URL)
    assert response.status_code == 200
    assert response.data["user"]["username"] == "admin"
    assert response.data["user"]["is_staff"] is True


def test_refresh_rotates_tokens(client: APIClient, admin_user: Any) -> None:
    login = client.post(
        LOGIN_URL,
        {"username": "admin", "password": "secret-pw-1234"},
        format="json",
    )
    old_access = login.cookies[ACCESS_COOKIE].value
    response = client.post(REFRESH_URL)
    assert response.status_code == 200
    assert response.data == {"refreshed": True}
    new_access = response.cookies[ACCESS_COOKIE].value
    assert old_access != new_access


def test_refresh_without_cookie_fails(client: APIClient) -> None:
    response = client.post(REFRESH_URL)
    assert response.status_code == 401


def test_logout_clears_cookies_and_blacklists_refresh(client: APIClient, admin_user: Any) -> None:
    client.post(
        LOGIN_URL,
        {"username": "admin", "password": "secret-pw-1234"},
        format="json",
    )
    response = client.post(LOGOUT_URL)
    assert response.status_code == 200
    # Cookie wird durch leeren Wert + max-age=0 gelöscht.
    assert response.cookies[ACCESS_COOKIE].value == ""
    assert response.cookies[REFRESH_COOKIE].value == ""
    # Refresh muss nun 401 liefern (blacklisted).
    refresh = client.post(REFRESH_URL)
    assert refresh.status_code == 401


@override_settings(RATELIMIT_ENABLE=True)
def test_login_rate_limit_blocks_after_five_attempts(client: APIClient, admin_user: Any) -> None:
    # Cache muss aktiv sein; in Test-Settings ist DummyCache eingebunden.
    # Für diesen Test verwenden wir direkt LocMem damit die Rate-Limit-State
    # über Requests hinweg sichtbar ist.
    from django.core.cache import cache

    cache.clear()
    with override_settings(
        CACHES={
            "default": {
                "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
                "LOCATION": "ratelimit-test",
            }
        }
    ):
        for _ in range(5):
            client.post(
                LOGIN_URL,
                {"username": "admin", "password": "WRONG"},
                format="json",
            )
        response = client.post(
            LOGIN_URL,
            {"username": "admin", "password": "WRONG"},
            format="json",
        )
        assert response.status_code == 429
        assert response.data["error"] == "rate_limited"
