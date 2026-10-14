import { expect, test } from "@playwright/test";

/**
 * E2E-Test für den Admin-Login-Flow.
 *
 * Voraussetzungen:
 *   1. PostgreSQL läuft (`make db-up`)
 *   2. Backend läuft auf Port 8000 mit migrierter DB und Standard-Admin
 *      (`cd apps/backend && uv run python manage.py create_admin`)
 *   3. admin-web Dev-Server (durch playwright.config.ts gestartet)
 */

test("unauthorisierter Zugriff auf Dashboard leitet auf /login", async ({
  page,
  context,
}) => {
  await context.clearCookies();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});

test("falsche Credentials zeigen Fehlermeldung", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Benutzername").fill("admin");
  await page.getByLabel("Passwort").fill("falsch-falsch-falsch");
  await page.getByRole("button", { name: /anmelden/i }).click();
  await expect(
    page.getByText(/Benutzername oder Passwort falsch/i),
  ).toBeVisible();
});

test("erfolgreicher Login leitet aufs Dashboard und Logout zurück", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Benutzername").fill("admin");
  await page.getByLabel("Passwort").fill("admin123");
  await page.getByRole("button", { name: /anmelden/i }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();

  await page.getByRole("button", { name: /logout/i }).click();
  await expect(page).toHaveURL(/\/login$/);

  // Nach Logout darf das Dashboard nicht mehr direkt erreichbar sein.
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});
