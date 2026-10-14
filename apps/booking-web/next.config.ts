import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const extraDevOrigins =
  process.env.NEXT_DEV_ALLOWED_ORIGINS?.split(",")
    .map((o) => o.trim())
    .filter(Boolean) ?? [];

const BACKEND_INTERNAL_URL =
  process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1", ...extraDevOrigins],
  // Django erwartet Trailing-Slash auf API-Pfaden. Next strippt sie sonst
  // beim Rewrite, was zu einem 308↔301-Redirect-Loop führt. Wir matchen den
  // Pfad explizit mit optionalem Trailing-Slash und setzen ihn im
  // Destination-Pfad zurück; gleichzeitig unterdrücken wir den
  // Auto-Redirect, damit das Frontend selbst beide Varianten ausliefert.
  //
  // Ausnahme: Pfade mit Datei-Endung (z. B. ".csv", ".pdf", ".xlsx") sind
  // Datei-Downloads, die Django OHNE Trailing-Slash registriert. Diese werden
  // 1:1 weitergeleitet, sonst kommt 404.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source:
          "/api/v1/:filepath((?:.+)\\.(?:csv|pdf|xlsx|xls|zip|json|xml|txt|ics))",
        destination: `${BACKEND_INTERNAL_URL}/api/v1/:filepath`,
      },
      {
        source: "/api/v1/:path*/",
        destination: `${BACKEND_INTERNAL_URL}/api/v1/:path*/`,
      },
      {
        source: "/api/v1/:path*",
        destination: `${BACKEND_INTERNAL_URL}/api/v1/:path*/`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
