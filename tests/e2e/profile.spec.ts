import { expect, test } from "@playwright/test";
import { seedSession, success } from "./auth-fixture";

const initial = { user_id: "synthetic-profile-id", username: "synthetic-user", first_name: "Synthetic", last_name: "User", email: "synthetic@example.invalid", phone_number: "000123", status: "active", tenant_id: "synthetic-tenant", must_change_password: false, created_at: 1_700_000_000 };

test("profile edits persist through a new read and reload, with backend field feedback", async ({ page }) => {
  await seedSession(page);
  let stored = { ...initial }; let reads = 0; let saves = 0;
  await page.route("http://api.e2e.test/v1/users/me", route => {
    expect(route.request().headers()["authorization"]).toBe("Bearer synthetic-e2e-access");
    if (route.request().method() === "GET") { reads++; return route.fulfill({ json: success(stored) }); }
    expect(route.request().method()).toBe("PUT");
    saves++;
    const body = route.request().postDataJSON();
    expect(Object.keys(body).sort()).toEqual(["email", "first_name", "last_name", "phone_number"]);
    if (saves === 1) return route.fulfill({ status: 422, json: { message: "Synthetic validation", status: "error", status_code: 422, error_code: "users.email_already_exists", request_id: "synthetic-profile-error", errors: { email: ["Synthetic email already exists"] } } });
    stored = { ...stored, ...body };
    return route.fulfill({ json: success(null) });
  });
  await page.goto("/portal");
  await page.getByRole("link", { name: "โปรไฟล์ของฉัน", exact: true }).click();
  await expect(page).toHaveURL("/portal/profile");
  await expect(page.getByLabel("ชื่อ", { exact: true })).toHaveValue("Synthetic");
  await page.getByLabel("ชื่อ", { exact: true }).fill(" ");
  await page.getByLabel("เบอร์โทรศัพท์").fill("12ab");
  await page.getByRole("button", { name: "บันทึกโปรไฟล์", exact: true }).click();
  await expect(page.getByLabel("ชื่อ", { exact: true })).toHaveAccessibleDescription("กรุณาระบุชื่อ");
  await expect(page.getByLabel("เบอร์โทรศัพท์")).toHaveAccessibleDescription("เบอร์โทรศัพท์ต้องเป็นตัวเลขไม่เกิน 20 หลัก");
  expect(saves).toBe(0);
  await page.getByLabel("ชื่อ", { exact: true }).fill("Updated");
  await page.getByLabel("เบอร์โทรศัพท์").fill("000123");
  await page.getByLabel("อีเมล").fill("changed@example.invalid");
  await page.getByRole("button", { name: "บันทึกโปรไฟล์", exact: true }).click();
  await expect(page.getByLabel("อีเมล")).toHaveAccessibleDescription("Synthetic email already exists");
  await expect(page.getByLabel("ชื่อ", { exact: true })).toHaveValue("Updated");
  await page.getByRole("button", { name: "บันทึกโปรไฟล์", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("บันทึกโปรไฟล์แล้ว");
  await expect(page.getByRole("button", { name: "บันทึกโปรไฟล์", exact: true })).toBeDisabled();
  expect(await page.evaluate(() => sessionStorage.getItem("pathology:session:v1"))).not.toBeNull();
  await page.reload();
  await expect(page.getByLabel("ชื่อ", { exact: true })).toHaveValue("Updated");
  await expect(page.getByLabel("อีเมล")).toHaveValue("changed@example.invalid");
  expect(reads).toBe(2);
});

test("self password change warns about all sessions, maps errors and requires a new login", async ({ page }) => {
  await seedSession(page);
  await page.route("http://api.e2e.test/v1/users/me", route => route.fulfill({ json: success(initial) }));
  let changes = 0;
  await page.route("http://api.e2e.test/v1/users/me/password", route => {
    expect(route.request().method()).toBe("PUT");
    expect(route.request().postDataJSON()).toEqual({ old_password: "synthetic-old", new_password: "synthetic-new" });
    changes++;
    if (changes === 1) return route.fulfill({ status: 400, json: { message: "Synthetic incorrect password", status: "error", status_code: 400, error_code: "users.wrong_password", request_id: "synthetic-password" } });
    return route.fulfill({ json: success(null) });
  });
  await page.goto("/portal/profile");
  const form = page.getByRole("form", { name: "เปลี่ยนรหัสผ่านของฉัน" });
  await expect(form).toHaveAccessibleDescription("เมื่อเปลี่ยนรหัสผ่านสำเร็จ คุณจะออกจากระบบทุกอุปกรณ์และต้องเข้าสู่ระบบใหม่");
  await form.getByLabel("รหัสผ่านเดิม", { exact: true }).fill("synthetic-old");
  await form.getByLabel("รหัสผ่านใหม่", { exact: true }).fill("synthetic-new");
  await form.getByLabel("ยืนยันรหัสผ่านใหม่", { exact: true }).fill("synthetic-new");
  await form.getByRole("button", { name: "เปลี่ยนรหัสผ่าน", exact: true }).click();
  await expect(form.getByLabel("รหัสผ่านเดิม", { exact: true })).toHaveAccessibleDescription("Synthetic incorrect password");
  await form.getByRole("button", { name: "เปลี่ยนรหัสผ่าน", exact: true }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("status")).toHaveText("เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบอีกครั้ง");
  expect(await page.evaluate(() => sessionStorage.getItem("pathology:session:v1"))).toBeNull();
  await page.reload();
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("profile read failures expose retry and request diagnostics", async ({ page }) => {
  await seedSession(page);
  let reads = 0;
  await page.route("http://api.e2e.test/v1/users/me", route => ++reads === 1
    ? route.fulfill({ status: 503, json: { message: "Synthetic unavailable", status: "error", status_code: 503, error_code: "internal.error", request_id: "synthetic-profile-503" } })
    : route.fulfill({ json: success(initial) }));
  await page.goto("/portal/profile");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("synthetic-profile-503");
  await expect(page.getByRole("form")).toHaveCount(0);
  await page.getByRole("button", { name: "โหลดโปรไฟล์อีกครั้ง" }).click();
  await expect(page.getByLabel("ชื่อ", { exact: true })).toHaveValue("Synthetic");
});

test("mandatory password sessions cannot open the profile", async ({ page }) => {
  await seedSession(page, true);
  let reads = 0;
  await page.route("http://api.e2e.test/v1/users/me", route => { reads++; return route.fulfill({ json: success(initial) }); });
  await page.goto("/portal/profile");
  await expect(page).toHaveURL("/change-password");
  await expect(page.getByRole("form", { name: "เปลี่ยนรหัสผ่านครั้งแรก" })).toBeVisible();
  expect(reads).toBe(0);
});

for (const viewport of [{ width: 1896, height: 1244 }, { width: 1280, height: 720 }, { width: 390, height: 844 }]) {
  test(`profile fits ${viewport.width}x${viewport.height} with English and large text`, async ({ page }, testInfo) => {
    await seedSession(page);
    await page.setViewportSize(viewport);
    await page.route("http://api.e2e.test/v1/users/me", route => route.fulfill({ json: success(initial) }));
    await page.goto("/portal/admin");
    const profileLink = page.locator(".portal-global-header").getByRole("link", { name: "โปรไฟล์ของฉัน", exact: true });
    await expect(profileLink).toHaveText("");
    await expect(profileLink).toHaveAttribute("title", "โปรไฟล์ของฉัน");
    expect(await profileLink.evaluate(link => link.nextElementSibling?.tagName)).toBe("BUTTON");
    await profileLink.click();
    await page.getByRole("switch").click();
    await page.getByRole("button", { name: "Large text", exact: true }).click();
    await expect(page.getByLabel("First name", { exact: true })).toHaveValue("Synthetic");
    await expect(page.getByRole("banner")).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("profile-en-large.png"), fullPage: true });
  });
}
