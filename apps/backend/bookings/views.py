from __future__ import annotations

from typing import Any

from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from courses.i18n import language_from_request
from courses.models import CourseSession

from .models import Booking
from .serializers import (
    BookingCreateSerializer,
    BookingDetailSerializer,
    BookingResponseSerializer,
)


class SessionFullError(Exception):
    """Session ist voll – wird vom View in 400 mit error=session_full gemappt."""

    def __init__(self, available_spots: int = 0) -> None:
        self.available_spots = available_spots


class SessionNotOpenError(Exception):
    """Session ist abgesagt oder geschlossen."""

    def __init__(self, session_status: str) -> None:
        self.session_status = session_status


def _create_booking_atomic(data: dict[str, Any]) -> Booking:
    """Erstelle Buchung atomar mit SELECT FOR UPDATE auf der Session.

    Diese Funktion MUSS innerhalb einer @transaction.atomic-Transaktion aufgerufen werden.
    Sie lockt die Session-Zeile bis zum Commit, sodass parallele Buchungen für den
    letzten freien Platz serialisiert werden.
    """
    session_id = data["session_id"]

    try:
        session = CourseSession.objects.select_for_update().get(pk=session_id)
    except CourseSession.DoesNotExist as exc:
        raise ValidationError({"session_id": ["Termin nicht gefunden."]}) from exc

    if session.status != "open":
        raise SessionNotOpenError(session.status)

    if session.start_datetime <= timezone.now():
        raise ValidationError({"session_id": ["Termin liegt in der Vergangenheit."]})

    confirmed_count = session.bookings.filter(status="confirmed").count()
    if confirmed_count >= session.max_participants:
        raise SessionFullError(available_spots=0)

    booking = Booking.objects.create(
        session=session,
        salutation=data["salutation"],
        first_name=data["first_name"],
        last_name=data["last_name"],
        email=data["email"],
        phone=data["phone"],
        street=data["street"],
        postal_code=data["postal_code"],
        city=data["city"],
        country=data.get("country", "CH"),
        date_of_birth=data["date_of_birth"],
        license_date=data.get("license_date"),
        voucher_code=data.get("voucher_code", ""),
        notes=data.get("notes", ""),
        language=data.get("language", "de"),
        accepted_terms_at=timezone.now(),
        status="confirmed",
    )
    return booking


class BookingCreateView(APIView):
    """POST /api/v1/bookings/ – Race-condition-sicher gegen parallele Buchungen.

    Ablauf:
      1. Schema-Validierung via BookingCreateSerializer.
      2. AGB-Zustimmung prüfen.
      3. Innerhalb @transaction.atomic: SELECT FOR UPDATE auf Session.
      4. Verfügbarkeit prüfen, Buchung anlegen.
      5. Antwort mit Buchungsnummer.
    """

    def post(self, request: Request) -> Response:
        serializer = BookingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)

        if not data.get("accept_terms"):
            return Response(
                {"error": "terms_not_accepted", "message": "Bitte AGB akzeptieren"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                booking = _create_booking_atomic(data)
        except SessionFullError as exc:
            return Response(
                {
                    "error": "session_full",
                    "message": "Dieser Termin ist leider voll.",
                    "available_spots": exc.available_spots,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except SessionNotOpenError as exc:
            return Response(
                {
                    "error": "session_not_open",
                    "message": "Dieser Termin ist nicht buchbar.",
                    "session_status": exc.session_status,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        response_serializer = BookingResponseSerializer(
            booking, context={"language": language_from_request(request)}
        )
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class BookingDetailView(APIView):
    """GET /api/v1/bookings/{booking_number}/?email=...

    Email-Verifikation gegen Enumeration: 404, wenn Nummer oder Email nicht passt.
    """

    def get(self, request: Request, booking_number: str) -> Response:
        email = request.query_params.get("email", "").strip()
        if not email:
            return Response(status=status.HTTP_404_NOT_FOUND)

        try:
            booking = Booking.objects.select_related(
                "session", "session__course", "session__location"
            ).get(booking_number=booking_number)
        except Booking.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if booking.email.lower() != email.lower():
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = BookingDetailSerializer(
            booking, context={"language": language_from_request(request)}
        )
        return Response(serializer.data)
