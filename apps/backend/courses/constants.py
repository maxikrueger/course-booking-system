from __future__ import annotations

LANGUAGE_CHOICES: list[tuple[str, str]] = [
    ("de", "Deutsch"),
    ("en", "English"),
    ("fr", "Français"),
]

DEFAULT_LANGUAGE = "de"
SUPPORTED_LANGUAGES = {code for code, _ in LANGUAGE_CHOICES}

SESSION_STATUS_CHOICES: list[tuple[str, str]] = [
    ("open", "Offen"),
    ("cancelled", "Abgesagt"),
    ("closed", "Geschlossen"),
]
