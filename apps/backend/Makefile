# Makefile für apps/backend (Django 5 + DRF, verwaltet via uv).
#
# Wird vom Root-Makefile via scripts/run-app-target.sh aufgerufen.

SHELL := /usr/bin/env bash
.SHELLFLAGS := -eu -o pipefail -c

PORT ?= 8000

.PHONY: setup dev test test-fast test-race lint typecheck migrate seed makemigrations shell

## setup: uv sync (Dependencies + Python-Toolchain)
setup:
	@uv sync --quiet
	@uv run python manage.py migrate --noinput

## dev: Django-Dev-Server starten (Port 8000)
dev:
	@uv run python manage.py runserver 0.0.0.0:$(PORT)

## test: vollständige Test-Suite (schnelle SQLite + Race-Condition gegen PG)
test: test-fast test-race

## test-fast: pytest mit SQLite-Test-Settings (schnell)
test-fast:
	@uv run pytest --ignore=bookings/tests/test_race_condition.py

## test-race: Race-Condition-Test gegen PostgreSQL (verlangt 'make db-up')
test-race:
	@DJANGO_SETTINGS_MODULE=backend.settings.test_pg uv run pytest bookings/tests/test_race_condition.py

## lint: ruff format + check
lint:
	@uv run ruff format --check .
	@uv run ruff check .

## typecheck: mypy strict
typecheck:
	@uv run mypy .

## migrate: DB-Migrationen anwenden
migrate:
	@uv run python manage.py migrate

## makemigrations: Neue Migrationen erzeugen
makemigrations:
	@uv run python manage.py makemigrations

## seed: Demo-Daten laden (idempotent, --reset zum Hard-Reset)
seed:
	@uv run python manage.py seed_demo_data

## shell: Django-Shell öffnen
shell:
	@uv run python manage.py shell
