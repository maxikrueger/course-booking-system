from __future__ import annotations

from django.contrib import admin

from .models import (
    Category,
    CategoryTranslation,
    Course,
    CourseSession,
    CourseTranslation,
    Location,
)


class CategoryTranslationInline(admin.TabularInline[CategoryTranslation, Category]):
    model = CategoryTranslation
    extra = 1


class CourseTranslationInline(admin.TabularInline[CourseTranslation, Course]):
    model = CourseTranslation
    extra = 1


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin[Category]):
    list_display = ("slug", "order", "is_active")
    list_filter = ("is_active",)
    prepopulated_fields = {"slug": ("slug",)}
    inlines = [CategoryTranslationInline]


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin[Course]):
    list_display = ("slug", "category", "base_price_chf", "duration_hours", "is_active")
    list_filter = ("category", "is_active")
    search_fields = ("slug",)
    inlines = [CourseTranslationInline]


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin[Location]):
    list_display = ("slug", "name", "city", "is_active")
    list_filter = ("is_active", "city")
    search_fields = ("name", "city", "slug")


@admin.register(CourseSession)
class CourseSessionAdmin(admin.ModelAdmin[CourseSession]):
    list_display = (
        "id",
        "course",
        "location",
        "start_datetime",
        "end_datetime",
        "max_participants",
        "price_chf",
        "status",
    )
    list_filter = ("status", "course", "location")
    date_hierarchy = "start_datetime"


@admin.register(CategoryTranslation)
class CategoryTranslationAdmin(admin.ModelAdmin[CategoryTranslation]):
    list_display = ("category", "language", "name")
    list_filter = ("language",)


@admin.register(CourseTranslation)
class CourseTranslationAdmin(admin.ModelAdmin[CourseTranslation]):
    list_display = ("course", "language", "title")
    list_filter = ("language",)
    search_fields = ("title",)
