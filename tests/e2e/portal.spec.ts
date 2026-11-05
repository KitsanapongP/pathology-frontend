import { expect, test } from "@playwright/test";

test("demo entry opens the portal and navigates to request intake", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "เข้าสู่ระบบ Student / Professor" }).click();
  await expect(page).toHaveURL(/\/portal$/);
  await page.getByRole("button", { name: /รับใบส่งตรวจ/ }).click();
  await expect(page).toHaveURL(/\/portal\/requests$/);
  await expect(page.getByRole("main")).toBeVisible();
});

test("language preference survives a reload in an isolated browser context", async ({ page }) => {
  await page.goto("/portal");
  await page.getByRole("switch").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("switch")).toBeChecked();
});
