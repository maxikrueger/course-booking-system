# REST API

Base path `/api/v1/`. JSON only. Trailing slashes are required (Django default).

## Conventions

| Topic | Rule |
|---|---|
| Pagination | DRF `PageNumberPagination`, `?page=1&page_size=20`. Lists documented as a bare array are unpaginated. |
| Dates | ISO 8601 with offset, e.g. `2026-06-15T08:00:00+02:00`. Stored in UTC, rendered in `Europe/Zurich`. |
| Money | Decimal **strings**, never floats: `"350.00"`. |
| Language | `Accept-Language` header, falls back to `de`. Public endpoints return one resolved language; admin endpoints return all. |
| Auth | Public endpoints are anonymous. Everything under `/api/v1/admin/` needs the JWT access cookie and `is_staff`. |
| Errors | Field validation returns DRF's `{"field": ["message"]}`. Domain errors return `{"error": "<code>", "message": "<human text>"}`. |

---

## Public endpoints

### `GET /categories/`

All active categories, names resolved to the requested language. Unpaginated.

```json
[{ "id": 1, "slug": "auto", "name": "Auto", "order": 1 }]
```

### `GET /courses/`

Active courses, paginated.

| Query parameter | Meaning |
|---|---|
| `category` | category slug, e.g. `auto` |

```json
{
  "count": 6,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 5,
      "slug": "wab-kurs-deutsch",
      "category": { "slug": "auto", "name": "Auto" },
      "title": "WAB-Kurs Deutsch",
      "short_description": "Obligatorischer Kurs für Neulenker",
      "base_price_chf": "350.00",
      "duration_hours": "7.00",
      "image_url": null,
      "next_session_date": "2026-06-15T08:00:00+02:00"
    }
  ]
}
```

`next_session_date` is the start of the next open session in the future, or `null`.

### `GET /courses/{slug}/`

Same shape plus `long_description`. `404` if the course is inactive or unknown.

### `GET /courses/{slug}/sessions/`

Dates for one course, ordered by `start_datetime`. Unpaginated.

| Query parameter | Default | Meaning |
|---|---|---|
| `from` | now | ISO datetime; only sessions starting at or after it |
| `location` | – | location slug |
| `only_bookable` | `true` | keep only sessions that are open, in the future and have seats |

```json
[
  {
    "id": 42,
    "start_datetime": "2026-06-15T08:00:00+02:00",
    "end_datetime": "2026-06-15T17:00:00+02:00",
    "location": { "slug": "nordwest", "name": "Trainingszentrum Nordwest", "city": "Muttenz" },
    "price_chf": "350.00",
    "max_participants": 12,
    "available_spots": 4,
    "is_bookable": true,
    "status": "open"
  }
]
```

### `GET /sessions/{id}/`

One session, always live — the wizard re-reads it before the confirmation step so a
seat that filled up in the meantime is visible before the user submits.

### `POST /bookings/`

Creates a booking. Atomic and race-condition safe: the session row is locked with
`SELECT FOR UPDATE`, capacity is checked inside the transaction, and the booking number
is drawn from a locked per-year counter.

```json
{
  "session_id": 42,
  "salutation": "mr",
  "first_name": "Max",
  "last_name": "Mustermann",
  "email": "max@example.com",
  "phone": "+41791234567",
  "street": "Musterweg 1",
  "postal_code": "8000",
  "city": "Zürich",
  "country": "CH",
  "date_of_birth": "1995-03-15",
  "license_date": "2025-08-01",
  "voucher_code": "",
  "notes": "",
  "language": "de",
  "accept_terms": true
}
```

`license_date`, `voucher_code` and `notes` are optional; `country` defaults to `CH`,
`language` to `de`.

**`201 Created`**

```json
{
  "booking_number": "BP-2026-00042",
  "session": {
    "id": 42,
    "course_title": "WAB-Kurs Deutsch",
    "start_datetime": "2026-06-15T08:00:00+02:00",
    "end_datetime": "2026-06-15T17:00:00+02:00",
    "location_name": "Trainingszentrum Nordwest"
  },
  "status": "confirmed",
  "created_at": "2026-05-03T14:23:11Z"
}
```

**`400 Bad Request`** — one of:

| `error` | When | Extra field |
|---|---|---|
| `session_full` | no seats left at commit time | `available_spots` |
| `session_not_open` | session is cancelled or closed | `session_status` |
| `terms_not_accepted` | `accept_terms` was false | – |

Schema problems return DRF field errors instead, e.g.
`{"email": ["Enter a valid email address."]}`. A session that does not exist or has
already started comes back as a `session_id` field error.

### `GET /bookings/{booking_number}/?email=...`

Retrieves a booking. The e-mail must match the one stored on the booking; a wrong or
missing e-mail returns `404`, exactly like an unknown booking number, so the endpoint
cannot be used to enumerate bookings. Returns the full booking including address.

---

## Admin endpoints

All paths below are prefixed with `/api/v1/admin/` and require the access cookie plus
`is_staff`. Anonymous or non-staff requests get `401`/`403`.

### Auth

| Endpoint | Behaviour |
|---|---|
| `POST /auth/login/` | `{username, password}` → `200 {user}`; access and refresh tokens are set as **httpOnly cookies**, never returned in the body. Rate limited to 5 attempts/min/IP → `429 {"error": "rate_limited"}`. Bad credentials or a non-staff user → `401 {"error": "invalid_credentials"}`. |
| `POST /auth/refresh/` | Reads the refresh cookie, issues a new pair, blacklists the old refresh token → `200 {"refreshed": true}`. |
| `POST /auth/logout/` | Blacklists the refresh token and clears both cookies. |
| `GET /auth/me/` | `{user: {id, username, email, is_staff, is_superuser}}` — used by the protected layout to decide between rendering and redirecting. |

### Dashboard

`GET /stats/` returns everything the dashboard needs in one request:

```json
{
  "totals": {
    "courses": 6,
    "upcoming_sessions": 21,
    "bookings_last_7_days": 20,
    "confirmed_bookings": 14
  },
  "upcoming_sessions": [
    {
      "id": 42, "course_title": "WAB-Kurs Deutsch",
      "start_datetime": "2026-06-15T08:00:00+02:00",
      "location_name": "Trainingszentrum Nordwest",
      "max_participants": 12, "confirmed_bookings_count": 5, "available_spots": 7
    }
  ],
  "recent_bookings": [
    {
      "id": 19, "booking_number": "BP-2026-00019", "full_name": "Max Mustermann",
      "course_title": "WAB-Kurs Deutsch", "start_datetime": "2026-06-15T08:00:00+02:00",
      "status": "confirmed", "created_at": "2026-05-03T14:23:11Z"
    }
  ]
}
```

Five upcoming sessions, five bookings from the last seven days.

### Reference data

`GET /categories/` and `GET /locations/` return unpaginated `{id, slug, name, …}` lists
for the select fields in the course and session forms.

### Courses

| Endpoint | Notes |
|---|---|
| `GET /courses/` | All courses, **including inactive ones**, with every translation. Filters: `search` (slug and titles), `category`. |
| `POST /courses/` | Create with all translations in one payload. |
| `GET` / `PATCH /courses/{id}/` | Read and update, translations included. |
| `DELETE /courses/{id}/` | `409 Conflict` with `{"error": "course_has_bookings"}` if any session of the course has bookings. |

The `translations` field is a dictionary keyed by language code:

```json
{
  "slug": "wab-kurs-deutsch",
  "category": 1,
  "base_price_chf": "350.00",
  "duration_hours": "7.00",
  "is_active": true,
  "order": 0,
  "translations": {
    "de": { "title": "WAB-Kurs Deutsch", "short_description": "…", "long_description": "…" },
    "en": { "title": "WAB Course English", "short_description": "…", "long_description": "…" }
  }
}
```

German is mandatory — `title` and `short_description` must be non-empty. Other languages
are optional and additive: a language left empty is skipped, and a language dropped from
the payload deletes that translation row.

### Sessions

| Endpoint | Notes |
|---|---|
| `GET /sessions/` | Filters: `course` (id), `from`, `to` (ISO date), `status`. Each row carries `course_title`, `location_name`, `available_spots`, `confirmed_bookings_count`. |
| `POST /sessions/` | Create. |
| `PATCH /sessions/{id}/` | See the guards below. |
| `DELETE /sessions/{id}/` | `400 {"error": "session_has_bookings"}` while any booking exists — cancelled ones included, because they are the audit trail. |
| `POST /sessions/{id}/cancel/` | Sets the session to `cancelled` **and** cancels all its bookings. |
| `GET /sessions/{id}/participants.csv` | Semicolon-separated CSV with a UTF-8 BOM so Excel on Windows reads the umlauts; filename `teilnehmer-{id}-{date}.csv`. Confirmed bookings only, sorted by last name. |

Validation that protects booked sessions:

- `end_datetime` must be after `start_datetime`.
- `start_datetime` / `end_datetime` cannot change while confirmed bookings exist.
- `max_participants` cannot drop below the number of confirmed bookings, and must be positive.
- `price_chf` cannot be negative.

The CSV is fetched by the browser with the auth cookie attached, so no token ever
appears in a URL or in browser history.

### Bookings

| Endpoint | Notes |
|---|---|
| `GET /bookings/` | Filters: `session` (id), `status`, `search` (name, e-mail, booking number). |
| `GET` / `PATCH /bookings/{id}/` | Edit contact data or set `status` to `cancelled`. `booking_number`, `session` and `created_at` are read-only — a booking never silently moves to another date. |
