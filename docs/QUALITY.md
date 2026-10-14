# Quality

What is tested, what was measured, and what is knowingly left open.

## Test suites

| Suite | Count | Runtime | Command |
|---|---|---|---|
| Backend, SQLite | 45 | ~1 s | `make test-fast` |
| Backend, PostgreSQL (race conditions) | 2 | ~1 s | `make test-race` |
| Frontend unit (Vitest, both apps) | 12 | ~2 s | `pnpm test` per app |
| E2E booking-web (Playwright, incl. axe + mobile) | 10 | ~13 s | `pnpm test:e2e` |
| E2E admin-web (Playwright, incl. axe + mobile) | 13 | ~20 s | `pnpm test:e2e` |

`make test` runs everything except the E2E suites; those need a running stack
(PostgreSQL, backend with seed data, both Next.js servers) and a browser.

The two PostgreSQL tests are the ones that matter most: they start two real threads
against a session with a single free seat and assert that exactly one gets `201` and the
other gets `400 session_full`. SQLite cannot express that — `SELECT FOR UPDATE` is a
no-op there — which is why those two tests have their own settings module and target.

Static analysis, all run in CI:

```
ruff format --check . && ruff check .    # backend
mypy .                                   # backend, --strict, 50 files
eslint --max-warnings=0                  # both frontends
tsc --noEmit                             # both frontends
```

## Accessibility

`@axe-core/playwright` runs against the ruleset `wcag2a`, `wcag2aa`, `wcag21a`,
`wcag21aa` on eight pages. Last run: 2026-10-14, all green.

| App | Page |
|---|---|
| booking-web | `/` home |
| booking-web | `/kurse/[slug]` course detail |
| booking-web | `/buchung/termin/[id]` wizard step 1 |
| booking-web | `/buchung/daten` wizard step 2 |
| booking-web | `/buchung/bestaetigung` wizard step 3 |
| admin-web | `/login` |
| admin-web | `/dashboard` |
| admin-web | `/termine/[id]` session edit |

Fixes made while building this harness, all still covered by the specs above:

| Fix | Where | WCAG |
|---|---|---|
| `aria-current` on the active category filter | `booking-web/src/app/kurse/page.tsx` | 4.1.2 |
| `aria-label` on the search field and status filter | `admin-web/.../buchungen/page.tsx` | 1.3.1 |
| `role="tablist"` / `role="tab"` / `aria-selected` on the language tabs | `admin-web/.../courses/course-form.tsx` | 4.1.2 |
| `role="tablist"` / `aria-selected` on the calendar/list toggle | `admin-web/.../termine/page.tsx` | 4.1.2 |
| `aria-current="page"` on the active sidebar link, `aria-label` + `aria-expanded` on the hamburger | `admin-web/.../layout/sidebar.tsx` | 4.1.2 |
| `aria-hidden="true"` on loading skeletons | both apps, `ui/skeleton.tsx` | 4.1.2 |
| `CourseCard` heading changed from `h3` to `h2` | `booking-web/.../course-card.tsx` | heading order |

Not enforced, deliberately:

- **`heading-order`** on `/` and `/dashboard` (`h1 → h3` via card titles). axe classifies
  this as best-practice, not WCAG A/AA. Fixing it properly means making the card title
  level a prop, which is a refactor worth doing on its own.
- **`color-contrast` on `text-slate-400`** — only used for intentionally disabled actions,
  which are already marked `aria-disabled`, and which axe evaluates separately.

## Lighthouse

Run on 2026-10-14 with Lighthouse 13.5.0 against production builds
(`pnpm build && pnpm start`), desktop form factor, no throttling:

| App | Route | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|---|
| booking-web | `/` | 100 | 100 | 100 | 100 |
| booking-web | `/kurse` | 100 | 100 | 100 | 91 |
| admin-web | `/login` | 100 | 100 | 100 | 63 |

The two SEO numbers below 100 are understood, and neither is a defect to chase:

- **admin-web `/login` — 63.** The single failing audit is "page is blocked from
  indexing", which is the point: the admin UI is `noindex` by design (`robots.ts`
  disallows everything). A perfect SEO score here would mean the admin had been
  published to search engines.
- **booking-web `/kurse` — 91.** The failing audit is "document does not have a meta
  description". The tag *is* produced — but `/kurse` reads `searchParams` for the
  category filter, so it renders dynamically, and Next.js 15 streams its metadata,
  which lands in `<body>` instead of `<head>` for a normal browser user agent. Known
  crawlers (Next's `htmlLimitedBots` list, Googlebot among them) get blocking metadata
  in the head, so real-world indexing is unaffected; Lighthouse, running as a plain
  browser, is not on that list.

  Two ways out if it ever matters: hoist the category filter from a query parameter into
  a route segment so the page prerenders, or make the root layout's metadata synchronous
  instead of resolving it through `next-intl`. The second is a two-line change but
  hardcodes German into the layout, which gives up the i18n-ready structure for a
  measurement artifact — not a trade worth making today.

Performance comes from the architecture rather than from tuning: the public pages are
Server Components rendered with ISR, so the browser gets HTML and very little
JavaScript. No bundle-size work was needed to reach 100.

## Continuous integration

`.github/workflows/ci.yml` on every push to `main` and every pull request:

| Job | Does |
|---|---|
| `backend` | ruff, mypy `--strict`, pytest against a PostgreSQL service container |
| `frontend` | eslint, `tsc --noEmit`, `next build`, vitest — per app |
| `e2e` | **pull requests only**: PostgreSQL + migrate + seed + backend, then both Playwright suites incl. mobile and axe |

The E2E job is pull-request-only because it costs roughly five minutes (browser
download, database, three servers). The login rate limit is switched off there via
`RATELIMIT_ENABLE=False` — a test suite logs in far more than five times per minute,
and a `429` from the rate limiter is not a signal anyone wants in a CI log.

The mobile Playwright project uses the iPhone 14 viewport with Chromium as the engine
rather than WebKit, so it runs in CI and in any container with Chromium installed.
It covers layout behaviour (collapsed sidebar, list instead of calendar, no horizontal
overflow), not engine-specific rendering.

## Known gaps

- Frontend unit coverage is thin (12 tests). The real safety net is the E2E suite.
- No coverage threshold is enforced on the backend.
- Lighthouse is run manually, not in CI; a regression in bundle size would not fail a build.
- No load testing. The booking endpoint has been verified correct under concurrency,
  but not measured under it.
