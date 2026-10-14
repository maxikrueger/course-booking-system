import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Benutzername").fill("admin");
  await page.getByLabel("Passwort").fill("admin123");
  await page.getByRole("button", { name: /anmelden/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("Login-Seite hat keine kritischen WCAG-A/AA-Verstösse", async ({
  page,
}) => {
  await page.goto("/login");
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(
    results.violations,
    JSON.stringify(results.violations, null, 2),
  ).toEqual([]);
});

test("Dashboard hat keine kritischen Verstösse", async ({ page }) => {
  await loginAsAdmin(page);
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(
    results.violations,
    JSON.stringify(results.violations, null, 2),
  ).toEqual([]);
});

test("Termin-Edit-Seite hat keine kritischen Verstösse", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/termine");
  // Listenansicht umschalten und den ersten Termin öffnen. Nicht den ersten
  // Link der Seite nehmen – das wäre die Sidebar.
  await page.getByRole("tab", { name: "Liste" }).click();
  await page.getByTestId("session-link").first().click();
  await expect(page).toHaveURL(/\/termine\/\d+/);
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(
    results.violations,
    JSON.stringify(results.violations, null, 2),
  ).toEqual([]);
});
