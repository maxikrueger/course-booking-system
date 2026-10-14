from __future__ import annotations

import pytest
from rest_framework.test import APIClient

from courses.models import Category, CategoryTranslation, Course, CourseSession


@pytest.fixture
def client() -> APIClient:
    return APIClient()


@pytest.mark.django_db
def test_categories_returns_active_with_translations(client: APIClient, category: Category) -> None:
    response = client.get("/api/v1/categories/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert any(c["slug"] == "auto" and c["name"] == "Auto" for c in data)


@pytest.mark.django_db
def test_categories_hides_inactive(client: APIClient, category: Category) -> None:
    inactive = Category.objects.create(slug="hidden", order=99, is_active=False)
    CategoryTranslation.objects.create(category=inactive, language="de", name="Versteckt")
    response = client.get("/api/v1/categories/")
    slugs = {c["slug"] for c in response.json()}
    assert "hidden" not in slugs
    assert "auto" in slugs


@pytest.mark.django_db
def test_courses_list_happy(client: APIClient, course: Course) -> None:
    response = client.get("/api/v1/courses/")
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 1
    item = data["results"][0]
    assert item["slug"] == "wab-kurs-deutsch"
    assert item["category"]["slug"] == "auto"
    assert item["title"] == "WAB-Kurs Deutsch"
    assert item["base_price_chf"] == "350.00"


@pytest.mark.django_db
def test_courses_list_filter_by_category(client: APIClient, course: Course) -> None:
    response = client.get("/api/v1/courses/?category=motorrad")
    data = response.json()
    assert data["count"] == 0


@pytest.mark.django_db
def test_courses_list_accept_language_english(client: APIClient, course: Course) -> None:
    response = client.get("/api/v1/courses/", HTTP_ACCEPT_LANGUAGE="en")
    item = response.json()["results"][0]
    assert item["title"] == "WAB Course English"


@pytest.mark.django_db
def test_courses_list_falls_back_to_de(client: APIClient, course: Course) -> None:
    # Französisch nicht angelegt → fallback auf de.
    response = client.get("/api/v1/courses/", HTTP_ACCEPT_LANGUAGE="fr")
    item = response.json()["results"][0]
    assert item["title"] == "WAB-Kurs Deutsch"


@pytest.mark.django_db
def test_course_detail_happy(client: APIClient, course: Course) -> None:
    response = client.get(f"/api/v1/courses/{course.slug}/")
    assert response.status_code == 200
    data = response.json()
    assert data["slug"] == course.slug
    assert "long_description" in data
    assert data["long_description"].startswith("Lange Beschreibung")


@pytest.mark.django_db
def test_course_detail_404(client: APIClient) -> None:
    response = client.get("/api/v1/courses/does-not-exist/")
    assert response.status_code == 404


@pytest.mark.django_db
def test_course_sessions_happy(client: APIClient, course: Course, session: CourseSession) -> None:
    response = client.get(f"/api/v1/courses/{course.slug}/sessions/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    item = data[0]
    assert item["id"] == session.id
    assert item["max_participants"] == 12
    assert item["available_spots"] == 12
    assert item["is_bookable"] is True
    assert item["location"]["slug"] == "nordwest"


@pytest.mark.django_db
def test_course_sessions_only_bookable_filters_closed(
    client: APIClient, course: Course, session: CourseSession
) -> None:
    session.status = "closed"
    session.save(update_fields=["status"])
    response = client.get(f"/api/v1/courses/{course.slug}/sessions/")
    assert response.json() == []
    # explicit only_bookable=false zeigt sie wieder
    response2 = client.get(f"/api/v1/courses/{course.slug}/sessions/?only_bookable=false")
    assert len(response2.json()) == 1


@pytest.mark.django_db
def test_course_sessions_404_unknown_course(client: APIClient) -> None:
    response = client.get("/api/v1/courses/no-such-course/sessions/")
    assert response.status_code == 404


@pytest.mark.django_db
def test_session_detail_happy(client: APIClient, session: CourseSession) -> None:
    response = client.get(f"/api/v1/sessions/{session.id}/")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == session.id


@pytest.mark.django_db
def test_session_detail_404(client: APIClient) -> None:
    response = client.get("/api/v1/sessions/9999/")
    assert response.status_code == 404
