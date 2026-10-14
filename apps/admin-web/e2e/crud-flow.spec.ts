import { expect, test, type Page } from "@playwright/test";

/**
 * Vollständiger CRUD-E2E:
 *   1. Admin loggt sich ein
 *   2. Legt einen neuen Kurs (Slug e2e-...) mit DE/EN/FR-Übersetzungen an
 *   3. Legt einen neuen Termin (Session) für diesen Kurs an
 *   4. Im booking-web wird ein Teilnehmer für diese Session gebucht (via API)
 *   5. Admin sieht den Teilnehmer auf der Buchungs-Liste
 *   6. Admin storniert die Buchung (optimistic update)
 *
 * Voraussetzungen:
 *   - Backend auf Port 8000 (mit Standard-Admin admin/admin123 und Seed-Daten)
 *   - admin-web Dev-Server (durch playwright.config.ts gestartet)
 */

const API_BASE = process.env.E2E_API_BASE ?? "http://localhost:8000/api/v1";

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Benutzername").fill("admin");
  await page.getByLabel("Passwort").fill("admin123");
  await page.getByRole("button", { name: /anmelden/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("kompletter CRUD-Flow: Kurs → Session → Buchung → Stornierung", async ({
  page,
  request,
}) => {
  await loginAsAdmin(page);

  // --- 1. Kurs anlegen ---
  await page.goto("/kurse/neu");
  const stamp = Date.now();
  const slug = `e2e-kurs-${stamp}`;
  const titleDe = `E2E Testkurs ${stamp}`;
  await page.getByLabel("Slug *").fill(slug);
  await page.getByLabel("Kategorie *").selectOption({ index: 1 });
  await page.getByLabel("Standardpreis CHF").fill("199.00");
  await page.getByLabel("Dauer (Stunden)").fill("3.50");

  // DE-Tab ist initial aktiv.
  await page.getByLabel("Titel *").fill(titleDe);
  await page.getByLabel("Kurzbeschreibung *").fill("Kurz DE");
  await page.getByLabel("Lange Beschreibung").fill("Lange Beschreibung DE");

  // Auf EN-Tab wechseln und füllen.
  await page.getByRole("tab", { name: /English/ }).click();
  await page.getByLabel("Titel").fill("E2E Test Course");
  await page.getByLabel("Kurzbeschreibung").fill("Short EN");

  await page.getByRole("button", { name: /Speichern$/ }).click();
  await expect(page).toHaveURL(/\/kurse$/, { timeout: 10_000 });
  await expect(page.getByText(slug)).toBeVisible();

  // Hole die Course-ID + eine Location-ID via Admin-API.
  const coursesResp = await page.request.get(
    `/api/v1/admin/courses/?search=${encodeURIComponent(slug)}`,
  );
  expect(coursesResp.status()).toBe(200);
  const coursesData = await coursesResp.json();
  const newCourse = coursesData.results.find(
    (c: { slug: string }) => c.slug === slug,
  );
  expect(newCourse, "neu angelegter Kurs nicht in Liste gefunden").toBeTruthy();
  const courseId = newCourse.id as number;

  const locationsResp = await page.request.get(`/api/v1/admin/locations/`);
  expect(locationsResp.status()).toBe(200);
  const locations = await locationsResp.json();
  expect(locations.length).toBeGreaterThan(0);
  const locationId = locations[0].id as number;

  // --- 2. Termin via Admin-API anlegen (Cookie aus Browser-Context) ---
  // UI-Form für Sessions ist im Termin-Edit-Test abgedeckt; hier nutzen wir
  // die API für deterministische Datums-Werte.
  const start = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  start.setHours(8, 0, 0, 0);
  const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
  const sessionCreateResp = await page.request.post(`/api/v1/admin/sessions/`, {
    data: {
      course: courseId,
      location: locationId,
      start_datetime: start.toISOString(),
      end_datetime: end.toISOString(),
      max_participants: 5,
      price_chf: "199.00",
      status: "open",
      internal_notes: "",
    },
  });
  expect(
    sessionCreateResp.status(),
    `Session create fehlgeschlagen: ${await sessionCreateResp.text()}`,
  ).toBe(201);
  const sessionId = (await sessionCreateResp.json()).id as number;

  // --- 2b. UI: Termin-Edit-Seite öffnen, Status sichtbar ---
  await page.goto(`/termine/${sessionId}`);
  await expect(
    page.getByRole("heading", { name: /Termin bearbeiten/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: /Teilnehmer/ }),
  ).toBeVisible();

  // Buchung anonym über Public-Endpoint.
  const bookingResp = await request.post(`${API_BASE}/bookings/`, {
    data: {
      session_id: sessionId,
      salutation: "mr",
      first_name: "E2E",
      last_name: "Tester",
      email: `e2e-${Date.now()}@example.com`,
      phone: "+41 79 000 00 00",
      street: "Teststrasse 1",
      postal_code: "8000",
      city: "Zürich",
      country: "CH",
      date_of_birth: "1995-01-01",
      voucher_code: "",
      notes: "",
      language: "de",
      accept_terms: true,
    },
  });
  expect(bookingResp.status()).toBe(201);
  const booking = await bookingResp.json();

  // --- 3b. CSV-Download-Link auf der Termin-Detailseite verifizieren ---
  await page.goto(`/termine/${sessionId}`);
  const csvLink = page.getByTestId("participants-csv-link");
  await expect(csvLink).toBeVisible();
  const href = await csvLink.getAttribute("href");
  expect(href).toBeTruthy();
  // URL darf KEIN Trailing-Slash haben (Django registriert .csv ohne Slash).
  expect(href).not.toMatch(/\.csv\/$/);
  expect(href).toMatch(/\.csv$/);
  // Tatsächlicher HTTP-Aufruf gegen die Link-URL muss 200 mit text/csv liefern.
  const csvResp = await page.request.get(href!);
  expect(
    csvResp.status(),
    `CSV-Download fehlgeschlagen: ${csvResp.status()} ${await csvResp.text().then((t) => t.slice(0, 200))}`,
  ).toBe(200);
  expect(csvResp.headers()["content-type"]).toContain("text/csv");
  const csvBody = await csvResp.body();
  expect(csvBody.slice(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
  const csvText = csvBody.slice(3).toString("utf-8");
  expect(csvText).toContain("Buchungsdatum");
  expect(csvText).toContain("Tester");

  // --- 4. Admin sieht die Buchung in der Liste ---
  await page.goto("/buchungen");
  await page.getByPlaceholder(/Suche/).fill("Tester");
  const row = page.locator("tr", { hasText: booking.booking_number });
  await expect(row).toBeVisible();

  // --- 5. Detail aufrufen und stornieren ---
  await row.getByRole("link", { name: /Details/ }).click();
  await expect(page).toHaveURL(/\/buchungen\/\d+/);
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Stornieren" }).click();
  await expect(page.getByRole("button", { name: "Stornieren" })).toHaveCount(
    0,
    { timeout: 5_000 },
  );
});
