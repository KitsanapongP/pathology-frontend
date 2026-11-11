import { expect, test } from "@playwright/test";
import { seedSession, success } from "./auth-fixture";

for (const viewport of [{ width: 1280, height: 720 }, { width: 1896, height: 1244 }]) {
  test(`password form fits ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await seedSession(page, true);
    await page.goto("/change-password");
    await expect(page.getByLabel("รหัสผ่านเดิม")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("password-form.png"), fullPage: true });
  });
}

test("forced-password guard survives reload and blocks login and every portal module", async ({ page }) => {
  await seedSession(page, true);
  for (const path of ["/", "/portal", "/portal/admin", "/portal/requests", "/portal/examinations", "/portal/matching", "/portal/storage"]) {
    await page.goto(path);
    await expect(page).toHaveURL("/change-password");
    await expect(page.getByLabel("รหัสผ่านเดิม")).toBeVisible();
  }
  await page.reload();
  await expect(page).toHaveURL("/change-password");
  await expect(page.getByLabel("รหัสผ่านเดิม")).toBeVisible();
});

test("password validation, wrong-password mapping and success logout", async ({ page }) => {
  await seedSession(page, true);
  let updates = 0;
  await page.route("http://api.e2e.test/v1/users/me/password", async route => {
    updates++;
    expect(route.request().method()).toBe("PUT");
    expect(route.request().postDataJSON()).toEqual({ old_password: "synthetic-old", new_password: "synthetic-new" });
    if (updates === 1) await route.fulfill({ status: 400, json: { message: "รหัสผ่านเดิมไม่ถูกต้อง", status: "error", status_code: 400, error_code: "users.wrong_password", request_id: "synthetic" } });
    else await route.fulfill({ json: success(null) });
  });
  await page.goto("/change-password");
  await page.getByRole("button", { name: "เปลี่ยนรหัสผ่าน", exact: true }).click();
  await expect(page.getByText("รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร")).toBeVisible();
  expect(updates).toBe(0);
  await page.getByLabel("รหัสผ่านเดิม").fill("synthetic-old");
  await page.getByLabel("รหัสผ่านใหม่", { exact: true }).fill("synthetic-new");
  await page.getByLabel("ยืนยันรหัสผ่านใหม่").fill("synthetic-new");
  await page.getByRole("button", { name: "เปลี่ยนรหัสผ่าน", exact: true }).click();
  await expect(page.getByLabel("รหัสผ่านเดิม")).toHaveAttribute("aria-invalid", "true");
  await page.getByRole("button", { name: "เปลี่ยนรหัสผ่าน", exact: true }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("status")).toHaveText("เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบอีกครั้ง");
  expect(await page.evaluate(() => sessionStorage.getItem("pathology:session:v1"))).toBeNull();
});
