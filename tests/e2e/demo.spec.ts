import { expect, test } from "@playwright/test";
import { success, tokenData } from "./auth-fixture";

for (const viewport of [{ width: 1280, height: 720 }, { width: 1896, height: 1244 }, { width: 390, height: 844 }]) {
  test(`demo role buttons fit ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.getByLabel("ชื่อผู้ใช้", { exact: true })).toBeVisible();
    await expect(page.getByLabel("รหัสผ่าน", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "ข้ามการเข้าสู่ระบบ Student / Professor" })).toBeVisible();
    await expect(page.getByRole("button", { name: "ข้ามการเข้าสู่ระบบ Admin" })).toBeVisible();
    const skips = (await page.getByRole("group", { name: "ข้ามการเข้าสู่ระบบ", exact: true }).boundingBox())!;
    if (viewport.width >= 640) {
      expect(skips.x + skips.width).toBeGreaterThan(viewport.width - 24);
      expect(skips.y).toBeGreaterThan(viewport.height - 60);
      expect(skips.height).toBeLessThan(40);
    } else {
      const form = (await page.getByRole("form").boundingBox())!;
      expect(skips.y).toBeGreaterThan(form.y + form.height);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("demo-login.png"), fullPage: true });
  });
}

for (const role of ["Student / Professor", "Admin"]) {
  test(`demo ${role} opens its dashboard, reloads and signs out without API calls`, async ({ page }) => {
    let apiCalls = 0;
    await page.route("**/v1/**", route => { apiCalls++; return route.abort(); });
    await page.goto("/");
    await page.getByRole("button", { name: `ข้ามการเข้าสู่ระบบ ${role}`, exact: true }).click();
    const destination = role === "Admin" ? "/portal/admin" : "/portal";
    await expect(page).toHaveURL(destination);
    await expect(page.getByRole("button", { name: "ออกจากระบบ", exact: true }).first()).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL(destination);
    await page.getByRole("button", { name: "ออกจากระบบ", exact: true }).first().click();
    await expect(page).toHaveURL("/");
    await page.goto(destination);
    await expect(page).toHaveURL("/");
    expect(apiCalls).toBe(0);
    expect(await page.evaluate(() => sessionStorage.getItem("pathology:session:v1"))).toBeNull();
  });
}

test("normal login still works with skip buttons enabled", async ({ page }) => {
  await page.route("http://api.e2e.test/v1/auth/login", route => route.fulfill({ json: success(tokenData()) }));
  await page.goto("/");
  await page.getByLabel("ชื่อผู้ใช้", { exact: true }).fill("synthetic-user");
  await page.getByLabel("รหัสผ่าน", { exact: true }).fill("synthetic-password");
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page).toHaveURL("/portal");
  expect(await page.evaluate(() => sessionStorage.getItem("pathology:demo-session:v1"))).toBeNull();
  expect(await page.evaluate(() => sessionStorage.getItem("pathology:session:v1"))).not.toBeNull();
});

test("real password restrictions remain enforced with skip buttons enabled", async ({ page }) => {
  await page.route("http://api.e2e.test/v1/auth/login", route => route.fulfill({ json: success(tokenData(true)) }));
  await page.goto("/");
  await page.getByLabel("ชื่อผู้ใช้", { exact: true }).fill("synthetic-user");
  await page.getByLabel("รหัสผ่าน", { exact: true }).fill("synthetic-password");
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page).toHaveURL("/change-password");
  await expect(page.getByRole("group", { name: "ข้ามการเข้าสู่ระบบ", exact: true })).toHaveCount(0);
  await page.route("http://api.e2e.test/v1/auth/refresh", route => route.fulfill({ json: success(tokenData(true)) }));
  await page.goto("/portal");
  await expect(page).toHaveURL("/change-password");
});
