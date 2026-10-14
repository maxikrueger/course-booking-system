"""Tests für Admin-CRUD-Endpoints (Course/Session/Booking) und Stats."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from typing import Any

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
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

User = get_user_model()

LOGIN_URL = reverse("admin_api:login")
COURSES_URL = reverse("admin_api:course-list")
SESSIONS_URL = reverse("admin_api:session-list")
BOOKINGS_URL = reverse("admin_api:booking-list")
STATS_URL = reverse("admin_api:stats")


@pytest.fixture
def admin_user(db: Any) -> Any:
    return User.objects.create_user(
        username="admin",
        email="admin@example.com",
        password="secret-pw-1234",
        is_staff=True,
    )


@pytest.fixture
def auth_client(admin_user: Any) -> APIClient:
    client = APIClient()
    response = client.post(
        LOGIN_URL,
        {"username": "admin", "password": "secret-pw-1234"},
        format="json",
    )
    assert response.status_code == 200
    return client


def _make_category() -> Category:
    cat = Category.objects.create(slug="auto", order=1, is_active=True)
    CategoryTranslation.objects.create(category=cat, language="de", name="Auto")
    return cat


def _make_location() -> Location:
    return Location.objects.create(
        slug="nordwest",
        name="Trainingszentrum Nordwest",
        address_line="X 1",
        postal_code="4132",
        city="Muttenz",
    )


def _make_course(category: Category) -> Course:
    course = Course.objects.create(
        slug="wab-kurs",
        category=category,
        base_price_chf=Decimal("350.00"),
        duration_hours=Decimal("7.00"),
    )
    CourseTranslation.objects.create(
        course=course,
        language="de",
        title="WAB-Kurs",
        short_description="Pflichtkurs",
        long_description="Lang DE",
    )
    return course


# --- Permission ---


def test_admin_endpoints_require_auth(db: Any) -> None:
    client = APIClient()
    for url in [COURSES_URL, SESSIONS_URL, BOOKINGS_URL, STATS_URL]:
        response = client.get(url)
        assert response.status_code in (401, 403), f"{url} sollte 401/403 sein"


def test_non_staff_user_forbidden(db: Any) -> None:
    User.objects.create_user(username="alice", password="secret-pw-1234", is_staff=False)
    client = APIClient()
    client.post(
        LOGIN_URL,
        {"username": "alice", "password": "secret-pw-1234"},
        format="json",
    )
    response = client.get(COURSES_URL)
    assert response.status_code in (401, 403)


# --- Course CRUD ---


def test_create_course_with_translations(auth_client: APIClient, db: Any) -> None:
    cat = _make_category()
    payload = {
        "slug": "neuer-kurs",
        "category": cat.id,
        "base_price_chf": "299.00",
        "duration_hours": "4.00",
        "is_active": True,
        "order": 0,
        "translations": {
            "de": {
                "title": "Neuer Kurs",
                "short_description": "Kurz DE",
                "long_description": "Lang DE",
            },
            "en": {
                "title": "New Course",
                "short_description": "Short EN",
                "long_description": "Long EN",
            },
        },
    }
    response = auth_client.post(COURSES_URL, payload, format="json")
    assert response.status_code == 201, response.data
    course = Course.objects.get(slug="neuer-kurs")
    assert course.translations.count() == 2


def test_create_course_requires_de_translation(auth_client: APIClient, db: Any) -> None:
    cat = _make_category()
    payload = {
        "slug": "ohne-de",
        "category": cat.id,
        "base_price_chf": "100.00",
        "duration_hours": "2.00",
        "is_active": True,
        "translations": {
            "en": {
                "title": "Without German",
                "short_description": "Short",
                "long_description": "",
            }
        },
    }
    response = auth_client.post(COURSES_URL, payload, format="json")
    assert response.status_code == 400


def test_update_course_translations(auth_client: APIClient, db: Any) -> None:
    cat = _make_category()
    course = _make_course(cat)
    url = reverse("admin_api:course-detail", args=[course.id])
    payload = {
        "translations": {
            "de": {
                "title": "Geändert",
                "short_description": "Neu",
                "long_description": "Lang DE",
            },
            "fr": {
                "title": "Cours",
                "short_description": "Court",
                "long_description": "Long",
            },
        }
    }
    response = auth_client.patch(url, payload, format="json")
    assert response.status_code == 200, response.data
    course.refresh_from_db()
    assert course.translations.get(language="de").title == "Geändert"
    assert course.translations.filter(language="fr").exists()


def test_delete_course_with_bookings_returns_409(auth_client: APIClient, db: Any) -> None:
    cat = _make_category()
    course = _make_course(cat)
    location = _make_location()
    start = timezone.now() + timedelta(days=10)
    session_obj = CourseSession.objects.create(
        course=course,
        location=location,
        start_datetime=start,
        end_datetime=start + timedelta(hours=7),
        max_participants=10,
        price_chf=Decimal("350.00"),
        status="open",
    )
    Booking.objects.create(
        session=session_obj,
        salutation="mr",
        first_name="X",
        last_name="Y",
        email="x@y.de",
        phone="123",
        street="A 1",
        postal_code="8000",
        city="Z",
        date_of_birth="1990-01-01",
        accepted_terms_at=timezone.now(),
        status="confirmed",
    )
    url = reverse("admin_api:course-detail", args=[course.id])
    response = auth_client.delete(url)
    assert response.status_code == 409


# --- Session CRUD ---


def test_create_session(auth_client: APIClient, db: Any) -> None:
    cat = _make_category()
    course = _make_course(cat)
    location = _make_location()
    start = timezone.now() + timedelta(days=20)
    payload = {
        "course": course.id,
        "location": location.id,
        "start_datetime": start.isoformat(),
        "end_datetime": (start + timedelta(hours=8)).isoformat(),
        "max_participants": 12,
        "price_chf": "350.00",
        "status": "open",
        "internal_notes": "",
    }
    response = auth_client.post(SESSIONS_URL, payload, format="json")
    assert response.status_code == 201, response.data
    assert CourseSession.objects.filter(course=course).count() == 1


def test_session_cancel_cancels_bookings(auth_client: APIClient, db: Any) -> None:
    cat = _make_category()
    course = _make_course(cat)
    location = _make_location()
    start = timezone.now() + timedelta(days=10)
    session_obj = CourseSession.objects.create(
        course=course,
        location=location,
        start_datetime=start,
        end_datetime=start + timedelta(hours=7),
        max_participants=10,
        price_chf=Decimal("350.00"),
        status="open",
    )
    booking = Booking.objects.create(
        session=session_obj,
        salutation="mr",
        first_name="X",
        last_name="Y",
        email="x@y.de",
        phone="1",
        street="A",
        postal_code="0",
        city="Z",
        date_of_birth="1990-01-01",
        accepted_terms_at=timezone.now(),
        status="confirmed",
    )
    url = reverse("admin_api:session-cancel", args=[session_obj.id])
    response = auth_client.post(url)
    assert response.status_code == 200
    session_obj.refresh_from_db()
    booking.refresh_from_db()
    assert session_obj.status == "cancelled"
    assert booking.status == "cancelled"


def test_session_csv_export(auth_client: APIClient, db: Any) -> None:
    cat = _make_category()
    course = _make_course(cat)
    location = _make_location()
    start = timezone.now() + timedelta(days=10)
    session_obj = CourseSession.objects.create(
        course=course,
        location=location,
        start_datetime=start,
        end_datetime=start + timedelta(hours=7),
        max_participants=10,
        price_chf=Decimal("350.00"),
        status="open",
    )
    Booking.objects.create(
        session=session_obj,
        salutation="mr",
        first_name="Max",
        last_name="Muster",
        email="m@y.de",
        phone="1",
        street="A 1",
        postal_code="8000",
        city="Z",
        date_of_birth="1990-01-01",
        accepted_terms_at=timezone.now(),
        status="confirmed",
    )
    url = reverse("admin_api:session-participants-csv", args=[session_obj.id])
    response = auth_client.get(url)
    assert response.status_code == 200
    assert response["Content-Type"].startswith("text/csv")
    # UTF-8 BOM für Excel-Kompatibilität.
    assert response.content.startswith(b"\xef\xbb\xbf")
    body = response.content.decode("utf-8-sig")
    assert "Buchungsnummer" in body
    assert "Buchungsdatum" in body
    assert "Muster" in body
    # Filename enthält Datum.
    disposition = response["Content-Disposition"]
    assert "teilnehmer-" in disposition
    assert ".csv" in disposition


# --- Booking CRUD ---


def test_cancel_booking(auth_client: APIClient, db: Any) -> None:
    cat = _make_category()
    course = _make_course(cat)
    location = _make_location()
    start = timezone.now() + timedelta(days=10)
    session_obj = CourseSession.objects.create(
        course=course,
        location=location,
        start_datetime=start,
        end_datetime=start + timedelta(hours=7),
        max_participants=10,
        price_chf=Decimal("350.00"),
        status="open",
    )
    booking = Booking.objects.create(
        session=session_obj,
        salutation="mr",
        first_name="X",
        last_name="Y",
        email="x@y.de",
        phone="1",
        street="A",
        postal_code="0",
        city="Z",
        date_of_birth="1990-01-01",
        accepted_terms_at=timezone.now(),
        status="confirmed",
    )
    url = reverse("admin_api:booking-detail", args=[booking.id])
    response = auth_client.patch(url, {"status": "cancelled"}, format="json")
    assert response.status_code == 200
    booking.refresh_from_db()
    assert booking.status == "cancelled"


def test_booking_search(auth_client: APIClient, db: Any) -> None:
    cat = _make_category()
    course = _make_course(cat)
    location = _make_location()
    start = timezone.now() + timedelta(days=10)
    session_obj = CourseSession.objects.create(
        course=course,
        location=location,
        start_datetime=start,
        end_datetime=start + timedelta(hours=7),
        max_participants=10,
        price_chf=Decimal("350.00"),
        status="open",
    )
    Booking.objects.create(
        session=session_obj,
        salutation="mr",
        first_name="Anna",
        last_name="Beispiel",
        email="anna@example.com",
        phone="1",
        street="A",
        postal_code="0",
        city="Z",
        date_of_birth="1990-01-01",
        accepted_terms_at=timezone.now(),
        status="confirmed",
    )
    response = auth_client.get(BOOKINGS_URL, {"search": "Anna"})
    assert response.status_code == 200
    assert response.data["count"] == 1


# --- Stats ---


def test_stats_endpoint_returns_counts(auth_client: APIClient, db: Any) -> None:
    cat = _make_category()
    course = _make_course(cat)
    location = _make_location()
    start = timezone.now() + timedelta(days=10)
    CourseSession.objects.create(
        course=course,
        location=location,
        start_datetime=start,
        end_datetime=start + timedelta(hours=7),
        max_participants=10,
        price_chf=Decimal("350.00"),
        status="open",
    )
    response = auth_client.get(STATS_URL)
    assert response.status_code == 200
    data = response.data
    assert "totals" in data
    assert data["totals"]["upcoming_sessions"] == 1
    assert data["totals"]["courses"] == 1
