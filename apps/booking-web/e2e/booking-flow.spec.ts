import { test, expect, type Page } from "@playwright/test";

const API_BASE = process.env.E2E_API_BASE ?? "http://localhost:8000/api/v1";

/**
 * E2E-Buchungsflow gegen das echte Backend (apps/backend, Port 8000).
 *
 * Setup-Voraussetzungen (in dieser Reihenfolge):
 *   1. PostgreSQL läuft (`make db-up`)
 *   2. Backend läuft auf Port 8000 mit migrierter DB und Demo-Daten
 *      (`cd apps/backend && DJANGO_SETTINGS_MODULE=backend.settings.dev uv run python manage.py runserver 8000`)
 *      und `make seed`
 *   3. booking-web Dev-Server (durch playwright.config.ts gestartet, sofern
 *      PLAYWRIGHT_NO_WEBSERVER nicht gesetzt ist)
 *
 * Der Test wählt sich automatisch eine buchbare Session aus dem ersten Kurs.
 */

async function findBookableSessionId(page: Page): Promise<{
  courseSlug: string;
  sessionId: number;
}> {
  const coursesRes = await page.request.get(`${API_BASE}/courses/`);
  expect(coursesRes.ok()).toBeTruthy();
  const courses = await coursesRes.json();
  for (const course of courses.results as Array<{ slug: string }>) {
    const sessionsRes = await page.request.get(
      `${API_BASE}/courses/${course.slug}/sessions/`,
    );
    if (!sessionsRes.ok()) continue;
    const sessions = (await sessionsRes.json()) as Array<{
      id: number;
      is_bookable: boolean;
      available_spots: number;
    }>;
    const bookable = sessions.find(
      (s) => s.is_bookable && s.available_spots > 0,
    );
    if (bookable) {
      return { courseSlug: course.slug, sessionId: bookable.id };
    }
  }
  throw new Error(
    "Kein buchbarer Termin gefunden – bitte 'make seed' ausführen.",
  );
}

test("vollständiger Buchungsflow von Termin bis Erfolgsseite", async ({
  page,
}) => {
  const { sessionId } = await findBookableSessionId(page);

  await page.goto(`/buchung/termin/${sessionId}`);
  await expect(page.getByTestId("termin-available-spots")).toBeVisible();
  await page.getByTestId("termin-next").click();

  await expect(page).toHaveURL(/\/buchung\/daten$/);
  await page.getByLabel("Anrede *").selectOption("mr");
  await page.getByLabel("Vorname *").fill("Max");
  await page.getByLabel("Nachname *").fill("Mustermann");
  await page.getByLabel("E-Mail *").fill(`e2e-${Date.now()}@example.com`);
  await page.getByLabel("Telefon *").fill("+41 79 123 45 67");
  await page.getByLabel("Strasse, Hausnummer *").fill("Musterweg 1");
  await page.getByLabel("PLZ *").fill("8000");
  await page.getByLabel("Ort *").fill("Zürich");
  await page.getByLabel("Geburtsdatum *").fill("1995-03-15");

  await page.getByTestId("daten-submit").click();

  await expect(page).toHaveURL(/\/buchung\/bestaetigung$/);
  await expect(page.getByTestId("binding-banner")).toBeVisible();
  await expect(page.getByTestId("binding-banner")).toContainText(
    "Verbindliche Buchung",
  );

  // Submit-Button ist disabled, bis AGB akzeptiert
  await expect(page.getByTestId("bestaetigung-submit")).toBeDisabled();
  await page.getByTestId("accept-terms").check();
  await expect(page.getByTestId("bestaetigung-submit")).toBeEnabled();

  await page.getByTestId("bestaetigung-submit").click();

  await expect(page).toHaveURL(/\/buchung\/erfolg\//);
  const number = await page.getByTestId("booking-number").textContent();
  expect(number).toMatch(/^BP-\d{4}-\d{5}$/);
});

test("Reload mitten im Wizard verliert keine Daten", async ({ page }) => {
  const { sessionId } = await findBookableSessionId(page);

  await page.goto(`/buchung/termin/${sessionId}`);
  await page.getByTestId("termin-next").click();

  await page.getByLabel("Anrede *").selectOption("mrs");
  await page.getByLabel("Vorname *").fill("Reload");
  await page.getByLabel("Nachname *").fill("Test");

  await page.reload();

  await expect(page.getByLabel("Anrede *")).toHaveValue("mrs");
  await expect(page.getByLabel("Vorname *")).toHaveValue("Reload");
  await expect(page.getByLabel("Nachname *")).toHaveValue("Test");
});
