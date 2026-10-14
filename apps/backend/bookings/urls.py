from __future__ import annotations

from django.urls import path

from . import views

urlpatterns = [
    path("bookings/", views.BookingCreateView.as_view(), name="booking-create"),
    path(
        "bookings/<str:booking_number>/",
        views.BookingDetailView.as_view(),
        name="booking-detail",
    ),
]
