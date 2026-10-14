import { expect, test } from "@playwright/test";

/**
 * Desktop-Layout-Tests für admin-web.
 *
 * Voraussetzungen wie in e2e/login.spec.ts: Backend, Seed-Daten,
 * Standard-Admin (`make seed` und `python manage.py create_admin`).
 *
 * Läuft im Default-"chromium"-Projekt (Desktop Chrome). Prüft, dass
 * die Sidebar bei Desktop-Viewports fest links sitzt, der Hamburger
 * NICHT sichtbar ist und der Hauptinhalt rechts neben der Sidebar
 * gerendert wird.
 */

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Benutzername").fill("admin");
  await page.getByLabel("Passwort").fill("admin123");
  await page.getByRole("button", { name: /anmelden/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

for (const viewport of [
  { width: 1024, height: 800 },
  { width: 1280, height: 800 },
  { width: 1920, height: 1080 },
] as const) {
  test(`Sidebar ist fest links und Hamburger versteckt bei ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await login(page);

    const sidebar = page.getByTestId("admin-sidebar");
    await expect(sidebar).toBeVisible();

    // Sidebar muss position: fixed sein (nicht im Flow)
    const sidebarBox = await sidebar.boundingBox();
    expect(sidebarBox).not.toBeNull();
    if (sidebarBox) {
      expect(sidebarBox.x).toBe(0);
      expect(sidebarBox.y).toBe(0);
      // Sidebar erstreckt sich über die volle Höhe
      expect(sidebarBox.height).toBeGreaterThanOrEqual(viewport.height - 1);
    }

    // Hamburger und Mobile-Header müssen versteckt sein
    await expect(page.getByTestId("admin-mobile-header")).toBeHidden();
    await expect(page.getByTestId("admin-hamburger")).toBeHidden();

    // Hauptinhalt beginnt rechts neben der Sidebar
    const heading = page.getByRole("heading", { name: /dashboard/i });
    const headingBox = await heading.boundingBox();
    expect(headingBox).not.toBeNull();
    if (headingBox && sidebarBox) {
      expect(headingBox.x).toBeGreaterThanOrEqual(sidebarBox.width);
    }
  });
}
