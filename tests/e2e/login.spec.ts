import { expect, test } from "@playwright/test";
import { success, tokenData } from "./auth-fixture";

async function fillLogin(page: import("@playwright/test").Page, password = "synthetic-old") {
  await page.getByLabel("ชื่อผู้ใช้", { exact: true }).fill("synthetic-user");
  await page.getByLabel("รหัสผ่าน", { exact: true }).fill(password);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
}

test("login validates, reports invalid credentials, then creates a reloadable session", async ({ page }) => {
  let logins = 0; let refreshes = 0;
  await page.route("http://api.e2e.test/v1/auth/login", async route => {
    logins++;
    expect(route.request().postDataJSON()).toEqual({ username: "synthetic-user", password: "synthetic-old" });
    expect(route.request().headers()["authorization"]).toBeUndefined();
    expect(route.request().headers()["accept-language"]).toBe("th");
    if (logins === 1) await route.fulfill({ status: 401, json: { message: "Different backend translation", status: "error", status_code: 401, error_code: "auth.invalid_credentials", request_id: "synthetic" } });
    else await route.fulfill({ json: success(tokenData()) });
  });
  await page.route("http://api.e2e.test/v1/auth/refresh", route => { refreshes++; return route.fulfill({ json: success(tokenData()) }); });
  await page.goto("/");
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page.getByText("กรุณาระบุชื่อผู้ใช้")).toBeVisible();
  expect(logins).toBe(0);
  await fillLogin(page);
  await expect(page.getByRole("form").getByRole("alert")).toHaveText("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
  expect(refreshes).toBe(0);
  await fillLogin(page);
  await expect(page).toHaveURL("/portal");
  const stored = await page.evaluate(() => JSON.parse(sessionStorage.getItem("pathology:session:v1")!));
  expect(stored.refresh_token).toBe("synthetic-e2e-refresh");
  expect(stored).not.toHaveProperty("access_token");
  await page.reload();
  await expect(page.getByRole("switch")).toBeVisible();
  expect(refreshes).toBe(1);
});

test("new user changes password, signs in again with it and is not forced twice", async ({ page }) => {
  let changed = false;
  await page.route("http://api.e2e.test/v1/auth/login", async route => {
    expect(route.request().postDataJSON()).toEqual({ username: "synthetic-user", password: changed ? "synthetic-new" : "synthetic-old" });
    await route.fulfill({ json: success(tokenData(!changed)) });
  });
  await page.route("http://api.e2e.test/v1/auth/refresh", route => route.fulfill({ json: success(tokenData(!changed)) }));
  await page.route("http://api.e2e.test/v1/users/me/password", async route => {
    expect(route.request().postDataJSON()).toEqual({ old_password: "synthetic-old", new_password: "synthetic-new" });
    changed = true; await route.fulfill({ json: success(null) });
  });
  await page.goto("/"); await fillLogin(page);
  await expect(page).toHaveURL("/change-password");
  await page.goto("/portal");
  await expect(page).toHaveURL("/change-password");
  await page.getByLabel("รหัสผ่านเดิม").fill("synthetic-old");
  await page.getByLabel("รหัสผ่านใหม่", { exact: true }).fill("synthetic-new");
  await page.getByLabel("ยืนยันรหัสผ่านใหม่").fill("synthetic-new");
  await page.getByRole("button", { name: "เปลี่ยนรหัสผ่าน", exact: true }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("status")).toHaveText("เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบอีกครั้ง");
  await fillLogin(page, "synthetic-new");
  await expect(page).toHaveURL("/portal");
  await page.reload();
  await expect(page.getByRole("switch")).toBeVisible();
  await expect(page).toHaveURL("/portal");
});

test("login displays Swagger length limits under the correct fields before sending", async ({ page }) => {
  let logins = 0;
  await page.route("http://api.e2e.test/v1/auth/login", route => { logins++; return route.fulfill({ json: success(tokenData()) }); });
  await page.goto("/");
  await page.getByLabel("ชื่อผู้ใช้", { exact: true }).fill("u".repeat(101));
  await page.getByLabel("รหัสผ่าน", { exact: true }).fill("p".repeat(257));
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page.getByLabel("ชื่อผู้ใช้", { exact: true })).toHaveAccessibleDescription("ชื่อผู้ใช้ต้องไม่เกิน 100 ตัวอักษร");
  await expect(page.getByLabel("รหัสผ่าน", { exact: true })).toHaveAccessibleDescription("รหัสผ่านต้องไม่เกิน 256 ตัวอักษร");
  expect(logins).toBe(0);
  await page.getByLabel("ชื่อผู้ใช้", { exact: true }).fill("u".repeat(100));
  await page.getByLabel("รหัสผ่าน", { exact: true }).fill("p".repeat(256));
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page).toHaveURL("/portal");
  expect(logins).toBe(1);
});

for (const viewport of [{ width: 1280, height: 720 }, { width: 1896, height: 1244 }, { width: 390, height: 844 }]) {
  test(`login form fits ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.getByLabel("ชื่อผู้ใช้", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("login-form.png"), fullPage: true });
  });
}
