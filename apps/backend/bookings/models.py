from __future__ import annotations

from typing import Any

from django.db import models, transaction
from django.utils import timezone

from courses.constants import LANGUAGE_CHOICES

from .constants import BOOKING_STATUS_CHOICES, SALUTATION_CHOICES


class BookingCounter(models.Model):
    """Hilfstabelle für atomare Buchungsnummer-Generierung pro Jahr."""

    year = models.PositiveIntegerField(unique=True)
    current_value = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-year"]
        verbose_name = "Buchungsnummer-Counter"
        verbose_name_plural = "Buchungsnummer-Counter"

    def __str__(self) -> str:
        return f"{self.year}: {self.current_value}"

    @classmethod
    def next_value(cls, year: int) -> int:
        """Atomar nächsten Counter-Wert für ein Jahr ermitteln.

        Muss innerhalb einer Transaktion aufgerufen werden.
        """
        counter, _ = cls.objects.select_for_update().get_or_create(year=year)
        counter.current_value += 1
        counter.save(update_fields=["current_value"])
        return counter.current_value


def generate_booking_number(year: int | None = None) -> str:
    """Generiere eine eindeutige Buchungsnummer im Format BP-YYYY-NNNNN.

    Muss innerhalb einer @transaction.atomic-Transaktion aufgerufen werden,
    damit der SELECT FOR UPDATE auf BookingCounter race-condition-sicher ist.
    """
    if year is None:
        year = timezone.now().year
    seq = BookingCounter.next_value(year)
    return f"BP-{year}-{seq:05d}"


class Booking(models.Model):
    booking_number = models.CharField(max_length=20, unique=True, db_index=True)
    session = models.ForeignKey(
        "courses.CourseSession",
        on_delete=models.PROTECT,
        related_name="bookings",
    )
    salutation = models.CharField(max_length=3, choices=SALUTATION_CHOICES)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(db_index=True)
    phone = models.CharField(max_length=30)
    street = models.CharField(max_length=200)
    postal_code = models.CharField(max_length=10)
    city = models.CharField(max_length=100)
    country = models.CharField(max_length=2, default="CH")
    date_of_birth = models.DateField()
    license_date = models.DateField(null=True, blank=True)
    voucher_code = models.CharField(max_length=50, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=BOOKING_STATUS_CHOICES, default="confirmed")
    language = models.CharField(max_length=2, choices=LANGUAGE_CHOICES, default="de")
    accepted_terms_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["session", "status"]),
        ]
        verbose_name = "Buchung"
        verbose_name_plural = "Buchungen"

    def __str__(self) -> str:
        return f"{self.booking_number} – {self.last_name}, {self.first_name}"

    def save(self, *args: Any, **kwargs: Any) -> None:
        if not self.booking_number:
            with transaction.atomic():
                self.booking_number = generate_booking_number()
                super().save(*args, **kwargs)
        else:
            super().save(*args, **kwargs)
