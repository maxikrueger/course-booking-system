#!/usr/bin/env bash
# Prüft Verfügbarkeit der für das Projekt benötigten CLI-Tools.
# Fehlt etwas, wird die fehlende Komponente mit Installations-Hinweis genannt
# und das Skript bricht ab. Ist alles vorhanden, läuft es geräuschlos durch.
set -euo pipefail

missing=0

check() {
  local cmd="$1" hint="$2"
  if command -v "$cmd" >/dev/null 2>&1; then
    printf "  ✓ %-7s %s\n" "$cmd" "$($cmd --version 2>&1 | head -n1)"
  else
    printf "  ✗ %-7s fehlt – Install: %s\n" "$cmd" "$hint"
    missing=$((missing + 1))
  fi
}

check git    "Xcode CLI Tools / brew install git"
check make   "kommt mit Xcode CLI Tools"
check node   "brew install node  (>= 22.13, pnpm 11 verlangt Node 22+)"
check npm    "kommt mit node"

# Weiche Dependencies: für 'make setup' selbst nicht nötig, aber für
# 'make db-up' (docker), M1+ (uv) bzw. M2+ (pnpm). Nur Warnung, kein Abbruch.
soft_warn() {
  local cmd="$1" hint="$2"
  if command -v "$cmd" >/dev/null 2>&1; then
    printf "  ✓ %-7s %s\n" "$cmd" "$($cmd --version 2>&1 | head -n1)"
  else
    printf "  ⚠ %-7s fehlt (%s)\n" "$cmd" "$hint"
  fi
}

soft_warn docker     "für 'make db-up' nötig – Docker Desktop installieren"
soft_warn uv         "ab M1 nötig – 'curl -LsSf https://astral.sh/uv/install.sh | sh' oder 'brew install uv'"
soft_warn pnpm       "ab M2 nötig – 'npm install -g pnpm' oder 'brew install pnpm'"
soft_warn pre-commit "optional – 'pip install pre-commit' und dann 'pre-commit install' für Git-Hooks"

if [ "$missing" -gt 0 ]; then
  printf "\n  %d harte Dependency(s) fehlen. Bitte installieren und 'make setup' erneut starten.\n" "$missing"
  exit 1
fi
