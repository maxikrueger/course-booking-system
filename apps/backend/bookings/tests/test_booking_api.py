from __future__ import annotations

from datetime import date

import pytest
from rest_framework.test import APIClient

from bookings.models import Booking
from courses.models import CourseSession


def _valid_payload(session_id: int, **overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "session_id": session_id,
        "salutation": "mr",
        "first_name": "Max",
        "last_name": "Mustermann",
        "email": "max@example.com",
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
    payload.update(overrides)
    return payload


@pytest.fixture
def client() -> APIClient:
    return APIClient()


@pytest.mark.django_db
def test_booking_create_happy(client: APIClient, session: CourseSession) -> None:
    response = client.post(
        "/api/v1/bookings/",
        data=_valid_payload(session.id),
        format="json",
    )
    assert response.status_code == 201, response.json()
    body = response.json()
    assert body["status"] == "confirmed"
    assert body["booking_number"].startswith("BP-")
    assert body["session"]["id"] == session.id
    assert body["session"]["course_title"] == "WAB-Kurs Deutsch"

    assert Booking.objects.count() == 1
    booking = Booking.objects.get()
    assert booking.email == "max@example.com"
    assert booking.date_of_birth == date(1995, 3, 15)
    assert booking.accepted_terms_at is not None


@pytest.mark.django_db
def test_booking_create_terms_required(client: APIClient, session: CourseSession) -> None:
    response = client.post(
        "/api/v1/bookings/",
        data=_valid_payload(session.id, accept_terms=False),
        format="json",
    )
    assert response.status_code == 400
    assert response.json()["error"] == "terms_not_accepted"


@pytest.mark.django_db
def test_booking_create_invalid_email(client: APIClient, session: CourseSession) -> None:
    response = client.post(
        "/api/v1/bookings/",
        data=_valid_payload(session.id, email="not-an-email"),
        format="json",
    )
    assert response.status_code == 400
    assert "email" in response.json()


@pytest.mark.django_db
def test_booking_create_session_full(client: APIClient, session: CourseSession) -> None:
    session.max_participants = 1
    session.save(update_fields=["max_participants"])
    # erste Buchung füllt
    r1 = client.post("/api/v1/bookings/", _valid_payload(session.id), format="json")
    assert r1.status_code == 201
    # zweite scheitert
    r2 = client.post(
        "/api/v1/bookings/",
        _valid_payload(session.id, email="zweite@example.com"),
        format="json",
    )
    assert r2.status_code == 400
    assert r2.json()["error"] == "session_full"


@pytest.mark.django_db
def test_booking_create_session_cancelled(client: APIClient, session: CourseSession) -> None:
    session.status = "cancelled"
    session.save(update_fields=["status"])
    response = client.post("/api/v1/bookings/", _valid_payload(session.id), format="json")
    assert response.status_code == 400
    assert response.json()["error"] == "session_not_open"


@pytest.mark.django_db
def test_booking_create_unknown_session(client: APIClient) -> None:
    response = client.post("/api/v1/bookings/", _valid_payload(99999), format="json")
    assert response.status_code == 400


@pytest.mark.django_db
def test_booking_number_format_yearly(client: APIClient, session: CourseSession) -> None:
    """Buchungsnummer hat Format BP-YYYY-NNNNN, beginnt bei 1 pro Jahr."""
    r1 = client.post("/api/v1/bookings/", _valid_payload(session.id), format="json")
    r2 = client.post(
        "/api/v1/bookings/",
        _valid_payload(session.id, email="zwei@example.com"),
        format="json",
    )
    n1 = r1.json()["booking_number"]
    n2 = r2.json()["booking_number"]
    assert n1.split("-")[2] == "00001"
    assert n2.split("-")[2] == "00002"
    # Jahr im Format
    assert len(n1.split("-")[1]) == 4


@pytest.mark.django_db
def test_booking_detail_with_correct_email(client: APIClient, session: CourseSession) -> None:
    create = client.post("/api/v1/bookings/", _valid_payload(session.id), format="json")
    number = create.json()["booking_number"]

    response = client.get(f"/api/v1/bookings/{number}/?email=max@example.com")
    assert response.status_code == 200
    body = response.json()
    assert body["booking_number"] == number
    assert body["first_name"] == "Max"


@pytest.mark.django_db
def test_booking_detail_wrong_email_returns_404(client: APIClient, session: CourseSession) -> None:
    create = client.post("/api/v1/bookings/", _valid_payload(session.id), format="json")
    number = create.json()["booking_number"]

    response = client.get(f"/api/v1/bookings/{number}/?email=other@example.com")
    assert response.status_code == 404


@pytest.mark.django_db
def test_booking_detail_unknown_number_returns_404(client: APIClient) -> None:
    response = client.get("/api/v1/bookings/BP-2099-99999/?email=foo@example.com")
    assert response.status_code == 404


@pytest.mark.django_db
def test_booking_detail_missing_email_returns_404(
    client: APIClient, session: CourseSession
) -> None:
    create = client.post("/api/v1/bookings/", _valid_payload(session.id), format="json")
    number = create.json()["booking_number"]
    response = client.get(f"/api/v1/bookings/{number}/")
    assert response.status_code == 404
