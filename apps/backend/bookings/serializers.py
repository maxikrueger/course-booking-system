from __future__ import annotations

from typing import Any

from rest_framework import serializers

from courses.i18n import pick_translation
from courses.models import CourseSession

from .constants import SALUTATION_CHOICES
from .models import Booking


class BookingCreateSerializer(serializers.Serializer[Booking]):
    """Eingabe-Serializer für POST /api/v1/bookings/.

    Validiert nur das Schema. Verfügbarkeit der Session und Race-Condition-Schutz
    werden im View innerhalb einer Transaktion mit SELECT FOR UPDATE geprüft.
    """

    session_id = serializers.IntegerField(min_value=1)
    salutation = serializers.ChoiceField(choices=SALUTATION_CHOICES)
    first_name = serializers.CharField(max_length=100, allow_blank=False)
    last_name = serializers.CharField(max_length=100, allow_blank=False)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=30, allow_blank=False)
    street = serializers.CharField(max_length=200, allow_blank=False)
    postal_code = serializers.CharField(max_length=10, allow_blank=False)
    city = serializers.CharField(max_length=100, allow_blank=False)
    country = serializers.CharField(max_length=2, default="CH")
    date_of_birth = serializers.DateField()
    license_date = serializers.DateField(required=False, allow_null=True)
    voucher_code = serializers.CharField(
        max_length=50, required=False, allow_blank=True, default=""
    )
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    language = serializers.ChoiceField(choices=["de", "en", "fr"], default="de")
    accept_terms = serializers.BooleanField()


class BookingSessionNestedSerializer(serializers.Serializer[CourseSession]):
    id = serializers.IntegerField(read_only=True)
    course_title = serializers.SerializerMethodField()
    start_datetime = serializers.DateTimeField(read_only=True)
    end_datetime = serializers.DateTimeField(read_only=True)
    location_name = serializers.SerializerMethodField()

    def get_course_title(self, obj: CourseSession) -> str:
        language = self.context.get("language", "de")
        translation = pick_translation(obj.course.translations.all(), language)
        return getattr(translation, "title", obj.course.slug)

    def get_location_name(self, obj: CourseSession) -> str:
        return obj.location.name


class BookingResponseSerializer(serializers.Serializer[Booking]):
    """Ausgabe-Serializer für POST und GET /api/v1/bookings/."""

    booking_number = serializers.CharField(read_only=True)
    session = serializers.SerializerMethodField()
    status = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)

    def get_session(self, obj: Booking) -> dict[str, Any]:
        return BookingSessionNestedSerializer(obj.session, context=self.context).data


class BookingDetailSerializer(BookingResponseSerializer):
    """Ausführlicher Serializer für GET /api/v1/bookings/{number}/."""

    salutation = serializers.CharField(read_only=True)
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    phone = serializers.CharField(read_only=True)
    street = serializers.CharField(read_only=True)
    postal_code = serializers.CharField(read_only=True)
    city = serializers.CharField(read_only=True)
    country = serializers.CharField(read_only=True)
    date_of_birth = serializers.DateField(read_only=True)
    license_date = serializers.DateField(read_only=True)
    voucher_code = serializers.CharField(read_only=True)
    notes = serializers.CharField(read_only=True)
    language = serializers.CharField(read_only=True)
