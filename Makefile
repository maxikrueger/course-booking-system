# Fahrsicherheits-Buchungssystem – Root-Makefile
#
# Alle Targets delegieren an Per-App-Makefiles unter apps/*/Makefile.
# Existiert ein Per-App-Makefile nicht, wird das entsprechende Target sauber
# übersprungen statt fehlzuschlagen.

SHELL := /usr/bin/env bash
.SHELLFLAGS := -eu -o pipefail -c

APPS := backend booking-web admin-web
ROOT := $(shell pwd)

# Farben für Log-Output (nur wenn Terminal interaktiv)
ifeq ($(shell test -t 1 && echo 1),1)
  C_BLUE  := \033[1;34m
  C_GREEN := \033[1;32m
  C_DIM   := \033[2m
  C_OFF   := \033[0m
else
  C_BLUE  :=
  C_GREEN :=
  C_DIM   :=
  C_OFF   :=
endif

.DEFAULT_GOAL := help

.PHONY: help setup env check-tools dev test lint typecheck seed reset-db \
        db-up db-down db-logs clean \
        $(addprefix setup-,$(APPS)) \
        $(addprefix dev-,$(APPS)) \
        $(addprefix test-,$(APPS)) \
        $(addprefix lint-,$(APPS)) \
        $(addprefix typecheck-,$(APPS))

## help: Liste aller Targets anzeigen
help:
	@printf "$(C_BLUE)Fahrsicherheits-Buchungssystem – Make-Targets$(C_OFF)\n\n"
	@grep -E '^## [a-zA-Z][a-zA-Z0-9_-]+:' $(MAKEFILE_LIST) \
		| sed -E 's/## ([a-zA-Z0-9_-]+): (.*)/  \1\t\2/' \
		| expand -t 18

## setup: Alle Dependencies installieren, .env-Dateien erzeugen
setup: check-tools env $(addprefix setup-,$(APPS))
	@printf "$(C_GREEN)✓ Setup abgeschlossen.$(C_OFF)\n"
	@printf "$(C_DIM)  Nächste Schritte: 'make db-up' (PostgreSQL starten) und 'make dev' (Apps starten).$(C_OFF)\n"
	@printf "$(C_DIM)  Optional: 'pre-commit install' aktiviert Git-Hooks (Format/Lint vor jedem Commit).$(C_OFF)\n"

## check-tools: Prüft Vorhandensein der nötigen CLI-Tools
check-tools:
	@printf "$(C_BLUE)→ Prüfe Tool-Verfügbarkeit$(C_OFF)\n"
	@"$(ROOT)/scripts/check-tools.sh"

## env: Kopiert fehlende .env-Dateien aus .env.example
env:
	@printf "$(C_BLUE)→ .env-Dateien sicherstellen$(C_OFF)\n"
	@"$(ROOT)/scripts/sync-env.sh"

## dev: Alle Apps parallel starten (Backend 8000, Booking 3000, Admin 3001)
dev:
	@"$(ROOT)/scripts/dev-parallel.sh" $(APPS)

## test: Tests in allen Apps ausführen
test: $(addprefix test-,$(APPS))
	@printf "$(C_GREEN)✓ Tests grün$(C_OFF)\n"

## lint: Linter über alle Apps
lint: $(addprefix lint-,$(APPS))
	@printf "$(C_GREEN)✓ Lint grün$(C_OFF)\n"

## typecheck: Type-Checks über alle Apps (mypy + tsc --noEmit)
typecheck: $(addprefix typecheck-,$(APPS))
	@printf "$(C_GREEN)✓ Typecheck grün$(C_OFF)\n"

## seed: Demo-Daten in DB laden
seed:
	@"$(ROOT)/scripts/run-app-target.sh" backend seed

## reset-db: DB komplett zurücksetzen und neu seeden
reset-db: db-down
	@docker volume rm buchung_db_data 2>/dev/null || true
	@$(MAKE) db-up
	@"$(ROOT)/scripts/run-app-target.sh" backend migrate
	@"$(ROOT)/scripts/run-app-target.sh" backend seed

## db-up: PostgreSQL via Docker Compose starten
db-up:
	@docker compose up -d db
	@printf "$(C_DIM)  Warte auf DB-Healthcheck …$(C_OFF)\n"
	@for i in $$(seq 1 30); do \
		status=$$(docker inspect --format='{{.State.Health.Status}}' buchung_db 2>/dev/null || echo "starting"); \
		if [ "$$status" = "healthy" ]; then printf "$(C_GREEN)✓ DB ready$(C_OFF)\n"; exit 0; fi; \
		sleep 1; \
	done; \
	printf "DB nicht innerhalb 30s healthy – siehe 'make db-logs'\n"; exit 1

## db-down: PostgreSQL stoppen (Daten bleiben erhalten)
db-down:
	@docker compose down

## db-logs: PostgreSQL-Logs zeigen
db-logs:
	@docker compose logs -f db

## clean: Build-Artefakte und Caches entfernen
clean:
	@find . -type d \( -name __pycache__ -o -name .pytest_cache -o -name .mypy_cache -o -name .ruff_cache -o -name .next -o -name .turbo -o -name node_modules -o -name .venv \) -prune -exec rm -rf {} + 2>/dev/null || true
	@printf "$(C_GREEN)✓ Caches entfernt$(C_OFF)\n"

# --- Per-App-Delegation ---------------------------------------------------
#
# Jedes apps/<name>/ kann ein eigenes Makefile mit den Targets
# setup, dev, test, lint, typecheck mitbringen. Existiert keins, wird das
# Target sauber übersprungen.

setup-%:
	@"$(ROOT)/scripts/run-app-target.sh" $* setup

dev-%:
	@"$(ROOT)/scripts/run-app-target.sh" $* dev

test-%:
	@"$(ROOT)/scripts/run-app-target.sh" $* test

lint-%:
	@"$(ROOT)/scripts/run-app-target.sh" $* lint

typecheck-%:
	@"$(ROOT)/scripts/run-app-target.sh" $* typecheck
