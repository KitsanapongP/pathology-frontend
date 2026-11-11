import { expect, test } from "@playwright/test";
import { seedSession } from "./auth-fixture";

test("authenticated session opens the portal and navigates to request intake", async ({ page }) => {
  await seedSession(page);
  await page.goto("/portal");
  await expect(page).toHaveURL(/\/portal$/);
  await page.getByRole("button", { name: /รับใบส่งตรวจ/ }).click();
  await expect(page).toHaveURL(/\/portal\/requests$/);
  await expect(page.getByRole("main")).toBeVisible();
});

test("language preference survives a reload in an isolated browser context", async ({ page }) => {
  await seedSession(page);
  await page.goto("/portal");
  await page.getByRole("switch").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("switch")).toBeChecked();
});
