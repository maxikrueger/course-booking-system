"""Race-Condition-Test für POST /api/v1/bookings/.

Zwei Threads versuchen gleichzeitig die letzte freie Stelle zu buchen.
Das Backend muss via SELECT FOR UPDATE garantieren, dass genau eine
Buchung erfolgreich ist und die andere mit error=session_full abgewiesen wird.

Erfordert PostgreSQL: SQLite serialisiert Connections und kennt kein echtes
SELECT FOR UPDATE über Connections hinweg. Wenn pytest mit den SQLite-Test-
Settings läuft, wird der Test übersprungen mit klarem Hinweis.
'make test-race' verwendet dafür die test_pg-Settings.
"""

from __future__ import annotations

import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from decimal import Decimal
from typing import Any

import pytest
from django.db import connection, connections
from django.utils import timezone
from rest_framework.test import APIClient

from bookings.models import Booking
from courses.models import (
    Category,
    CategoryTranslation,
    Course,
    CourseSession,
    CourseTranslation,
    Location,
)

pytestmark = pytest.mark.skipif(
    connection.vendor != "postgresql",
    reason=(
        "Race-Condition-Test verlangt PostgreSQL für echtes SELECT FOR UPDATE. "
        "Mit 'make test-race' (im backend-Makefile) ausführen."
    ),
)


def _payload(session_id: int, email: str) -> dict[str, Any]:
    return {
        "session_id": session_id,
        "salutation": "mr",
        "first_name": "Race",
        "last_name": "Tester",
        "email": email,
        "phone": "+41791234567",
        "street": "Musterweg 1",
        "postal_code": "8000",
        "city": "Zürich",
        "country": "CH",
        "date_of_birth": "1995-03-15",
        "license_date": "2020-08-01",
        "voucher_code": "",
        "notes": "",
        "language": "de",
        "accept_terms": True,
    }


@pytest.mark.django_db(transaction=True)
def test_two_parallel_bookings_for_last_spot() -> None:
    """Zwei parallele Threads, ein freier Platz – exakt eine Bestätigung."""
    category = Category.objects.create(slug="auto", order=1, is_active=True)
    CategoryTranslation.objects.create(category=category, language="de", name="Auto")

    location = Location.objects.create(
        slug="nordwest",
        name="Trainingszentrum Nordwest",
        address_line="Industriestrasse 12",
        postal_code="4132",
        city="Muttenz",
        country="CH",
    )
    course = Course.objects.create(
        slug="wab-kurs-deutsch",
        category=category,
        base_price_chf=Decimal("350.00"),
        duration_hours=Decimal("7.00"),
    )
    CourseTranslation.objects.create(
        course=course, language="de", title="WAB-Kurs", short_description="x"
    )
    start = timezone.now() + timedelta(days=10)
    session = CourseSession.objects.create(
        course=course,
        location=location,
        start_datetime=start,
        end_datetime=start + timedelta(hours=7),
        max_participants=1,  # nur EIN Platz
        price_chf=course.base_price_chf,
        status="open",
    )

    # Beide Threads starten gleichzeitig
    barrier = threading.Barrier(parties=2, timeout=10)

    def book(email: str) -> int:
        barrier.wait()
        try:
            client = APIClient()
            response = client.post(
                "/api/v1/bookings/",
                data=_payload(session.id, email),
                format="json",
            )
            return int(response.status_code)
        finally:
            connections.close_all()

    with ThreadPoolExecutor(max_workers=2) as pool:
        f1 = pool.submit(book, "a@example.com")
        f2 = pool.submit(book, "b@example.com")
        codes = sorted([f1.result(timeout=15), f2.result(timeout=15)])

    # Genau eine 201 (erfolgreich), eine 400 (session_full).
    assert codes == [201, 400], f"Erwartet [201, 400], bekam {codes}"

    bookings = Booking.objects.filter(session=session, status="confirmed")
    assert bookings.count() == 1, (
        f"Es darf nur EINE bestätigte Buchung existieren, gefunden: {bookings.count()}"
    )


@pytest.mark.django_db(transaction=True)
def test_overbooking_under_high_concurrency() -> None:
    """5 Threads, 2 Plätze – exakt 2 Bestätigungen, 3 Ablehnungen."""
    category = Category.objects.create(slug="auto", order=1, is_active=True)
    CategoryTranslation.objects.create(category=category, language="de", name="Auto")
    location = Location.objects.create(
        slug="nordwest",
        name="Trainingszentrum Nordwest",
        address_line="x",
        postal_code="4132",
        city="Muttenz",
    )
    course = Course.objects.create(
        slug="wab-kurs-deutsch",
        category=category,
        base_price_chf=Decimal("350.00"),
        duration_hours=Decimal("7.00"),
    )
    CourseTranslation.objects.create(
        course=course, language="de", title="WAB-Kurs", short_description="x"
    )
    start = timezone.now() + timedelta(days=10)
    session = CourseSession.objects.create(
        course=course,
        location=location,
        start_datetime=start,
        end_datetime=start + timedelta(hours=7),
        max_participants=2,
        price_chf=course.base_price_chf,
        status="open",
    )

    n = 5
    barrier = threading.Barrier(parties=n, timeout=15)

    def book(idx: int) -> int:
        barrier.wait()
        try:
            client = APIClient()
            r = client.post(
                "/api/v1/bookings/",
                data=_payload(session.id, f"user{idx}@example.com"),
                format="json",
            )
            return int(r.status_code)
        finally:
            connections.close_all()

    with ThreadPoolExecutor(max_workers=n) as pool:
        codes = sorted(list(pool.map(book, range(n))))

    successes = [c for c in codes if c == 201]
    failures = [c for c in codes if c == 400]
    assert len(successes) == 2, f"Erwartet 2 Erfolge, bekam {codes}"
    assert len(failures) == 3, f"Erwartet 3 Ablehnungen, bekam {codes}"

    confirmed = Booking.objects.filter(session=session, status="confirmed").count()
    assert confirmed == 2, f"Genau 2 Buchungen erwartet, gefunden: {confirmed}"
