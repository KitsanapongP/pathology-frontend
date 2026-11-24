import { expect, test } from "@playwright/test";
import { seedSession, success } from "./auth-fixture";

for (const viewport of [{ width: 1896, height: 1244 }, { width: 1280, height: 720 }, { width: 390, height: 844 }]) {
  test(`administration keeps shared navigation across sections at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await seedSession(page);
    await page.addInitScript(() => localStorage.setItem("pathology:portal-preferences:v1", JSON.stringify({ language: "en", fontSize: 120 })));
    await page.route("http://api.e2e.test/v1/users**", route => route.fulfill({ json: { ...success([{ user_id: "synthetic-nav-user", username: "synthetic-nav-user", first_name: "Synthetic", last_name: "Navigation", email: "synthetic@example.invalid", tenant_id: "synthetic-tenant", must_change_password: false, status: "active", created_at: 1700000000 }]), pagination: { total_records: 1, total_pages: 1, current_page: 1, page_size: 20 } } }));
    await page.goto("/portal/admin");
    for (const [route, label] of [["users", "Manage users"], ["requests", "Manage requests"], ["storage", "Manage storage"], ["logs", "Logs and services"]]) {
      if (viewport.width < 1024) await page.getByRole("button", { name: "Open menu", exact: true }).click();
      await page.getByRole("navigation", { name: "Main navigation", exact: true }).getByRole("link", { name: label, exact: true }).click();
      await expect(page).toHaveURL(`/portal/admin/${route}`);
      await expect(page.getByRole("heading", { name: label, exact: true })).toBeVisible();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      if (route === "users") await expect(page.getByRole("cell", { name: "synthetic-nav-user", exact: true })).toBeVisible();
      if (viewport.width >= 1024) {
        const navigation = page.getByRole("navigation", { name: "Main navigation", exact: true });
        await expect(navigation.getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
        const navBox = await navigation.boundingBox();
        const mainBox = await page.getByRole("main").boundingBox();
        expect(navBox!.x + navBox!.width).toBeLessThanOrEqual(mainBox!.x);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.locator("main .portal-panel").evaluateAll(panels => panels.every(panel => panel.getBoundingClientRect().right <= innerWidth))).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`admin-${route}.png`), fullPage: true });
    }
    await page.reload();
    if (viewport.width < 1024) await page.getByRole("button", { name: "Open menu", exact: true }).click();
    await expect(page.getByRole("navigation", { name: "Main navigation", exact: true }).getByRole("link", { name: "Logs and services", exact: true })).toHaveAttribute("aria-current", "page");
    await page.getByRole("navigation", { name: "Main navigation", exact: true }).getByRole("link", { name: "Dashboard", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Administrator dashboard", exact: true })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole("heading", { name: "Logs and services", exact: true })).toBeVisible();
  });
}

test("dashboard wording is Thai and the mobile menu closes with Escape", async ({ page }) => {
  await seedSession(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/portal/admin");
  await expect(page.getByRole("heading", { name: "แดชบอร์ดผู้ดูแลระบบ", exact: true })).toBeVisible();
  await expect(page.getByText(/แผงควบคุม/)).toHaveCount(0);
  const open = page.getByRole("button", { name: "เปิดเมนู", exact: true });
  await open.click();
  await expect(page.getByRole("dialog", { name: "เมนูหลัก", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(open).toBeFocused();
});
