"""Admin-CRUD-Views.

Alle Endpoints unter /api/v1/admin/ verlangen ``IsAdminUser``. Authentifizierung
läuft über das Cookie-JWT (siehe authentication.py).
"""

from __future__ import annotations

import csv
from datetime import datetime, timedelta
from typing import Any

from django.db import transaction
from django.db.models import Count, Q, QuerySet
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAdminUser
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from bookings.models import Booking
from courses.i18n import pick_translation
from courses.models import Category, Course, CourseSession, Location

from .serializers import (
    AdminBookingSerializer,
    AdminCategorySerializer,
    AdminCourseSerializer,
    AdminLocationSerializer,
    AdminSessionSerializer,
)

ADMIN_PERMISSIONS = [IsAdminUser]


# --- Categories / Locations (read-only Helper für Dropdowns) ---


class AdminCategoryListView(generics.ListAPIView[Category]):
    permission_classes = ADMIN_PERMISSIONS
    serializer_class = AdminCategorySerializer
    pagination_class = None

    def get_queryset(self) -> QuerySet[Category]:
        return Category.objects.all().prefetch_related("translations")


class AdminLocationListView(generics.ListAPIView[Location]):
    permission_classes = ADMIN_PERMISSIONS
    serializer_class = AdminLocationSerializer
    pagination_class = None

    def get_queryset(self) -> QuerySet[Location]:
        return Location.objects.filter(is_active=True)


# --- Courses ---


class AdminCourseListCreateView(generics.ListCreateAPIView[Course]):
    permission_classes = ADMIN_PERMISSIONS
    serializer_class = AdminCourseSerializer

    def get_queryset(self) -> QuerySet[Course]:
        qs = Course.objects.all().select_related("category").prefetch_related("translations")
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(slug__icontains=search) | Q(translations__title__icontains=search)
            ).distinct()
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category_id=category)
        return qs.order_by("order", "slug")


class AdminCourseDetailView(generics.RetrieveUpdateDestroyAPIView[Course]):
    permission_classes = ADMIN_PERMISSIONS
    serializer_class = AdminCourseSerializer

    def get_queryset(self) -> QuerySet[Course]:
        return Course.objects.all().select_related("category").prefetch_related("translations")

    def perform_destroy(self, instance: Course) -> None:
        # Kurs darf nur gelöscht werden, wenn keine Sessions mit Buchungen existieren.
        has_bookings = Booking.objects.filter(session__course=instance).exists()
        if has_bookings:
            from rest_framework.exceptions import ValidationError

            raise ValidationError(
                {
                    "error": "course_has_bookings",
                    "message": "Kurs hat Buchungen und kann nicht gelöscht werden.",
                }
            )
        instance.delete()

    def destroy(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        from rest_framework.exceptions import ValidationError

        try:
            return super().destroy(request, *args, **kwargs)
        except ValidationError as exc:
            detail = exc.detail
            if isinstance(detail, dict) and detail.get("error") == "course_has_bookings":
                return Response(detail, status=status.HTTP_409_CONFLICT)
            raise


# --- Sessions ---


class AdminSessionListCreateView(generics.ListCreateAPIView[CourseSession]):
    permission_classes = ADMIN_PERMISSIONS
    serializer_class = AdminSessionSerializer

    def get_queryset(self) -> QuerySet[CourseSession]:
        qs = (
            CourseSession.objects.all()
            .select_related("course", "location")
            .prefetch_related("course__translations", "bookings")
        )
        course = self.request.query_params.get("course")
        if course:
            qs = qs.filter(course_id=course)
        from_param = self.request.query_params.get("from")
        if from_param:
            try:
                qs = qs.filter(start_datetime__gte=datetime.fromisoformat(from_param))
            except ValueError:
                pass
        to_param = self.request.query_params.get("to")
        if to_param:
            try:
                qs = qs.filter(end_datetime__lte=datetime.fromisoformat(to_param))
            except ValueError:
                pass
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        return qs.order_by("start_datetime")


class AdminSessionDetailView(generics.RetrieveUpdateDestroyAPIView[CourseSession]):
    permission_classes = ADMIN_PERMISSIONS
    serializer_class = AdminSessionSerializer

    def get_queryset(self) -> QuerySet[CourseSession]:
        return (
            CourseSession.objects.all()
            .select_related("course", "location")
            .prefetch_related("course__translations", "bookings")
        )

    def perform_destroy(self, instance: CourseSession) -> None:
        if instance.bookings.exists():
            from rest_framework.exceptions import ValidationError

            raise ValidationError(
                {
                    "error": "session_has_bookings",
                    "message": "Termin hat Buchungen und kann nicht gelöscht werden.",
                }
            )
        instance.delete()


class AdminSessionCancelView(APIView):
    """POST /api/v1/admin/sessions/{id}/cancel/ – Termin absagen, Buchungen stornieren."""

    permission_classes = ADMIN_PERMISSIONS

    def post(self, request: Request, pk: int) -> Response:
        session_obj = get_object_or_404(CourseSession.objects.all(), pk=pk)
        with transaction.atomic():
            session_obj.status = "cancelled"
            session_obj.save(update_fields=["status", "updated_at"])
            session_obj.bookings.filter(status="confirmed").update(status="cancelled")
        serializer = AdminSessionSerializer(session_obj)
        return Response(serializer.data)


class AdminSessionParticipantsCsvView(APIView):
    """GET /api/v1/admin/sessions/{id}/participants.csv – Teilnehmerliste als CSV."""

    permission_classes = ADMIN_PERMISSIONS

    def get(self, request: Request, pk: int) -> HttpResponse:
        session_obj = get_object_or_404(
            CourseSession.objects.select_related("course", "location"), pk=pk
        )
        bookings = session_obj.bookings.filter(status="confirmed").order_by(
            "last_name", "first_name"
        )

        # UTF-8 BOM, damit Excel auf Windows Umlaute korrekt erkennt.
        # Numbers/LibreOffice ignorieren das BOM, also kein Schaden.
        response = HttpResponse(b"\xef\xbb\xbf", content_type="text/csv; charset=utf-8")
        date_part = session_obj.start_datetime.astimezone().strftime("%Y-%m-%d")
        filename = f"teilnehmer-{session_obj.id}-{date_part}.csv"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        writer = csv.writer(response, delimiter=";")
        writer.writerow(
            [
                "Buchungsnummer",
                "Anrede",
                "Vorname",
                "Nachname",
                "Email",
                "Telefon",
                "Strasse",
                "PLZ",
                "Ort",
                "Land",
                "Geburtsdatum",
                "Buchungsdatum",
                "Führerausweis",
                "Sprache",
            ]
        )
        for b in bookings:
            writer.writerow(
                [
                    b.booking_number,
                    b.salutation,
                    b.first_name,
                    b.last_name,
                    b.email,
                    b.phone,
                    b.street,
                    b.postal_code,
                    b.city,
                    b.country,
                    b.date_of_birth.isoformat() if b.date_of_birth else "",
                    b.created_at.astimezone().strftime("%Y-%m-%d %H:%M"),
                    b.license_date.isoformat() if b.license_date else "",
                    b.language,
                ]
            )
        return response


# --- Bookings ---


class AdminBookingListView(generics.ListAPIView[Booking]):
    permission_classes = ADMIN_PERMISSIONS
    serializer_class = AdminBookingSerializer

    def get_queryset(self) -> QuerySet[Booking]:
        qs = (
            Booking.objects.all()
            .select_related("session", "session__course", "session__location")
            .prefetch_related("session__course__translations")
        )
        session = self.request.query_params.get("session")
        if session:
            try:
                qs = qs.filter(session_id=int(session))
            except ValueError:
                qs = qs.none()
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
                | Q(booking_number__icontains=search)
            )
        return qs.order_by("-created_at")


class AdminBookingDetailView(generics.RetrieveUpdateAPIView[Booking]):
    permission_classes = ADMIN_PERMISSIONS
    serializer_class = AdminBookingSerializer

    def get_queryset(self) -> QuerySet[Booking]:
        return (
            Booking.objects.all()
            .select_related("session", "session__course", "session__location")
            .prefetch_related("session__course__translations")
        )


# --- Dashboard-Stats ---


class AdminStatsView(APIView):
    permission_classes = ADMIN_PERMISSIONS

    def get(self, request: Request) -> Response:
        now = timezone.now()
        seven_days_ago = now - timedelta(days=7)

        upcoming_qs = (
            CourseSession.objects.filter(status="open", start_datetime__gt=now)
            .select_related("course", "location")
            .prefetch_related("course__translations")
            .annotate(_confirmed=Count("bookings", filter=Q(bookings__status="confirmed")))
            .order_by("start_datetime")[:5]
        )

        upcoming_payload = []
        for s in upcoming_qs:
            translation = pick_translation(s.course.translations.all(), "de")
            upcoming_payload.append(
                {
                    "id": s.id,
                    "course_title": getattr(translation, "title", s.course.slug),
                    "start_datetime": s.start_datetime.isoformat(),
                    "location_name": s.location.name,
                    "max_participants": s.max_participants,
                    "confirmed_bookings_count": getattr(s, "_confirmed", 0),
                    "available_spots": max(0, s.max_participants - getattr(s, "_confirmed", 0)),
                }
            )

        recent_qs = (
            Booking.objects.filter(created_at__gte=seven_days_ago)
            .select_related("session", "session__course")
            .prefetch_related("session__course__translations")
            .order_by("-created_at")[:5]
        )
        recent_payload = []
        for b in recent_qs:
            translation = pick_translation(b.session.course.translations.all(), "de")
            recent_payload.append(
                {
                    "id": b.id,
                    "booking_number": b.booking_number,
                    "full_name": f"{b.first_name} {b.last_name}",
                    "course_title": getattr(translation, "title", b.session.course.slug),
                    "start_datetime": b.session.start_datetime.isoformat(),
                    "status": b.status,
                    "created_at": b.created_at.isoformat(),
                }
            )

        totals = {
            "courses": Course.objects.filter(is_active=True).count(),
            "upcoming_sessions": CourseSession.objects.filter(
                status="open", start_datetime__gt=now
            ).count(),
            "bookings_last_7_days": Booking.objects.filter(created_at__gte=seven_days_ago).count(),
            "confirmed_bookings": Booking.objects.filter(status="confirmed").count(),
        }

        return Response(
            {
                "upcoming_sessions": upcoming_payload,
                "recent_bookings": recent_payload,
                "totals": totals,
            }
        )
