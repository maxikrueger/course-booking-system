from __future__ import annotations

from django.contrib import admin

from .models import Booking, BookingCounter


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin[Booking]):
    list_display = (
        "booking_number",
        "session",
        "first_name",
        "last_name",
        "email",
        "status",
        "created_at",
    )
    list_filter = ("status", "language")
    search_fields = ("booking_number", "first_name", "last_name", "email")
    readonly_fields = ("booking_number", "created_at", "updated_at")
    date_hierarchy = "created_at"


@admin.register(BookingCounter)
class BookingCounterAdmin(admin.ModelAdmin[BookingCounter]):
    list_display = ("year", "current_value")
    readonly_fields = ("year", "current_value")
