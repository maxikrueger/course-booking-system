from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from typing import Any

import pytest
from django.utils import timezone

from courses.models import (
    Category,
    CategoryTranslation,
    Course,
    CourseSession,
    CourseTranslation,
    Location,
)


@pytest.fixture
def category(db: Any) -> Category:
    cat = Category.objects.create(slug="auto", order=1, is_active=True)
    CategoryTranslation.objects.create(category=cat, language="de", name="Auto")
    CategoryTranslation.objects.create(category=cat, language="en", name="Car")
    return cat


@pytest.fixture
def location(db: Any) -> Location:
    return Location.objects.create(
        slug="nordwest",
        name="Trainingszentrum Nordwest",
        address_line="Industriestrasse 12",
        postal_code="4132",
        city="Muttenz",
        country="CH",
    )


@pytest.fixture
def course(db: Any, category: Category) -> Course:
    c = Course.objects.create(
        slug="wab-kurs-deutsch",
        category=category,
        base_price_chf=Decimal("350.00"),
        duration_hours=Decimal("7.00"),
        is_active=True,
        order=0,
    )
    CourseTranslation.objects.create(
        course=c,
        language="de",
        title="WAB-Kurs Deutsch",
        short_description="Obligatorischer Kurs für Neulenker",
        long_description="Lange Beschreibung auf Deutsch.",
    )
    CourseTranslation.objects.create(
        course=c,
        language="en",
        title="WAB Course English",
        short_description="Mandatory course",
        long_description="Long description in English.",
    )
    return c


@pytest.fixture
def session(db: Any, course: Course, location: Location) -> CourseSession:
    start = timezone.now() + timedelta(days=10)
    return CourseSession.objects.create(
        course=course,
        location=location,
        start_datetime=start,
        end_datetime=start + timedelta(hours=7),
        max_participants=12,
        price_chf=course.base_price_chf,
        status="open",
    )
