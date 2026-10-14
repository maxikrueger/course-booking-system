from __future__ import annotations

from datetime import datetime
from typing import Any

from django.db.models import QuerySet
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics
from rest_framework.request import Request
from rest_framework.response import Response

from .i18n import language_from_request
from .models import Category, Course, CourseSession
from .serializers import (
    CategorySerializer,
    CourseDetailSerializer,
    CourseListSerializer,
    SessionSerializer,
)


def _truthy(value: str | None) -> bool:
    if value is None:
        return False
    return value.lower() in {"1", "true", "yes", "on"}


class _LanguageContextMixin:
    def get_serializer_context(self) -> dict[str, Any]:
        context: dict[str, Any] = super().get_serializer_context()  # type: ignore[misc]
        context["language"] = language_from_request(self.request)  # type: ignore[attr-defined]
        return context


class CategoryListView(_LanguageContextMixin, generics.ListAPIView[Category]):
    serializer_class = CategorySerializer
    pagination_class = None

    def get_queryset(self) -> QuerySet[Category]:
        return Category.objects.filter(is_active=True).prefetch_related("translations")


class CourseListView(_LanguageContextMixin, generics.ListAPIView[Course]):
    serializer_class = CourseListSerializer

    def get_queryset(self) -> QuerySet[Course]:
        qs = (
            Course.objects.filter(is_active=True)
            .select_related("category")
            .prefetch_related("translations", "category__translations", "sessions")
        )
        category_slug = self.request.query_params.get("category")
        if category_slug:
            qs = qs.filter(category__slug=category_slug)
        return qs


class CourseDetailView(_LanguageContextMixin, generics.RetrieveAPIView[Course]):
    serializer_class = CourseDetailSerializer
    lookup_field = "slug"

    def get_queryset(self) -> QuerySet[Course]:
        return (
            Course.objects.filter(is_active=True)
            .select_related("category")
            .prefetch_related("translations", "category__translations", "sessions")
        )


class CourseSessionsView(_LanguageContextMixin, generics.ListAPIView[CourseSession]):
    serializer_class = SessionSerializer
    pagination_class = None

    def get_queryset(self) -> QuerySet[CourseSession]:
        slug = self.kwargs["slug"]
        course = get_object_or_404(Course.objects.filter(is_active=True), slug=slug)
        qs = course.sessions.select_related("location").all()

        from_param = self.request.query_params.get("from")
        if from_param:
            try:
                cutoff = datetime.fromisoformat(from_param)
            except ValueError:
                cutoff = timezone.now()
        else:
            cutoff = timezone.now()
        qs = qs.filter(start_datetime__gte=cutoff)

        location_slug = self.request.query_params.get("location")
        if location_slug:
            qs = qs.filter(location__slug=location_slug)

        only_bookable_param = self.request.query_params.get("only_bookable")
        only_bookable = _truthy(only_bookable_param) if only_bookable_param is not None else True
        if only_bookable:
            qs = qs.filter(status="open")

        return qs.order_by("start_datetime")

    def list(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        sessions = list(self.get_queryset())
        only_bookable_param = request.query_params.get("only_bookable")
        only_bookable = _truthy(only_bookable_param) if only_bookable_param is not None else True
        if only_bookable:
            sessions = [s for s in sessions if s.is_bookable]
        serializer = self.get_serializer(sessions, many=True)
        return Response(serializer.data)


class SessionDetailView(_LanguageContextMixin, generics.RetrieveAPIView[CourseSession]):
    serializer_class = SessionSerializer

    def get_queryset(self) -> QuerySet[CourseSession]:
        return CourseSession.objects.select_related("location", "course")
