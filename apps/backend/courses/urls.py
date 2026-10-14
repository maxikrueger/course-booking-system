from __future__ import annotations

from django.urls import path

from . import views

urlpatterns = [
    path("categories/", views.CategoryListView.as_view(), name="category-list"),
    path("courses/", views.CourseListView.as_view(), name="course-list"),
    path("courses/<slug:slug>/", views.CourseDetailView.as_view(), name="course-detail"),
    path(
        "courses/<slug:slug>/sessions/",
        views.CourseSessionsView.as_view(),
        name="course-sessions",
    ),
    path("sessions/<int:pk>/", views.SessionDetailView.as_view(), name="session-detail"),
]
