"""Test-Settings: schnelle SQLite-DB, kein Cache."""

from __future__ import annotations

from .base import *  # noqa: F401,F403

DEBUG = False

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    },
}

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

# Rate-Limit in Tests deaktivieren (sonst floodet der Test-Login die Limits).
RATELIMIT_ENABLE = False

# DummyCache, damit Tests keinen geteilten LocMem-State über Test-Klassen hinweg sehen.
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.dummy.DummyCache",
    },
}
