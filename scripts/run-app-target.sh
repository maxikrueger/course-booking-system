#!/usr/bin/env bash
# Delegiert ein Make-Target an apps/<name>/Makefile.
# Existiert kein Per-App-Makefile, wird das Target übersprungen (Exit 0).
# Das erlaubt dem Root-Makefile, auch bei unvollständigem Workspace zu laufen.
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <app-name> <target>" >&2
  exit 2
fi

app="$1"
target="$2"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
app_dir="$ROOT/apps/$app"

if [ ! -d "$app_dir" ]; then
  printf "  ⏭  apps/%s: Verzeichnis fehlt – Target '%s' übersprungen\n" "$app" "$target"
  exit 0
fi

if [ ! -f "$app_dir/Makefile" ]; then
  printf "  ⏭  apps/%s: kein Makefile – Target '%s' übersprungen\n" "$app" "$target"
  exit 0
fi

printf "  → apps/%s: %s\n" "$app" "$target"
exec make -C "$app_dir" "$target"
