from __future__ import annotations

from django.db import models
from django.db.models import CheckConstraint, Q, UniqueConstraint
from django.utils import timezone

from .constants import LANGUAGE_CHOICES, SESSION_STATUS_CHOICES


class Category(models.Model):
    slug = models.SlugField(unique=True)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "slug"]
        verbose_name = "Kategorie"
        verbose_name_plural = "Kategorien"

    def __str__(self) -> str:
        return self.slug


class CategoryTranslation(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="translations")
    language = models.CharField(max_length=2, choices=LANGUAGE_CHOICES)
    name = models.CharField(max_length=100)

    class Meta:
        constraints = [
            UniqueConstraint(fields=["category", "language"], name="unique_category_translation"),
        ]
        ordering = ["category", "language"]

    def __str__(self) -> str:
        return f"{self.category.slug} [{self.language}] {self.name}"


class Course(models.Model):
    slug = models.SlugField(unique=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="courses")
    base_price_chf = models.DecimalField(max_digits=8, decimal_places=2)
    duration_hours = models.DecimalField(max_digits=4, decimal_places=2)
    image = models.ImageField(upload_to="courses/", null=True, blank=True)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "slug"]
        verbose_name = "Kurs"
        verbose_name_plural = "Kurse"

    def __str__(self) -> str:
        return self.slug


class CourseTranslation(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="translations")
    language = models.CharField(max_length=2, choices=LANGUAGE_CHOICES)
    title = models.CharField(max_length=200)
    short_description = models.CharField(max_length=500)
    long_description = models.TextField(blank=True)

    class Meta:
        constraints = [
            UniqueConstraint(fields=["course", "language"], name="unique_course_translation"),
        ]
        ordering = ["course", "language"]

    def __str__(self) -> str:
        return f"{self.course.slug} [{self.language}] {self.title}"


class Location(models.Model):
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=200)
    address_line = models.CharField(max_length=200)
    postal_code = models.CharField(max_length=10)
    city = models.CharField(max_length=100)
    country = models.CharField(max_length=2, default="CH")
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Ort"
        verbose_name_plural = "Orte"

    def __str__(self) -> str:
        return self.name


class CourseSession(models.Model):
    course = models.ForeignKey(Course, on_delete=models.PROTECT, related_name="sessions")
    location = models.ForeignKey(Location, on_delete=models.PROTECT, related_name="sessions")
    start_datetime = models.DateTimeField(db_index=True)
    end_datetime = models.DateTimeField()
    max_participants = models.PositiveIntegerField()
    price_chf = models.DecimalField(max_digits=8, decimal_places=2)
    status = models.CharField(max_length=10, choices=SESSION_STATUS_CHOICES, default="open")
    internal_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["start_datetime"]
        constraints = [
            CheckConstraint(
                condition=Q(end_datetime__gt=models.F("start_datetime")),
                name="session_end_after_start",
            ),
        ]
        indexes = [
            models.Index(fields=["start_datetime", "status"]),
        ]
        verbose_name = "Termin"
        verbose_name_plural = "Termine"

    def __str__(self) -> str:
        return f"{self.course.slug} @ {self.location.slug} {self.start_datetime:%Y-%m-%d %H:%M}"

    @property
    def confirmed_bookings_count(self) -> int:
        return self.bookings.filter(status="confirmed").count()

    @property
    def available_spots(self) -> int:
        return max(0, self.max_participants - self.confirmed_bookings_count)

    @property
    def is_bookable(self) -> bool:
        return (
            self.status == "open"
            and self.available_spots > 0
            and self.start_datetime > timezone.now()
        )
