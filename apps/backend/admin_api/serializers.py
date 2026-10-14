"""Admin-Serializer.

Im Gegensatz zu den öffentlichen Serializern liefern diese alle Sprachen als
Dictionary, ohne Accept-Language-Auswahl. Das Admin-UI rendert DE/EN/FR-Tabs
und braucht alle drei Werte simultan.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from rest_framework import serializers

from bookings.models import Booking
from courses.constants import LANGUAGE_CHOICES
from courses.i18n import pick_translation
from courses.models import (
    Category,
    CategoryTranslation,
    Course,
    CourseSession,
    CourseTranslation,
    Location,
)

LANGUAGES = [code for code, _ in LANGUAGE_CHOICES]
REQUIRED_LANGUAGES = {"de"}


def _translations_payload(translations: Any) -> dict[str, dict[str, str]]:
    out: dict[str, dict[str, str]] = {}
    for t in translations.all():
        out[t.language] = {
            "title": t.title,
            "short_description": t.short_description,
            "long_description": t.long_description,
        }
    return out


class TranslationDictField(serializers.Field[Any, Any, Any, Any]):
    """Dict-Feld, das pro Sprache title/short_description/long_description erwartet."""

    def to_representation(self, value: Any) -> dict[str, dict[str, str]]:
        return _translations_payload(value)

    def to_internal_value(self, data: Any) -> dict[str, dict[str, str]]:
        if not isinstance(data, dict):
            raise serializers.ValidationError("Erwartet Dictionary mit Sprachcodes als Keys.")
        cleaned: dict[str, dict[str, str]] = {}
        for language, payload in data.items():
            if language not in LANGUAGES:
                raise serializers.ValidationError(
                    f"Sprache '{language}' nicht unterstützt (erlaubt: {LANGUAGES})."
                )
            if not isinstance(payload, dict):
                raise serializers.ValidationError(f"Sprache '{language}': Objekt erwartet.")
            title = (payload.get("title") or "").strip()
            short = (payload.get("short_description") or "").strip()
            long_ = payload.get("long_description") or ""
            if language in REQUIRED_LANGUAGES and (not title or not short):
                raise serializers.ValidationError(
                    {language: "Titel und Kurzbeschreibung sind Pflicht."}
                )
            # Sprache nur speichern, wenn mindestens ein Inhalt vorhanden.
            if not title and not short and not long_:
                continue
            cleaned[language] = {
                "title": title,
                "short_description": short,
                "long_description": long_,
            }
        if "de" not in cleaned:
            raise serializers.ValidationError({"de": "Deutsch ist Pflicht."})
        return cleaned


class AdminCategorySerializer(serializers.Serializer[Category]):
    id = serializers.IntegerField(read_only=True)
    slug = serializers.SlugField(read_only=True)
    name = serializers.SerializerMethodField()

    def get_name(self, obj: Category) -> str:
        translation = pick_translation(obj.translations.all(), "de")
        return getattr(translation, "name", obj.slug)


class AdminLocationSerializer(serializers.Serializer[Location]):
    id = serializers.IntegerField(read_only=True)
    slug = serializers.SlugField(read_only=True)
    name = serializers.CharField(read_only=True)
    city = serializers.CharField(read_only=True)


class AdminCourseSerializer(serializers.ModelSerializer[Course]):
    translations = TranslationDictField()
    category_slug = serializers.CharField(source="category.slug", read_only=True)

    class Meta:
        model = Course
        fields = [
            "id",
            "slug",
            "category",
            "category_slug",
            "base_price_chf",
            "duration_hours",
            "is_active",
            "order",
            "translations",
        ]

    def create(self, validated_data: dict[str, Any]) -> Course:
        translations = validated_data.pop("translations")
        course = Course.objects.create(**validated_data)
        for lang, fields in translations.items():
            CourseTranslation.objects.create(course=course, language=lang, **fields)
        return course

    def update(self, instance: Course, validated_data: dict[str, Any]) -> Course:
        translations = validated_data.pop("translations", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if translations is not None:
            existing = {t.language: t for t in instance.translations.all()}
            for lang, fields in translations.items():
                if lang in existing:
                    obj = existing[lang]
                    for k, v in fields.items():
                        setattr(obj, k, v)
                    obj.save()
                else:
                    CourseTranslation.objects.create(course=instance, language=lang, **fields)
            # Sprachen, die im Payload nicht (mehr) vorkommen, werden entfernt.
            for lang in list(existing.keys()):
                if lang not in translations:
                    existing[lang].delete()
        return instance


class AdminSessionSerializer(serializers.ModelSerializer[CourseSession]):
    course_slug = serializers.CharField(source="course.slug", read_only=True)
    course_title = serializers.SerializerMethodField()
    location_name = serializers.CharField(source="location.name", read_only=True)
    location_slug = serializers.CharField(source="location.slug", read_only=True)
    available_spots = serializers.IntegerField(read_only=True)
    confirmed_bookings_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = CourseSession
        fields = [
            "id",
            "course",
            "course_slug",
            "course_title",
            "location",
            "location_slug",
            "location_name",
            "start_datetime",
            "end_datetime",
            "max_participants",
            "price_chf",
            "status",
            "internal_notes",
            "available_spots",
            "confirmed_bookings_count",
        ]

    def get_course_title(self, obj: CourseSession) -> str:
        translation = pick_translation(obj.course.translations.all(), "de")
        return getattr(translation, "title", obj.course.slug)

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        start = attrs.get("start_datetime")
        end = attrs.get("end_datetime")
        if start and end and end <= start:
            raise serializers.ValidationError({"end_datetime": "Ende muss nach Start liegen."})
        # Wenn Buchungen existieren, dürfen Datums-Felder nicht geändert werden.
        if self.instance is not None and (start or end):
            if self.instance.bookings.filter(status="confirmed").exists():
                changed = False
                if start and start != self.instance.start_datetime:
                    changed = True
                if end and end != self.instance.end_datetime:
                    changed = True
                if changed:
                    raise serializers.ValidationError(
                        "Datum kann nicht geändert werden, solange Buchungen existieren."
                    )
        max_p = attrs.get("max_participants")
        if max_p is not None and self.instance is not None:
            confirmed = self.instance.bookings.filter(status="confirmed").count()
            if max_p < confirmed:
                raise serializers.ValidationError(
                    {
                        "max_participants": (
                            f"Mindestens {confirmed} Plätze – es gibt bereits "
                            f"{confirmed} bestätigte Buchungen."
                        )
                    }
                )
        if max_p is not None and max_p <= 0:
            raise serializers.ValidationError({"max_participants": "Muss positiv sein."})
        price = attrs.get("price_chf")
        if price is not None and price < Decimal("0"):
            raise serializers.ValidationError({"price_chf": "Muss >= 0 sein."})
        return attrs


class AdminBookingSerializer(serializers.ModelSerializer[Booking]):
    session_label = serializers.SerializerMethodField()
    course_title = serializers.SerializerMethodField()
    start_datetime = serializers.DateTimeField(source="session.start_datetime", read_only=True)
    location_name = serializers.CharField(source="session.location.name", read_only=True)

    class Meta:
        model = Booking
        fields = [
            "id",
            "booking_number",
            "session",
            "session_label",
            "course_title",
            "start_datetime",
            "location_name",
            "salutation",
            "first_name",
            "last_name",
            "email",
            "phone",
            "street",
            "postal_code",
            "city",
            "country",
            "date_of_birth",
            "license_date",
            "voucher_code",
            "notes",
            "status",
            "language",
            "created_at",
        ]
        read_only_fields = [
            "booking_number",
            "session",
            "session_label",
            "course_title",
            "start_datetime",
            "location_name",
            "created_at",
        ]

    def get_session_label(self, obj: Booking) -> str:
        return f"{obj.session.course.slug} @ {obj.session.start_datetime:%Y-%m-%d %H:%M}"

    def get_course_title(self, obj: Booking) -> str:
        translation = pick_translation(obj.session.course.translations.all(), "de")
        return getattr(translation, "title", obj.session.course.slug)


class CategoryTranslationInputSerializer(serializers.Serializer[CategoryTranslation]):
    """Dummy-Wrapper, falls wir CategoryTranslation später per API editieren wollen."""

    language = serializers.ChoiceField(choices=LANGUAGE_CHOICES)
    name = serializers.CharField(max_length=100)
