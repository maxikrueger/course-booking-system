# Engineering decisions

The choices that shaped this codebase, and what they cost. Each entry names the
alternative that was rejected, because that is the part that is usually missing.

---

## Capacity is decided by a row lock, not by application code

**Problem.** Two customers click "book" on the last seat within the same millisecond.
Reading `available_spots`, deciding, and then inserting leaves a window in which both
requests see one free seat.

**Decision.** The whole booking runs in one transaction that starts with
`SELECT ... FOR UPDATE` on the session row. The second request blocks until the first
commits, then counts again and is rejected with `session_full`.

**Rejected.** An optimistic `version` column with a retry loop — more code, and every
retry still needs the same count. A `UNIQUE` constraint on `(session, seat_number)` would
work but introduces a seat-assignment concept the business does not have: seats are not
numbered, only counted.

**Cost.** Bookings for the same session serialise. Irrelevant here — the contention is a
handful of requests per session, not thousands per second.

---

## Booking numbers come from a counter table

**Problem.** `BP-2026-00042` has to be unique, human-readable over the phone, and must
not expose how many bookings the business takes.

**Decision.** A `BookingCounter` row per year is locked with `SELECT FOR UPDATE`,
incremented, and the value is formatted into the number — inside the same transaction
that creates the booking.

**Rejected.** The database id (leaks volume, changes on migration), a PostgreSQL sequence
(gaps on rollback, and gap-free numbering is what accounting expects), and `max(number) + 1`
(the classic race).

**Cost.** One extra locked row per booking, on the same transaction that is already
locking the session.

---

## Translations are rows, not columns

**Problem.** The business needs German now and may need French and English later.

**Decision.** `CourseTranslation` / `CategoryTranslation` rows keyed by language, unique
per `(entity, language)`. The public API resolves one language per request from
`Accept-Language`; the admin API returns all languages at once for its tab UI.

**Rejected.** `title_de` / `title_en` / `title_fr` columns. Each new language would be a
migration touching every text column, and "which languages exist" would live in the
schema instead of in the data.

**Cost.** Every read needs a join or `prefetch_related`, and a missing translation needs
a fallback rule (requested language → German → any).

---

## Translations are language-additive

**Problem.** The admin form shows a tab per language. What does an empty tab mean?

**Decision.** German is mandatory; other languages are only written when they contain
something. An empty tab creates nothing, and clearing a previously filled tab deletes
that translation row.

**Rejected.** Writing empty strings for every language. The API could then no longer
distinguish "not translated yet" from "deliberately blank", and the public site would
serve empty titles to French visitors instead of falling back to German.

---

## JWT in httpOnly cookies, not in `localStorage`

**Problem.** An admin UI is the highest-value XSS target in the system. Any token
reachable from JavaScript is reachable by an injected script.

**Decision.** The backend sets access and refresh tokens as `httpOnly`, `SameSite=Lax`
cookies and reads them in a custom DRF authentication class. The login response body
contains only the user object. Refresh rotates and blacklists the old token.

**Rejected.** `Authorization: Bearer` with tokens in `localStorage` (the SimpleJWT
default) — simpler to implement, but one XSS away from a stolen session that survives
logout.

**Cost.** CSRF now matters: `SameSite=Lax` plus an explicit CORS allow-list carries it in
development, and production terminates TLS so `Secure` can be set. Cross-subdomain
deployments need `AUTH_COOKIE_DOMAIN` — documented in [DEPLOYMENT.md](DEPLOYMENT.md).

---

## The CSV export rides on the auth cookie

**Problem.** The participant list must be downloadable, and the download is a plain
browser navigation — not a `fetch` the app controls.

**Decision.** The endpoint is a normal authenticated `GET` that the browser calls with
the cookie it already holds.

**Rejected.** A signed one-time token in the query string. It would leak the
authorisation into browser history, server logs and the referrer header, in exchange for
solving a problem the cookie does not have.

---

## The fast test suite runs on SQLite, the race test on PostgreSQL

**Problem.** `SELECT FOR UPDATE` is a no-op on SQLite, and SQLite in-memory databases are
not shared across threads. A race-condition test there would pass without proving
anything.

**Decision.** Two targets. `make test-fast` runs 45 tests on SQLite in about a second;
`make test-race` runs the two threading tests against a real PostgreSQL via separate
settings. `make test` runs both.

**Rejected.** Moving everything to PostgreSQL. It would cost roughly a second of database
setup per suite on every run, to make 45 tests marginally more realistic — while the two
tests that genuinely need it already get it.

**Cost.** Two settings modules, and `make test-race` needs a running database. CI runs
both; a contributor without Docker still gets the fast suite.

---

## The wizard saves the draft on every keystroke

**Problem.** "I filled in the whole form and then it was gone" is the worst failure a
booking funnel has, and it happens on a reload, a back button, or a dead mobile tab.

**Decision.** The Zustand store is persisted to `localStorage`, and a `form.watch()`
subscription writes every change straight through. Validation stays at the step boundary,
where Zod decides whether "next" is allowed.

**Rejected.** Saving only committed steps. Cheaper, but it loses exactly the data the
user spent the most time on — the half-typed address.

**Cost.** Partially valid data lives in `localStorage`. It is cleared when the booking
succeeds, and it never leaves the browser.

---

## Server Components by default, `'use client'` on purpose

**Decision.** Catalogue, course detail and date lists are Server Components fetching with
`revalidate`; only the wizard and the admin's interactive views are client components.

**Why it matters here.** The public pages are the ones that need to be fast and indexable,
and they are exactly the ones with no interactivity beyond links. That split is what the
Lighthouse scores in [QUALITY.md](QUALITY.md) are made of — not a bundle-size exercise.

---

## The calendar becomes a list on small screens

**Problem.** A seven-column month grid at 375 px renders sessions as two-pixel stripes.

**Decision.** The admin session view has a calendar/list toggle, and the list is the
default below the `md` breakpoint. Both read the same query cache.

**Rejected.** Replacing the calendar library, or horizontal scrolling. Staff planning on a
phone want "what is coming up", which is a list; the calendar earns its place on a desktop.

---

## E2E tests stay out of `make test`

**Decision.** `make test` is unit and integration tests only. Playwright runs via
`pnpm test:e2e`, and in CI only on pull requests.

**Why.** `make test` has to stay fast enough to run constantly. The E2E suite needs a
browser download, a database with seed data and three running servers — about five
minutes. Pull requests are the right granularity for that; every commit is not.
