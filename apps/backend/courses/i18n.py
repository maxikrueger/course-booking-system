"""Helper für sprachsensitive API-Antworten.

Liest den Accept-Language-Header und entscheidet, welche Translation-Reihe
verwendet wird. Fällt auf 'de' zurück, wenn die gewünschte Sprache fehlt.
"""

from __future__ import annotations

from collections.abc import Iterable

from rest_framework.request import Request

from .constants import DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES


def parse_accept_language(header: str | None) -> list[str]:
    if not header:
        return []
    parts: list[tuple[str, float]] = []
    for chunk in header.split(","):
        chunk = chunk.strip()
        if not chunk:
            continue
        if ";q=" in chunk:
            lang, _, q = chunk.partition(";q=")
            try:
                weight = float(q)
            except ValueError:
                weight = 0.0
        else:
            lang, weight = chunk, 1.0
        lang_short = lang.split("-")[0].lower()
        parts.append((lang_short, weight))
    parts.sort(key=lambda item: item[1], reverse=True)
    return [lang for lang, _ in parts]


def language_from_request(request: Request) -> str:
    header = request.headers.get("Accept-Language")
    for candidate in parse_accept_language(header):
        if candidate in SUPPORTED_LANGUAGES:
            return candidate
    return DEFAULT_LANGUAGE


def pick_translation(translations: Iterable[object], language: str) -> object | None:
    """Wähle bevorzugte Übersetzung; falle auf 'de' zurück, dann auf irgendeine."""
    items = list(translations)
    if not items:
        return None
    for item in items:
        if getattr(item, "language", None) == language:
            return item
    for item in items:
        if getattr(item, "language", None) == DEFAULT_LANGUAGE:
            return item
    return items[0]
