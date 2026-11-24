import { expect, test, type Page } from "@playwright/test";
import { seedSession, success } from "./auth-fixture";

const initial = { user_id: "synthetic-editor-id", username: "synthetic-editor", first_name: "Synthetic", last_name: "Editor", email: "synthetic-editor@example.invalid", phone_number: "00123", status: "active", tenant_id: "synthetic-tenant", must_change_password: false, created_at: 1700000000 };
function list(user = initial) { return { ...success([user]), pagination: { current_page: 2, page_size: 10, total_records: 15, total_pages: 2 } }; }
async function fillCreate(page: Page) {
  const form = page.getByRole("form", { name: "สร้างผู้ใช้", exact: true });
  await form.getByLabel("ชื่อผู้ใช้", { exact: true }).fill("synthetic-new");
  await form.getByLabel("ชื่อ", { exact: true }).fill("New");
  await form.getByLabel("นามสกุล", { exact: true }).fill("User");
  await form.getByLabel("อีเมล", { exact: true }).fill("synthetic-new@example.invalid");
  await form.getByLabel("เบอร์โทรศัพท์", { exact: true }).fill("00999");
  await form.getByLabel("รหัสผ่านเริ่มต้น", { exact: true }).fill(" synthetic-secret ");
  await form.getByLabel("ยืนยันรหัสผ่านเริ่มต้น", { exact: true }).fill(" synthetic-secret ");
  return form;
}

test("create validates, renders backend conflicts, blocks repeated writes and refreshes the same query", async ({ page }) => {
  await seedSession(page);
  let reads = 0; let writes = 0;
  let finish!: () => void;
  const pending = new Promise<void>(resolve => { finish = resolve; });
  await page.route("http://api.e2e.test/v1/users**", async route => {
    if (route.request().method() === "GET") { reads++; return route.fulfill({ json: list() }); }
    writes++;
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toEqual({ username: "synthetic-new", first_name: "New", last_name: "User", email: "synthetic-new@example.invalid", phone_number: "00999", status: "active", password: " synthetic-secret " });
    if (writes === 1) return route.fulfill({ status: 400, json: { message: "Synthetic combined conflict", status: "error", status_code: 400, error_code: "synthetic.combined_conflict", request_id: "synthetic-conflict", errors: { username: ["Synthetic username conflict"], email: ["Synthetic email conflict"] } } });
    await pending;
    return route.fulfill({ json: success({ ...initial, username: "synthetic-new", must_change_password: true }) });
  });
  await page.goto("/portal/admin/users?page=2&size=10&q=synthetic");
  await expect(page.getByRole("cell", { name: initial.username, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "สร้างผู้ใช้", exact: true }).click();
  const form = await fillCreate(page);
  await form.getByLabel("ชื่อผู้ใช้", { exact: true }).fill("xy");
  await form.getByLabel("ยืนยันรหัสผ่านเริ่มต้น", { exact: true }).fill("different");
  await form.getByRole("button", { name: "สร้างผู้ใช้", exact: true }).click();
  await expect(form.getByLabel("ชื่อผู้ใช้", { exact: true })).toHaveAccessibleDescription("ชื่อผู้ใช้ต้องมี 3–100 ตัวอักษร");
  expect(writes).toBe(0);
  await form.getByLabel("ชื่อผู้ใช้", { exact: true }).fill("synthetic-new");
  await form.getByLabel("ยืนยันรหัสผ่านเริ่มต้น", { exact: true }).fill(" synthetic-secret ");
  await form.getByRole("button", { name: "สร้างผู้ใช้", exact: true }).click();
  await expect(form.getByLabel("ชื่อผู้ใช้", { exact: true })).toHaveAccessibleDescription("Synthetic username conflict");
  await expect(form.getByLabel("อีเมล", { exact: true })).toHaveAccessibleDescription("Synthetic email conflict");
  await form.getByRole("button", { name: "สร้างผู้ใช้", exact: true }).click();
  await expect(form.getByRole("button", { name: "กำลังบันทึก", exact: true })).toBeDisabled();
  await form.dispatchEvent("submit");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect.poll(() => writes).toBe(2);
  finish();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("สร้างผู้ใช้สำเร็จ ผู้ใช้ต้องเปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบครั้งแรก", { exact: true })).toBeVisible();
  await expect.poll(() => reads).toBe(2);
  await expect(page).toHaveURL(/page=2&size=10&q=synthetic/);
  const stored = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
  expect(stored).not.toContain("synthetic-secret");
});

test("edit loads the selected account, cancels buffered changes and saves without passwords or tenant fields", async ({ page }) => {
  await seedSession(page);
  let stored = { ...initial }; let reads = 0; let writes = 0;
  await page.route("http://api.e2e.test/v1/users**", route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith(`/${initial.user_id}`)) {
      if (route.request().method() === "GET") { reads++; return route.fulfill({ json: success(stored) }); }
      writes++;
      expect(route.request().method()).toBe("PUT");
      expect(route.request().postDataJSON()).toEqual({ username: initial.username, first_name: "Updated", last_name: initial.last_name, email: initial.email, phone_number: "", status: "inactive" });
      stored = { ...stored, ...route.request().postDataJSON() };
      return route.fulfill({ json: success(stored) });
    }
    return route.fulfill({ json: list(stored) });
  });
  await page.goto("/portal/admin/users?page=2&size=10&q=synthetic");
  const edit = page.getByRole("button", { name: `แก้ไขผู้ใช้ ${initial.username}`, exact: true });
  await edit.click();
  let form = page.getByRole("form", { name: "แก้ไขผู้ใช้", exact: true });
  await expect(form.getByLabel("ชื่อ", { exact: true })).toHaveValue("Synthetic");
  await expect(form.locator('input[type="password"]')).toHaveCount(0);
  await form.getByLabel("ชื่อ", { exact: true }).fill("Discarded");
  await form.getByRole("button", { name: "ยกเลิก", exact: true }).click();
  expect(writes).toBe(0);
  await expect(edit).toBeFocused();
  await edit.click();
  form = page.getByRole("form", { name: "แก้ไขผู้ใช้", exact: true });
  await expect(form.getByLabel("ชื่อ", { exact: true })).toHaveValue("Synthetic");
  await form.getByLabel("ชื่อ", { exact: true }).fill("Updated");
  await form.getByLabel("เบอร์โทรศัพท์", { exact: true }).fill("");
  await form.getByLabel("สถานะบัญชี", { exact: true }).selectOption("inactive");
  await form.getByRole("button", { name: "บันทึกผู้ใช้", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("cell", { name: "Updated Editor", exact: true })).toBeVisible();
  expect(reads).toBe(2); expect(writes).toBe(1);
  await expect(page).toHaveURL(/page=2&size=10&q=synthetic/);
});

for (const status of [403, 404, 500]) {
  test(`edit read handles ${status} without a write`, async ({ page }) => {
    await seedSession(page);
    let reads = 0;
    await page.route("http://api.e2e.test/v1/users**", route => {
      expect(route.request().method()).toBe("GET");
      if (new URL(route.request().url()).pathname.endsWith(`/${initial.user_id}`)) {
        reads++;
        if (status === 500 && reads > 1) return route.fulfill({ json: success(initial) });
        return route.fulfill({ status, json: { message: "Synthetic read failure", status: "error", status_code: status, error_code: status === 404 ? "users.not_found" : "synthetic.read_failure", request_id: "synthetic-user-read" } });
      }
      return route.fulfill({ json: list() });
    });
    await page.goto("/portal/admin/users");
    await page.getByRole("button", { name: `แก้ไขผู้ใช้ ${initial.username}`, exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("alert")).toContainText("Synthetic read failure");
    if (status === 403) await expect(dialog.getByRole("heading", { name: "ไม่มีสิทธิ์", exact: true })).toBeVisible();
    if (status === 404) await expect(dialog.getByRole("button", { name: "โหลดข้อมูลผู้ใช้อีกครั้ง" })).toHaveCount(0);
    if (status === 500) {
      await dialog.getByRole("button", { name: "โหลดข้อมูลผู้ใช้อีกครั้ง" }).click();
      await expect(dialog.getByLabel("ชื่อผู้ใช้", { exact: true })).toHaveValue(initial.username);
    }
    expect(await page.evaluate(() => sessionStorage.getItem("pathology:session:v1"))).not.toBeNull();
  });
}

for (const failure of ["forbidden", "network"] as const) {
  test(`create handles ${failure} without reporting a saved account`, async ({ page }) => {
    await seedSession(page);
    await page.route("http://api.e2e.test/v1/users**", route => {
      if (route.request().method() === "GET") return route.fulfill({ json: list() });
      if (failure === "network") return route.abort("failed");
      return route.fulfill({ status: 403, json: { message: "Synthetic write forbidden", status: "error", status_code: 403, error_code: "auth.forbidden", request_id: "synthetic-write-forbidden" } });
    });
    await page.goto("/portal/admin/users");
    await page.getByRole("button", { name: "สร้างผู้ใช้", exact: true }).click();
    const form = await fillCreate(page);
    await form.getByRole("button", { name: "สร้างผู้ใช้", exact: true }).click();
    if (failure === "forbidden") {
      await expect(page.getByRole("dialog").getByRole("heading", { name: "ไม่มีสิทธิ์", exact: true })).toBeVisible();
      expect(await page.evaluate(() => sessionStorage.getItem("pathology:session:v1"))).not.toBeNull();
    } else {
      await expect(form.getByText("ยังยืนยันการบันทึกไม่ได้ กรุณาตรวจสอบรายการผู้ใช้ก่อนลองอีกครั้ง", { exact: true })).toBeVisible();
      await expect(form.getByLabel("ชื่อผู้ใช้", { exact: true })).toHaveValue("synthetic-new");
      await expect(form.getByRole("button", { name: "สร้างผู้ใช้", exact: true })).toBeEnabled();
    }
    await expect(page.getByText("สร้างผู้ใช้สำเร็จ ผู้ใช้ต้องเปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบครั้งแรก", { exact: true })).toHaveCount(0);
  });
}

for (const viewport of [{ width: 1896, height: 1244 }, { width: 1280, height: 720 }, { width: 390, height: 844 }]) {
  test(`create and edit fit English 120% at ${viewport.width}px`, async ({ page }, testInfo) => {
    await seedSession(page); await page.setViewportSize(viewport);
    await page.addInitScript(() => localStorage.setItem("pathology:portal-preferences:v1", JSON.stringify({ language: "en", fontSize: 120 })));
    await page.route("http://api.e2e.test/v1/users**", route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith(`/${initial.user_id}`) ? success(initial) : list() }));
    await page.goto("/portal/admin/users");
    await page.getByRole("button", { name: "Create user", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Initial password", { exact: true })).toBeAttached();
    const bounds = await dialog.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
    await page.screenshot({ path: testInfo.outputPath("create-user.png"), fullPage: true });
    await dialog.getByRole("button", { name: "Create user", exact: true }).scrollIntoViewIfNeeded();
    await expect(dialog.getByRole("button", { name: "Create user", exact: true })).toBeInViewport();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: `Edit user ${initial.username}`, exact: true }).click();
    await expect(dialog.getByLabel("First name", { exact: true })).toHaveValue("Synthetic");
    await page.screenshot({ path: testInfo.outputPath("edit-user.png"), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
