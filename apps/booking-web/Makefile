# Makefile für apps/booking-web (Next.js 15, öffentliche Buchungsseite).

SHELL := /usr/bin/env bash
.SHELLFLAGS := -eu -o pipefail -c

.PHONY: setup dev test test-e2e lint typecheck build start

## setup: pnpm install (Lockfile-Treu)
setup:
	@pnpm install --frozen-lockfile=false

## dev: Next-Dev-Server (Port 3000)
dev:
	@pnpm dev

## test: vitest run
test:
	@pnpm test

## test-e2e: Playwright-E2E (Backend muss laufen, Browser via 'pnpm test:e2e:install')
test-e2e:
	@pnpm test:e2e

## lint: ESLint + Prettier-Check
lint:
	@pnpm lint
	@pnpm format:check

## typecheck: tsc --noEmit
typecheck:
	@pnpm typecheck

## build: Next.js Production-Build
build:
	@pnpm build

## start: Production-Server starten
start:
	@pnpm start
