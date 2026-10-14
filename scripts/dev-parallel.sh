#!/usr/bin/env bash
# Startet alle Apps parallel und beendet sie sauber bei Ctrl+C.
# Apps ohne Makefile werden übersprungen.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
pids=()

cleanup() {
  printf "\n→ Stoppe Dev-Prozesse …\n"
  for pid in "${pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

started=0
for app in "$@"; do
  if [ -f "$ROOT/apps/$app/Makefile" ]; then
    printf "→ Starte apps/%s im Hintergrund …\n" "$app"
    ( cd "$ROOT/apps/$app" && make dev ) &
    pids+=($!)
    started=$((started + 1))
  else
    printf "⏭  apps/%s übersprungen (kein Makefile)\n" "$app"
  fi
done

if [ "$started" -eq 0 ]; then
  printf "\nNoch keine App ist startbereit. Implementiere zuerst M1 (Backend) bzw. M2/M4 (Frontends).\n"
  trap - INT TERM EXIT
  exit 0
fi

wait
