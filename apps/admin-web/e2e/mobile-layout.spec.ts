import { expect, test } from "@playwright/test";

/**
 * Mobile-Layout-Tests für admin-web (iPhone-Viewport).
 * Setzt voraus, dass Backend, Seed-Daten und Standard-Admin existieren
 * (siehe e2e/login.spec.ts). Wird im "mobile"-Projekt ausgeführt.
 */

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Benutzername").fill("admin");
  await page.getByLabel("Passwort").fill("admin123");
  await page.getByRole("button", { name: /anmelden/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("Sidebar ist auf Mobile zunächst eingeklappt und per Hamburger erreichbar", async ({
  page,
}) => {
  await login(page);
  // Mobile: Hamburger sichtbar, Nav versteckt
  const hamburger = page.getByRole("button", { name: /menü öffnen/i });
  await expect(hamburger).toBeVisible();
  await hamburger.click();
  await expect(page.getByRole("navigation", { name: /admin/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /termine/i })).toBeVisible();
});

test("Termin-Liste ist auf Mobile als Default sichtbar", async ({ page }) => {
  await login(page);
  await page.goto("/termine");
  // List-Toggle ist auf Mobile aktiv – die Listen-Items haben Termin-Status-Badges
  await expect(
    page.getByRole("tab", { name: /liste/i, selected: true }),
  ).toBeVisible({ timeout: 5000 });
});

test("Dashboard hat keinen horizontalen Overflow auf iPhone", async ({
  page,
}) => {
  await login(page);
  await page.goto("/dashboard");
  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth;
  });
  expect(overflow).toBeFalsy();
});
