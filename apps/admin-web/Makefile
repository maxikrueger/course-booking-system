# Makefile für apps/admin-web (Next.js 15, geschütztes Admin-UI).

SHELL := /usr/bin/env bash
.SHELLFLAGS := -eu -o pipefail -c

.PHONY: setup dev test test-e2e lint typecheck build start

## setup: pnpm install (Lockfile-Treu)
setup:
	@pnpm install --frozen-lockfile=false

## dev: Next-Dev-Server (Port 3001)
dev:
	@pnpm dev

## test: vitest run
test:
	@pnpm test

## test-e2e: Playwright-E2E (Backend muss laufen)
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
