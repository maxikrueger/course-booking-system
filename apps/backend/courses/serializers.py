from __future__ import annotations

from typing import Any

from rest_framework import serializers

from .i18n import pick_translation
from .models import Category, Course, CourseSession, Location


class CategorySerializer(serializers.Serializer[Category]):
    id = serializers.IntegerField(read_only=True)
    slug = serializers.SlugField(read_only=True)
    name = serializers.SerializerMethodField()
    order = serializers.IntegerField(read_only=True)

    def get_name(self, obj: Category) -> str:
        language = self.context.get("language", "de")
        translation = pick_translation(obj.translations.all(), language)
        return getattr(translation, "name", obj.slug)


class CategoryNestedSerializer(serializers.Serializer[Category]):
    slug = serializers.SlugField(read_only=True)
    name = serializers.SerializerMethodField()

    def get_name(self, obj: Category) -> str:
        language = self.context.get("language", "de")
        translation = pick_translation(obj.translations.all(), language)
        return getattr(translation, "name", obj.slug)


class LocationNestedSerializer(serializers.Serializer[Location]):
    slug = serializers.SlugField(read_only=True)
    name = serializers.CharField(read_only=True)
    city = serializers.CharField(read_only=True)


class CourseListSerializer(serializers.Serializer[Course]):
    id = serializers.IntegerField(read_only=True)
    slug = serializers.SlugField(read_only=True)
    category = CategoryNestedSerializer(read_only=True)
    title = serializers.SerializerMethodField()
    short_description = serializers.SerializerMethodField()
    base_price_chf = serializers.DecimalField(max_digits=8, decimal_places=2, read_only=True)
    duration_hours = serializers.DecimalField(max_digits=4, decimal_places=2, read_only=True)
    image_url = serializers.SerializerMethodField()
    next_session_date = serializers.SerializerMethodField()

    def _translation(self, obj: Course) -> Any:
        language = self.context.get("language", "de")
        return pick_translation(obj.translations.all(), language)

    def get_title(self, obj: Course) -> str:
        translation = self._translation(obj)
        return getattr(translation, "title", obj.slug)

    def get_short_description(self, obj: Course) -> str:
        translation = self._translation(obj)
        return getattr(translation, "short_description", "")

    def get_image_url(self, obj: Course) -> str | None:
        if not obj.image:
            return None
        request = self.context.get("request")
        url = obj.image.url
        if request is not None:
            return request.build_absolute_uri(url)
        return url

    def get_next_session_date(self, obj: Course) -> str | None:
        from django.utils import timezone as dj_timezone

        next_session = (
            obj.sessions.filter(status="open", start_datetime__gt=dj_timezone.now())
            .order_by("start_datetime")
            .first()
        )
        if not next_session:
            return None
        return next_session.start_datetime.isoformat()


class CourseDetailSerializer(CourseListSerializer):
    long_description = serializers.SerializerMethodField()

    def get_long_description(self, obj: Course) -> str:
        translation = self._translation(obj)
        return getattr(translation, "long_description", "")


class SessionSerializer(serializers.Serializer[CourseSession]):
    id = serializers.IntegerField(read_only=True)
    start_datetime = serializers.DateTimeField(read_only=True)
    end_datetime = serializers.DateTimeField(read_only=True)
    location = LocationNestedSerializer(read_only=True)
    price_chf = serializers.DecimalField(max_digits=8, decimal_places=2, read_only=True)
    max_participants = serializers.IntegerField(read_only=True)
    available_spots = serializers.IntegerField(read_only=True)
    is_bookable = serializers.BooleanField(read_only=True)
    status = serializers.CharField(read_only=True)
