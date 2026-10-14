"""Seed demo data: 3 categories, 6 courses, 3 locations, 30 sessions, 12 bookings."""

from __future__ import annotations

from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import Any

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from bookings.models import Booking, BookingCounter
from courses.models import (
    Category,
    CategoryTranslation,
    Course,
    CourseSession,
    CourseTranslation,
    Location,
)

CATEGORY_DATA: list[dict[str, Any]] = [
    {
        "slug": "auto",
        "order": 1,
        "translations": {
            "de": "Auto",
            "en": "Car",
            "fr": "Voiture",
        },
    },
    {
        "slug": "motorrad",
        "order": 2,
        "translations": {
            "de": "Motorrad",
            "en": "Motorcycle",
        },
    },
    {
        "slug": "spezialkurs",
        "order": 3,
        "translations": {
            "de": "Spezialkurs",
            "en": "Special",
        },
    },
]

COURSE_DATA: list[dict[str, Any]] = [
    {
        "slug": "wab-kurs-deutsch",
        "category": "auto",
        "base_price_chf": "350.00",
        "duration_hours": "7.00",
        "translations": {
            "de": {
                "title": "WAB-Kurs Deutsch",
                "short_description": "Obligatorischer Kurs für Neulenker",
                "long_description": (
                    "Der zweiteilige Weiterbildungskurs (WAB) ist Pflicht für alle "
                    "Neulenkerinnen und Neulenker. In sieben Stunden trainierst du "
                    "Notbremsung, Slalom und vorausschauendes Fahren."
                ),
            },
            "en": {
                "title": "WAB Course English",
                "short_description": "Mandatory course for new drivers",
                "long_description": "Two-part advanced training, mandatory for new drivers in Switzerland.",
            },
        },
    },
    {
        "slug": "fahrtraining-pkw",
        "category": "auto",
        "base_price_chf": "295.00",
        "duration_hours": "5.00",
        "translations": {
            "de": {
                "title": "Fahrtraining PKW",
                "short_description": "Sicherheitstraining für erfahrene Fahrer:innen",
                "long_description": (
                    "Auffrischung der wichtigsten Sicherheitstechniken: "
                    "Bremsen, Ausweichen, Kurventechnik."
                ),
            },
            "en": {
                "title": "Car Safety Training",
                "short_description": "Safety training for experienced drivers",
                "long_description": "Refresh your safety skills: braking, swerving, cornering.",
            },
        },
    },
    {
        "slug": "winterfahrtraining",
        "category": "auto",
        "base_price_chf": "390.00",
        "duration_hours": "6.00",
        "translations": {
            "de": {
                "title": "Winterfahrtraining",
                "short_description": "Sicher unterwegs auf Schnee und Eis",
                "long_description": "Ein Tag auf der Eis- und Schneepiste mit Übungen zu Untersteuern, Übersteuern und Bremsen.",
            },
        },
    },
    {
        "slug": "motorrad-grundkurs",
        "category": "motorrad",
        "base_price_chf": "240.00",
        "duration_hours": "8.00",
        "translations": {
            "de": {
                "title": "Motorrad Grundkurs",
                "short_description": "Pflichtkurs für angehende Motorradfahrer:innen",
                "long_description": "Pflichtkurs gemäss Verkehrszulassungsverordnung.",
            },
            "en": {
                "title": "Motorcycle Basic",
                "short_description": "Mandatory course for new riders",
                "long_description": "Required basic motorcycle course.",
            },
        },
    },
    {
        "slug": "motorrad-aufbau",
        "category": "motorrad",
        "base_price_chf": "280.00",
        "duration_hours": "6.00",
        "translations": {
            "de": {
                "title": "Motorrad Aufbaukurs",
                "short_description": "Technik & Sicherheit für Fortgeschrittene",
                "long_description": "Erweiterte Übungen zu Schräglage, Notbremsung und Bremspunkten.",
            },
        },
    },
    {
        "slug": "anhaengerkurs",
        "category": "spezialkurs",
        "base_price_chf": "420.00",
        "duration_hours": "8.00",
        "translations": {
            "de": {
                "title": "Anhängerkurs BE",
                "short_description": "Sicheres Manövrieren mit Anhänger",
                "long_description": (
                    "Theorie und Praxis zum Fahren mit Anhänger. Rangieren, "
                    "Rückwärtsfahren, Kurventechnik."
                ),
            },
        },
    },
]

LOCATION_DATA: list[dict[str, Any]] = [
    {
        "slug": "nordwest",
        "name": "Trainingszentrum Nordwest",
        "address_line": "Industriestrasse 12",
        "postal_code": "4132",
        "city": "Muttenz",
        "country": "CH",
        "latitude": 47.5222,
        "longitude": 7.6445,
    },
    {
        "slug": "mittelland",
        "name": "Verkehrsübungsplatz Mittelland",
        "address_line": "Flugplatzstrasse 8",
        "postal_code": "3400",
        "city": "Burgdorf",
        "country": "CH",
        "latitude": 47.0588,
        "longitude": 7.6280,
    },
    {
        "slug": "ostschweiz",
        "name": "Fahrsicherheitszentrum Ostschweiz",
        "address_line": "Rheinstrasse 44",
        "postal_code": "9470",
        "city": "Buchs",
        "country": "CH",
        "latitude": 47.1665,
        "longitude": 9.4760,
    },
]


# Fiktive Teilnehmer:innen für ein Dashboard, das nach etwas aussieht.
PARTICIPANT_DATA: list[dict[str, str]] = [
    {
        "salutation": "mrs",
        "first_name": "Anna",
        "last_name": "Weber",
        "city": "Basel",
        "postal_code": "4051",
    },
    {
        "salutation": "mr",
        "first_name": "Luca",
        "last_name": "Rossi",
        "city": "Bern",
        "postal_code": "3011",
    },
    {
        "salutation": "mrs",
        "first_name": "Sarah",
        "last_name": "Meier",
        "city": "Zürich",
        "postal_code": "8004",
    },
    {
        "salutation": "mr",
        "first_name": "Jonas",
        "last_name": "Brunner",
        "city": "Luzern",
        "postal_code": "6003",
    },
    {
        "salutation": "mrs",
        "first_name": "Elena",
        "last_name": "Keller",
        "city": "St. Gallen",
        "postal_code": "9000",
    },
    {
        "salutation": "mr",
        "first_name": "Marco",
        "last_name": "Steiner",
        "city": "Winterthur",
        "postal_code": "8400",
    },
    {
        "salutation": "div",
        "first_name": "Nina",
        "last_name": "Frei",
        "city": "Thun",
        "postal_code": "3600",
    },
    {
        "salutation": "mr",
        "first_name": "David",
        "last_name": "Lüthi",
        "city": "Chur",
        "postal_code": "7000",
    },
    {
        "salutation": "mrs",
        "first_name": "Laura",
        "last_name": "Baumann",
        "city": "Aarau",
        "postal_code": "5000",
    },
    {
        "salutation": "mr",
        "first_name": "Tobias",
        "last_name": "Graf",
        "city": "Zug",
        "postal_code": "6300",
    },
    {
        "salutation": "mrs",
        "first_name": "Mia",
        "last_name": "Huber",
        "city": "Olten",
        "postal_code": "4600",
    },
    {
        "salutation": "mr",
        "first_name": "Samuel",
        "last_name": "Vogel",
        "city": "Sion",
        "postal_code": "1950",
    },
]

# (Index der Session in der chronologischen Liste, Anzahl Buchungen)
BOOKINGS_PER_SESSION: list[tuple[int, int]] = [(0, 5), (1, 3), (2, 2), (4, 1), (6, 1)]


class Command(BaseCommand):
    help = "Seed demo data: categories, courses, locations, sessions."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Vor dem Seed alle Demo-Daten löschen.",
        )

    @transaction.atomic
    def handle(self, *args: Any, **options: Any) -> None:
        reset = options.get("reset", False)
        if reset:
            self.stdout.write(self.style.WARNING("→ Reset bestehender Demo-Daten"))
            Booking.objects.all().delete()
            BookingCounter.objects.all().delete()
            CourseSession.objects.all().delete()
            CourseTranslation.objects.all().delete()
            Course.objects.all().delete()
            CategoryTranslation.objects.all().delete()
            Category.objects.all().delete()
            Location.objects.all().delete()

        categories: dict[str, Category] = {}
        for entry in CATEGORY_DATA:
            cat, _ = Category.objects.update_or_create(
                slug=entry["slug"],
                defaults={"order": entry["order"], "is_active": True},
            )
            categories[entry["slug"]] = cat
            for lang, name in entry["translations"].items():
                CategoryTranslation.objects.update_or_create(
                    category=cat, language=lang, defaults={"name": name}
                )

        locations: dict[str, Location] = {}
        for entry in LOCATION_DATA:
            loc, _ = Location.objects.update_or_create(
                slug=entry["slug"],
                defaults={
                    "name": entry["name"],
                    "address_line": entry["address_line"],
                    "postal_code": entry["postal_code"],
                    "city": entry["city"],
                    "country": entry["country"],
                    "latitude": entry["latitude"],
                    "longitude": entry["longitude"],
                    "is_active": True,
                },
            )
            locations[entry["slug"]] = loc

        courses: dict[str, Course] = {}
        for idx, entry in enumerate(COURSE_DATA):
            course, _ = Course.objects.update_or_create(
                slug=entry["slug"],
                defaults={
                    "category": categories[entry["category"]],
                    "base_price_chf": Decimal(entry["base_price_chf"]),
                    "duration_hours": Decimal(entry["duration_hours"]),
                    "is_active": True,
                    "order": idx,
                },
            )
            courses[entry["slug"]] = course
            for lang, fields in entry["translations"].items():
                CourseTranslation.objects.update_or_create(
                    course=course,
                    language=lang,
                    defaults=fields,
                )

        # 20+ Sessions in den nächsten 3 Monaten generieren
        location_slugs = list(locations.keys())
        course_slugs = list(courses.keys())
        now = timezone.now()
        # Wir starten beim nächsten Tag und gehen ~80 Tage in die Zukunft, alle ~3 Tage.
        sessions_created = 0
        for index, offset in enumerate(range(2, 92, 3)):
            day = now + timedelta(days=offset)
            course = courses[course_slugs[index % len(course_slugs)]]
            location = locations[location_slugs[index % len(location_slugs)]]
            # Kurs-Dauer in Stunden
            duration_hours = float(course.duration_hours)
            start = datetime.combine(day.date(), time(8, 0), tzinfo=now.tzinfo)
            end = start + timedelta(hours=duration_hours)
            CourseSession.objects.update_or_create(
                course=course,
                location=location,
                start_datetime=start,
                defaults={
                    "end_datetime": end,
                    "max_participants": 12 if offset % 2 == 0 else 8,
                    "price_chf": course.base_price_chf,
                    "status": "open",
                },
            )
            sessions_created += 1

        bookings_created = self._seed_bookings()

        self.stdout.write(
            self.style.SUCCESS(
                f"✓ {len(categories)} Categories, {len(courses)} Courses, "
                f"{len(locations)} Locations, {sessions_created} Sessions, "
                f"{bookings_created} Bookings."
            )
        )

    def _seed_bookings(self) -> int:
        """Lege Demo-Buchungen an – idempotent: nur, wenn noch keine existieren."""
        if Booking.objects.exists():
            return 0

        upcoming = list(CourseSession.objects.order_by("start_datetime"))
        participants = iter(PARTICIPANT_DATA)
        created = 0

        for session_index, count in BOOKINGS_PER_SESSION:
            if session_index >= len(upcoming):
                continue
            session = upcoming[session_index]
            for _ in range(min(count, session.max_participants)):
                person = next(participants, None)
                if person is None:
                    return created
                email = f"{person['first_name']}.{person['last_name']}@example.com"
                Booking.objects.create(
                    session=session,
                    salutation=person["salutation"],
                    first_name=person["first_name"],
                    last_name=person["last_name"],
                    email=email.lower().replace("ü", "ue"),
                    phone="+41 79 000 00 00",
                    street="Musterweg 1",
                    postal_code=person["postal_code"],
                    city=person["city"],
                    country="CH",
                    date_of_birth=date(1995, 3, 15),
                    language="de",
                    accepted_terms_at=timezone.now(),
                    status="confirmed",
                )
                created += 1

        # Eine stornierte Buchung, damit die Statusfilter im Admin etwas zu filtern haben.
        last = Booking.objects.order_by("-id").first()
        if last is not None:
            last.status = "cancelled"
            last.save(update_fields=["status", "updated_at"])

        return created
