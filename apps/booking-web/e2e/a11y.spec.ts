import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const API_BASE = process.env.E2E_API_BASE ?? "http://localhost:8000/api/v1";

/**
 * Axe-Core-Audit für die wichtigsten booking-web-Seiten.
 *
 * Setup wie booking-flow.spec.ts: Backend auf 8000 mit Seed-Daten.
 *
 * Geprüft werden WCAG-A- und AA-Regeln. Kritische Verstösse failen
 * den Test; Findings werden in docs/ACCESSIBILITY.md getrackt.
 */

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function findBookableSessionId(page: Page): Promise<{
  courseSlug: string;
  sessionId: number;
}> {
  const coursesRes = await page.request.get(`${API_BASE}/courses/`);
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

test("Startseite hat keine kritischen WCAG-A/AA-Verstösse", async ({
  page,
}) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test("Kursdetail hat keine kritischen WCAG-A/AA-Verstösse", async ({
  page,
}) => {
  const { courseSlug } = await findBookableSessionId(page);
  await page.goto(`/kurse/${courseSlug}`);
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test("Wizard Schritt 1 (Termin) hat keine kritischen Verstösse", async ({
  page,
}) => {
  const { sessionId } = await findBookableSessionId(page);
  await page.goto(`/buchung/termin/${sessionId}`);
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test("Wizard Schritt 2 (Daten) hat keine kritischen Verstösse", async ({
  page,
}) => {
  const { sessionId } = await findBookableSessionId(page);
  await page.goto(`/buchung/termin/${sessionId}`);
  await page.getByTestId("termin-next").click();
  await expect(page).toHaveURL(/\/buchung\/daten$/);
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test("Wizard Schritt 3 (Bestätigung) hat keine kritischen Verstösse", async ({
  page,
}) => {
  const { sessionId } = await findBookableSessionId(page);
  await page.goto(`/buchung/termin/${sessionId}`);
  await page.getByTestId("termin-next").click();
  await page.getByLabel("Anrede *").selectOption("mr");
  await page.getByLabel("Vorname *").fill("Max");
  await page.getByLabel("Nachname *").fill("Mustermann");
  await page.getByLabel("E-Mail *").fill("a11y@example.com");
  await page.getByLabel("Telefon *").fill("+41 79 123 45 67");
  await page.getByLabel("Strasse, Hausnummer *").fill("Musterweg 1");
  await page.getByLabel("PLZ *").fill("8000");
  await page.getByLabel("Ort *").fill("Zürich");
  await page.getByLabel("Geburtsdatum *").fill("1995-03-15");
  await page.getByTestId("daten-submit").click();
  await expect(page).toHaveURL(/\/buchung\/bestaetigung$/);
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});
