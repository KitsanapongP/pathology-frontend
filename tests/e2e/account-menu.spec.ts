import { expect, test } from "@playwright/test";
import { openAccountMenu, seedSession } from "./auth-fixture";

for (const viewport of [{ width: 1896, height: 1244 }, { width: 781, height: 893 }, { width: 390, height: 844 }]) {
  test(`shared account dropdown fits ${viewport.width}px and opens common settings`, async ({ page }, testInfo) => {
    await seedSession(page);
    await page.setViewportSize(viewport);
    await page.goto("/portal/admin");
    await expect(page.getByRole("button", { name: "การแจ้งเตือน", exact: true })).toHaveCount(0);
    const trigger = page.getByRole("button", { name: "เมนูบัญชีผู้ใช้", exact: true });
    await expect(trigger).toHaveCount(1);
    await expect(page.getByRole("link", { name: "โปรไฟล์ของฉัน", exact: true })).toHaveCount(0);
    await openAccountMenu(page);
    const dropdown = page.getByRole("navigation", { name: "เมนูบัญชีผู้ใช้", exact: true });
    await expect(dropdown.getByRole("link", { name: "โปรไฟล์ของฉัน", exact: true })).toBeVisible();
    await expect(dropdown.getByRole("button")).toHaveCount(2);
    const bounds = await dropdown.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
    await page.screenshot({ path: testInfo.outputPath("account-menu.png"), fullPage: true });
    await page.keyboard.press("Escape");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toBeFocused();
    await openAccountMenu(page);
    await page.getByRole("heading", { name: "แดชบอร์ดผู้ดูแลระบบ", exact: true }).click({ position: { x: 4, y: 4 } });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await openAccountMenu(page);
    await dropdown.getByRole("button", { name: "ตั้งค่าระบบ", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await expect(page.getByRole("dialog")).toContainText("Asia/Bangkok");
    await page.getByRole("button", { name: "ปิดหน้าต่าง", exact: true }).click();
    await expect(trigger).toBeFocused();
    await page.goto("/portal");
    await openAccountMenu(page);
    await page.getByRole("navigation", { name: "เมนูบัญชีผู้ใช้", exact: true }).getByRole("button", { name: "ตั้งค่าระบบ", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Asia/Bangkok");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
}

test("account actions can be reached by keyboard and follow the chosen language", async ({ page }) => {
  await seedSession(page);
  await page.goto("/portal");
  await page.getByRole("switch").click();
  const trigger = page.getByRole("button", { name: "Account menu", exact: true });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "My profile", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("navigation", { name: "Account menu", exact: true }).getByRole("button", { name: "System settings", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});
