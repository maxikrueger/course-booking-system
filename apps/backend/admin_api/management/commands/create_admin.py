"""Legt einen Admin-User an (idempotent).

Das Passwort kommt aus `--password` oder `DJANGO_ADMIN_PASSWORD`. Fehlt beides,
wird nur mit `DEBUG=True` auf das Dev-Default `admin123` zurückgefallen – ohne
DEBUG bricht der Command ab, damit keine Instanz mit bekanntem Passwort online geht.
"""

from __future__ import annotations

import os
from typing import Any

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

DEV_DEFAULT_PASSWORD = "admin123"


class Command(BaseCommand):
    help = "Lege einen Admin-User an (idempotent)."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--username", default="admin")
        parser.add_argument("--email", default="admin@example.com")
        parser.add_argument(
            "--password",
            default=None,
            help="Passwort. Ohne Angabe: DJANGO_ADMIN_PASSWORD, sonst Dev-Default (nur mit DEBUG).",
        )

    def _resolve_password(self, explicit: str | None) -> str:
        if explicit:
            return explicit

        from_env = os.environ.get("DJANGO_ADMIN_PASSWORD", "").strip()
        if from_env:
            return from_env

        if not settings.DEBUG:
            raise CommandError(
                "Kein Passwort gesetzt. Mit DEBUG=False ist --password oder "
                "DJANGO_ADMIN_PASSWORD Pflicht – das Dev-Default wird nicht verwendet."
            )

        self.stdout.write(
            self.style.WARNING(
                f"DEBUG=True: nutze Dev-Default-Passwort '{DEV_DEFAULT_PASSWORD}'. "
                "Niemals ausserhalb der lokalen Entwicklung verwenden."
            )
        )
        return DEV_DEFAULT_PASSWORD

    def handle(self, *args: Any, **options: Any) -> None:
        password = self._resolve_password(options["password"])
        user_model = get_user_model()
        username = options["username"]
        email = options["email"]

        user, created = user_model.objects.get_or_create(
            username=username,
            defaults={"email": email, "is_staff": True, "is_superuser": True},
        )
        user.is_staff = True
        user.is_superuser = True
        user.email = email
        user.set_password(password)
        user.save()

        action = "angelegt" if created else "aktualisiert"
        self.stdout.write(self.style.SUCCESS(f"Admin '{username}' {action}."))
