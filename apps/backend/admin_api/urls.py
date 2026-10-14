from __future__ import annotations

from django.urls import path

from . import admin_views, auth_views

app_name = "admin_api"

urlpatterns = [
    # Auth
    path("auth/login/", auth_views.LoginView.as_view(), name="login"),
    path("auth/refresh/", auth_views.RefreshView.as_view(), name="refresh"),
    path("auth/logout/", auth_views.LogoutView.as_view(), name="logout"),
    path("auth/me/", auth_views.MeView.as_view(), name="me"),
    # Dashboard
    path("stats/", admin_views.AdminStatsView.as_view(), name="stats"),
    # Categories / Locations (Read-only Helper)
    path(
        "categories/",
        admin_views.AdminCategoryListView.as_view(),
        name="category-list",
    ),
    path(
        "locations/",
        admin_views.AdminLocationListView.as_view(),
        name="location-list",
    ),
    # Courses
    path(
        "courses/",
        admin_views.AdminCourseListCreateView.as_view(),
        name="course-list",
    ),
    path(
        "courses/<int:pk>/",
        admin_views.AdminCourseDetailView.as_view(),
        name="course-detail",
    ),
    # Sessions
    path(
        "sessions/",
        admin_views.AdminSessionListCreateView.as_view(),
        name="session-list",
    ),
    path(
        "sessions/<int:pk>/",
        admin_views.AdminSessionDetailView.as_view(),
        name="session-detail",
    ),
    path(
        "sessions/<int:pk>/cancel/",
        admin_views.AdminSessionCancelView.as_view(),
        name="session-cancel",
    ),
    path(
        "sessions/<int:pk>/participants.csv",
        admin_views.AdminSessionParticipantsCsvView.as_view(),
        name="session-participants-csv",
    ),
    # Bookings
    path(
        "bookings/",
        admin_views.AdminBookingListView.as_view(),
        name="booking-list",
    ),
    path(
        "bookings/<int:pk>/",
        admin_views.AdminBookingDetailView.as_view(),
        name="booking-detail",
    ),
]
