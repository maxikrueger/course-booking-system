# Deployment

Architecture and hosting notes. Production code changes are deliberately not part of
this repository — this file is the checklist for anyone standing up a real instance.

## What has to be solved

Three processes want to be reachable:

- **booking-web** (Next.js, :3000) — public, should be indexed.
- **admin-web** (Next.js, :3001) — internal, never indexed.
- **backend** (Django + DRF, :8000) — the only thing that talks to PostgreSQL.

You need:

1. **HTTPS.** Non-negotiable: the auth cookies are `Secure`, so without TLS the browser
   silently drops them and login fails with no visible error.
2. **A routing strategy** — one shared origin behind a reverse proxy (option A), or
   separate subdomains with explicit CORS (option B).
3. **PostgreSQL with backups.**
4. **A deploy step** that runs `migrate`, `collectstatic` and `create_admin`.

The development setup, where Next.js rewrites `/api/v1` to port 8000, is **not**
production-ready: the rewrite only exists in the dev server, and Server Components would
not proxy a relative path in a production build.

## Option A: one origin behind a reverse proxy

A single proxy serves all three apps under `https://kurse.example.ch`. Browser requests
never cross an origin, so CORS is effectively a no-op and `SameSite=Lax` cookies work
without special cases.

```
                        ┌──────────────────────────────┐
                        │  Caddy / Nginx (TLS)  :443   │
                        └───────────────┬──────────────┘
          ┌─────────────────────────────┼─────────────────────────────┐
          │ /                           │ /admin                      │ /api/v1, /media, /static
          ▼                             ▼                             ▼
 ┌──────────────────┐          ┌─────────────────┐           ┌────────────────┐
 │ booking-web :3000│          │ admin-web :3001 │           │ backend :8000  │
 └──────────────────┘          └─────────────────┘           └───────┬────────┘
                                                                     │
                                                              ┌──────▼──────┐
                                                              │ PostgreSQL  │
                                                              └─────────────┘
```

### Caddy

Caddy obtains Let's Encrypt certificates on its own.

```caddyfile
kurse.example.ch {
    encode zstd gzip

    # Backend first, so /api/v1/admin/auth is not swallowed by the /admin route below.
    @api path /api/* /media/* /static/*
    handle @api {
        reverse_proxy backend:8000
    }

    handle_path /admin/* {
        reverse_proxy admin-web:3001
    }

    handle {
        reverse_proxy booking-web:3000
    }

    log {
        output file /var/log/caddy/kurse.log
    }
}
```

In this layout `admin-web` must be built with a base path:

```ts
// apps/admin-web/next.config.ts
const config: NextConfig = {
  basePath: "/admin",
  // …
};
```

That setting is not active in the repository — it belongs to option A and is applied at
deploy time.

### Nginx (TLS via certbot)

```nginx
server {
    listen 443 ssl http2;
    server_name kurse.example.ch;

    ssl_certificate     /etc/letsencrypt/live/kurse.example.ch/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kurse.example.ch/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    location /api/    { proxy_pass http://127.0.0.1:8000; include /etc/nginx/proxy_common.conf; }
    location /media/  { proxy_pass http://127.0.0.1:8000; include /etc/nginx/proxy_common.conf; }
    location /static/ { proxy_pass http://127.0.0.1:8000; include /etc/nginx/proxy_common.conf; }

    location /admin/ {
        proxy_pass http://127.0.0.1:3001/;
        include /etc/nginx/proxy_common.conf;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        include /etc/nginx/proxy_common.conf;
    }
}

server {
    listen 80;
    server_name kurse.example.ch;
    return 301 https://$host$request_uri;
}
```

`/etc/nginx/proxy_common.conf`:

```nginx
proxy_http_version 1.1;
proxy_set_header Host              $host;
proxy_set_header X-Real-IP         $remote_addr;
proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header Upgrade           $http_upgrade;
proxy_set_header Connection        "upgrade";
```

Renewal: `certbot renew` on a timer, then `systemctl reload nginx`.

## Option B: separate subdomains

| Subdomain | Service | Visibility |
|---|---|---|
| `kurse.example.ch` | booking-web | public |
| `admin.kurse.example.ch` | admin-web | internal, `noindex` |
| `api.kurse.example.ch` | backend | public, API only |

The auth cookie has to be readable across the subdomains, so it needs a parent domain:

```
CORS_ALLOWED_ORIGINS = https://kurse.example.ch,https://admin.kurse.example.ch
AUTH_COOKIE_DOMAIN   = .kurse.example.ch
AUTH_COOKIE_SECURE   = True
AUTH_COOKIE_SAMESITE = Lax
```

Both frontends then point `NEXT_PUBLIC_API_URL` at `https://api.kurse.example.ch/api/v1`
instead of the relative `/api/v1`, and the Next.js rewrite stays off.

This gives the sharpest origin separation and an explicit allow-list, at the cost of
three certificates and working DNS for three records.

## Hosting options

Rough monthly estimates (2026, no traffic spikes).

| Option | Setup | Cost | Trade-off |
|---|---|---|---|
| **Railway** | one service per app, PostgreSQL add-on, auto-build from GitHub | ~25–40 | Fastest to stand up, logs and metrics included; platform-specific build config. |
| **Fly.io** | `fly launch` per app, managed or self-hosted Postgres | ~15–30 | Close to plain Docker, easy to reproduce; database management is more manual. |
| **Hetzner Cloud** | one CX22 (4 GB) runs all three apps, Postgres and Caddy | ~5–8 | Cheapest and fully under your control; you own updates, monitoring and backups. |
| **Vercel + separate backend** | frontends on Vercel, backend elsewhere | ~10–20 | Best frontend edge performance; two platforms to operate and CORS must be exact (option B). |

## Production environment variables

### Backend (`apps/backend/.env`)

```
DJANGO_SECRET_KEY=<random, 50+ characters>
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=kurse.example.ch,admin.kurse.example.ch,api.kurse.example.ch

DATABASE_URL=postgres://user:pass@db-host:5432/buchung

# Option A:
CORS_ALLOWED_ORIGINS=https://kurse.example.ch
# Option B:
# CORS_ALLOWED_ORIGINS=https://kurse.example.ch,https://admin.kurse.example.ch

JWT_ACCESS_TOKEN_LIFETIME_MIN=15
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7

AUTH_COOKIE_SECURE=True
AUTH_COOKIE_SAMESITE=Lax
# Option B only:
# AUTH_COOKIE_DOMAIN=.kurse.example.ch

# Required by create_admin when DEBUG=False:
DJANGO_ADMIN_PASSWORD=<strong password, rotate after first login>

# Optional:
# SENTRY_DSN=https://...@sentry.io/...

DJANGO_LANGUAGE_CODE=de
DJANGO_TIME_ZONE=Europe/Zurich
```

### booking-web

```
NEXT_PUBLIC_SITE_URL=https://kurse.example.ch
NEXT_PUBLIC_DEFAULT_LOCALE=de
NEXT_PUBLIC_API_URL=/api/v1                   # option A; option B: https://api.kurse.example.ch/api/v1
BACKEND_INTERNAL_URL=http://backend:8000      # server-side fetches only, never exposed
PORT=3000
```

### admin-web

```
NEXT_PUBLIC_API_URL=/api/v1                   # option A; option B: https://api.kurse.example.ch/api/v1
BACKEND_INTERNAL_URL=http://backend:8000
PORT=3001
```

## TLS

- **Caddy** handles Let's Encrypt automatically — open port 80 and point DNS at the host.
- **Nginx**: `certbot --nginx -d kurse.example.ch -d admin.kurse.example.ch -d api.kurse.example.ch`.
- **Behind Cloudflare**: use "Full (strict)" with a real origin certificate, not "Flexible" —
  with Flexible the origin leg is plain HTTP and `Secure` cookies behave unpredictably.

`AUTH_COOKIE_SECURE=True` only works once the connection is actually TLS-terminated.
Otherwise the browser refuses to send the cookie and login fails silently.

## Backups

Minimum standard for PostgreSQL:

```bash
#!/usr/bin/env bash
# /etc/cron.daily/backup-buchung-db
set -euo pipefail

ts=$(date +%Y%m%dT%H%M%SZ)
out=/var/backups/buchung
mkdir -p "$out"

pg_dump --format=custom --no-owner --no-acl "$DATABASE_URL" > "$out/buchung-$ts.dump"

# Retention: daily for 14 days, then weekly for 8 weeks.
find "$out" -name 'buchung-*.dump' -mtime +14 -mtime -56 ! -name '*-Mon*' -delete
find "$out" -name 'buchung-*.dump' -mtime +56 -delete
```

Replicate off-site to S3-compatible storage (Hetzner Object Storage, Backblaze B2) with
`restic` or `rclone`. Test a restore quarterly: `pg_restore` into a throwaway database
and run `make test-fast` against it.

## Migrations

- Zero-downtime is not required here. The service takes bookings per day, not per second,
  so a 30-second maintenance window during a migration is acceptable.
- If that changes: split schema changes so the old and new app versions both work
  (`AddField nullable` → deploy → backfill → make required), document a rollback per
  migration, and run long migrations off-peak.
- Run `python manage.py migrate --plan` against a copy of the production database before
  every deploy.

## Monitoring

| Concern | Suggestion |
|---|---|
| Errors | Sentry; free tier covers this volume. DSN as an environment variable, no code changes with the standard integrations. |
| Analytics | Plausible or self-hosted Umami — cookie-free and GDPR-friendly. |
| Uptime | No `/health` endpoint exists yet; poll `GET /api/v1/courses/` until one does. |
| Database | Enable `pg_stat_statements`; `pgwatch2` as a container is enough on a single host. |
| Logs | Django to stdout (12-factor), proxy logs to journald, aggregate with Loki + Grafana if needed. |
| Alerts | At minimum "backend unreachable" and "backup job failed". |

## Pre-launch checklist

- [ ] DNS records in place
- [ ] HTTPS verified (`curl --resolve`)
- [ ] `DJANGO_DEBUG=False` and a real `DJANGO_SECRET_KEY`
- [ ] `DJANGO_ALLOWED_HOSTS` lists exactly the production domains
- [ ] `CORS_ALLOWED_ORIGINS` matches the chosen option
- [ ] PostgreSQL reachable (`pg_isready`)
- [ ] `manage.py migrate` done
- [ ] `manage.py collectstatic --noinput` done
- [ ] Admin user created with `DJANGO_ADMIN_PASSWORD`, password rotated after first login
- [ ] `make seed` has **not** run against production
- [ ] Backup cron active and one `pg_dump` restored successfully
- [ ] Sentry test event received
- [ ] Smoke test: create a booking → visible in admin → CSV export → cancel
