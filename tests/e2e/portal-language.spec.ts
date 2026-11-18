import { expect, test } from "@playwright/test";
import { seedSession, success, tokenData } from "./auth-fixture";

test("language persists through login, module navigation, reload and logout", async ({ page }) => {
  await page.route("http://api.e2e.test/v1/auth/tenants", route => route.fulfill({ json: success([{ code: "synthetic-hospital", name: "Synthetic Hospital" }]) }));
  let attempts = 0;
  await page.route("http://api.e2e.test/v1/auth/login", route => {
    attempts++;
    const language = route.request().headers()["accept-language"];
    expect(language).toBe(attempts === 1 ? "th" : "en");
    if (attempts < 3) return route.fulfill({ status: 422, json: {
      message: language === "th" ? "ข้อมูลจากระบบทดสอบ" : "Backend test message",
      status: "error", status_code: 422, error_code: "validation.failed", request_id: "synthetic-language",
      errors: { username: [language === "th" ? "ชื่อจากระบบทดสอบ" : "Backend username message"] },
    } });
    return route.fulfill({ json: success(tokenData()) });
  });
  await page.route("http://api.e2e.test/v1/auth/refresh", route => route.fulfill({ json: success(tokenData()) }));
  await page.goto("/");
  await page.getByLabel("ชื่อผู้ใช้", { exact: true }).fill("synthetic-user");
  await page.getByLabel("รหัสผ่าน", { exact: true }).fill("synthetic-password");
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page.getByText("ข้อมูลจากระบบทดสอบ", { exact: true })).toBeVisible();
  await page.getByRole("switch").focus();
  await page.keyboard.press("Space");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Backend test message", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Username", { exact: true })).toHaveAccessibleDescription("Backend username message");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("/portal");
  await expect(page.getByRole("banner")).toHaveCount(1);
  await page.getByRole("button", { name: "Large text", exact: true }).click();
  await page.getByRole("button", { name: /01 Document intake/ }).click();
  await expect(page).toHaveURL("/portal/requests");
  await page.reload();
  await expect(page.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("button", { name: "Large text", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveCSS("font-size", "19.2px");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveCSS("font-size", "16px");
  await page.reload();
  await expect(page.getByRole("switch")).toHaveAttribute("aria-checked", "true");
});

test("mandatory password change uses the saved language without portal font scaling", async ({ page }) => {
  await seedSession(page, true);
  await page.addInitScript(() => localStorage.setItem("pathology:portal-preferences:v1", JSON.stringify({ language: "en", fontSize: 120 })));
  await page.goto("/change-password");
  await expect(page.getByRole("heading", { name: "Change your initial password" })).toBeVisible();
  await expect(page.getByLabel("Current password", { exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveCSS("font-size", "16px");
  await page.goto("/portal");
  await expect(page).toHaveURL("/change-password");
  await expect(page.getByRole("banner")).toHaveCount(0);
});

for (const viewport of [{ width: 1896, height: 1244 }, { width: 1280, height: 720 }, { width: 390, height: 844 }]) {
  test(`shared layout and localized dashboard fit ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.route("http://api.e2e.test/v1/auth/tenants", route => route.fulfill({ json: success([{ code: "synthetic-hospital", name: "Synthetic Hospital" }]) }));
    await page.goto("/");
    await page.getByRole("switch").click();
    await expect(page.getByLabel("Hospital code", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Username", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("login-en.png"), fullPage: true });
    await seedSession(page);
    await page.goto("/portal/admin");
    await page.getByRole("button", { name: "Large text", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Administrator dashboard", exact: true })).toBeVisible();
    await expect(page.locator("time").first()).toContainText("2026");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator(".portal-stat").evaluateAll(cards => cards.every(card => card.scrollWidth <= card.clientWidth))).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("admin-en-large.png"), fullPage: true });
    if (viewport.width < 1024) await page.getByRole("button", { name: "Open menu", exact: true }).click();
    await page.getByRole("button", { name: "System settings", exact: true }).click();
    await expect(page.getByRole("dialog").getByText("English", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Close dialog", exact: true }).click();
    await page.goto("/portal");
    await expect(page.getByRole("banner")).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("portal-en-large.png"), fullPage: true });
    await page.goto("/portal/examinations/");
    await expect(page.getByRole("banner")).toHaveCount(0);
    await expect(page.locator(".portal-frame--station")).toBeVisible();
  });
}
