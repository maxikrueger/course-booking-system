"""Test-Settings mit PostgreSQL.

Wird für Tests benötigt, die echtes transaktionales Verhalten und
SELECT FOR UPDATE über parallele Connections testen (Race-Condition).

Voraussetzung: 'make db-up' (Docker-Compose Postgres 16). Django legt selbst
eine Test-DB 'test_buchung' an und räumt nach jedem Lauf wieder auf.
"""

from __future__ import annotations

import os

from .base import *  # noqa: F401,F403

DEBUG = False

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", "buchung"),
        "USER": os.environ.get("POSTGRES_USER", "buchung"),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "buchung_dev"),
        "HOST": os.environ.get("POSTGRES_HOST", "localhost"),
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),
        "ATOMIC_REQUESTS": False,
        "TEST": {"NAME": "test_buchung"},
    },
}

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

RATELIMIT_ENABLE = False
