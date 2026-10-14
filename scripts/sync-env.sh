#!/usr/bin/env bash
# Kopiert fehlende .env-Dateien aus den jeweiligen .env.example.
# Bestehende .env bleiben unverändert.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

copy_if_missing() {
  local src="$1" dst="$2"
  if [ ! -f "$src" ]; then
    return 0
  fi
  if [ -f "$dst" ]; then
    printf "  ✓ %s existiert bereits\n" "$dst"
  else
    cp "$src" "$dst"
    printf "  + %s aus .env.example angelegt\n" "$dst"
  fi
}

copy_if_missing "$ROOT/.env.example" "$ROOT/.env"

for app in backend booking-web admin-web; do
  src="$ROOT/apps/$app/.env.example"
  # Frontend nutzt .env.local, Backend .env
  case "$app" in
    backend)        dst="$ROOT/apps/$app/.env" ;;
    *)              dst="$ROOT/apps/$app/.env.local" ;;
  esac
  copy_if_missing "$src" "$dst"
done
