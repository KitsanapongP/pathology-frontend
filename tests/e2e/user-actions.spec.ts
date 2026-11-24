import { expect, test } from "@playwright/test";
import { seedSession, success } from "./auth-fixture";

const user = { user_id: "synthetic-action-id", username: "synthetic-action", first_name: "Synthetic", last_name: "Action", email: "synthetic-action@example.invalid", phone_number: "00123", status: "active", tenant_id: "synthetic-tenant", must_change_password: false, created_at: 1700000000 };
const listing = { ...success([user]), pagination: { current_page: 2, page_size: 10, total_records: 11, total_pages: 2 } };

test("reset confirms identity, validates passwords, preserves backend errors and does not end the actor session", async ({ page }) => {
  await seedSession(page);
  let writes = 0; let listReads = 0;
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route("http://api.e2e.test/v1/users**", async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/password")) {
      writes++;
      expect(route.request().method()).toBe("PUT");
      expect(route.request().postDataJSON()).toEqual({ new_password: "😀".repeat(8) });
      if (writes === 1) return route.fulfill({ status: 400, json: { message: "Synthetic password rejection", status: "error", status_code: 400, error_code: "synthetic.password_policy", request_id: "synthetic-policy", errors: { new_password: ["Synthetic password policy"] } } });
      await pending; return route.fulfill({ json: success(null) });
    }
    if (url.pathname.endsWith(`/${user.user_id}`)) return route.fulfill({ json: success(user) });
    listReads++; return route.fulfill({ json: listing });
  });
  await page.goto("/portal/admin/users?page=2&size=10&q=synthetic");
  await page.getByRole("button", { name: `รีเซ็ตรหัสผ่านผู้ใช้ ${user.username}`, exact: true }).click();
  const form = page.getByRole("form", { name: "รีเซ็ตรหัสผ่านผู้ใช้", exact: true });
  await expect(form.getByText(user.username, { exact: true })).toBeVisible();
  await expect(form.getByText(user.email, { exact: true })).toBeVisible();
  await expect(form.getByText("ผู้ใช้จะออกจากระบบทุกอุปกรณ์ และต้องเปลี่ยนรหัสผ่านใหม่เมื่อเข้าสู่ระบบครั้งถัดไป", { exact: true })).toBeVisible();
  await form.getByLabel("รหัสผ่านใหม่", { exact: true }).fill("short");
  await form.getByLabel("ยืนยันรหัสผ่านใหม่", { exact: true }).fill("different");
  await form.getByRole("button", { name: "ยืนยันรีเซ็ตรหัสผ่าน", exact: true }).click();
  await expect(form.getByLabel("รหัสผ่านใหม่", { exact: true })).toHaveAttribute("aria-invalid", "true");
  expect(writes).toBe(0);
  await form.getByLabel("รหัสผ่านใหม่", { exact: true }).fill("😀".repeat(8));
  await form.getByLabel("ยืนยันรหัสผ่านใหม่", { exact: true }).fill("😀".repeat(8));
  await form.getByRole("button", { name: "ยืนยันรีเซ็ตรหัสผ่าน", exact: true }).click();
  await expect(form.getByLabel("รหัสผ่านใหม่", { exact: true })).toHaveAccessibleDescription(/Synthetic password policy/);
  await form.getByRole("button", { name: "ยืนยันรีเซ็ตรหัสผ่าน", exact: true }).click();
  await expect(form.getByRole("button", { name: "กำลังดำเนินการ", exact: true })).toBeDisabled();
  await form.dispatchEvent("submit"); await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect.poll(() => writes).toBe(2);
  release();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("รีเซ็ตรหัสผ่านสำเร็จ ผู้ใช้ต้องเปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบครั้งถัดไป", { exact: true })).toBeVisible();
  await expect.poll(() => listReads).toBe(2);
  await expect(page).toHaveURL(/page=2&size=10&q=synthetic/);
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("pathology:session:v1")!).must_change_password)).toBe(false);
  expect(await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }))).not.toContain("😀");
});

test("delete requires the freshly loaded username, cancels without writing and recovers an emptied last page", async ({ page }) => {
  await seedSession(page);
  let deleted = false; let deletes = 0;
  const fresh = { ...user, username: "synthetic-renamed" };
  const remaining = { ...user, user_id: "synthetic-remaining", username: "synthetic-remaining" };
  await page.route("http://api.e2e.test/v1/users**", route => {
    const url = new URL(route.request().url());
    if (route.request().method() === "DELETE") {
      expect(url.pathname).toBe(`/v1/users/${user.user_id}`);
      expect(route.request().postData()).toBeNull(); deletes++; deleted = true;
      return route.fulfill({ json: success(null) });
    }
    if (url.pathname.endsWith(`/${user.user_id}`)) return route.fulfill({ json: success(fresh) });
    if (!deleted) return route.fulfill({ json: listing });
    const pageNumber = Number(url.searchParams.get("page"));
    return route.fulfill({ json: { ...success(pageNumber === 2 ? [] : [remaining]), pagination: { current_page: pageNumber, page_size: 10, total_records: 10, total_pages: 1 } } });
  });
  await page.goto("/portal/admin/users?page=2&size=10&q=synthetic");
  const open = page.getByRole("button", { name: `ลบผู้ใช้ ${user.username}`, exact: true });
  await open.click();
  let form = page.getByRole("form", { name: "ลบผู้ใช้", exact: true });
  await expect(form.getByText(fresh.username, { exact: true })).toBeVisible();
  await form.getByLabel("พิมพ์ชื่อผู้ใช้เพื่อยืนยัน", { exact: true }).fill(user.username);
  await expect(form.getByRole("button", { name: "ยืนยันลบผู้ใช้", exact: true })).toBeDisabled();
  await form.getByRole("button", { name: "ยกเลิก", exact: true }).click();
  expect(deletes).toBe(0); await expect(open).toBeFocused();
  await open.click();
  form = page.getByRole("form", { name: "ลบผู้ใช้", exact: true });
  await expect(form.getByLabel("พิมพ์ชื่อผู้ใช้เพื่อยืนยัน", { exact: true })).toHaveValue("");
  await form.getByLabel("พิมพ์ชื่อผู้ใช้เพื่อยืนยัน", { exact: true }).fill(fresh.username);
  await form.getByRole("button", { name: "ยืนยันลบผู้ใช้", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/page=1&size=10&q=synthetic/);
  await expect(page.getByRole("cell", { name: remaining.username, exact: true })).toBeVisible();
  await expect(page.getByText("ลบผู้ใช้แล้ว", { exact: true })).toBeVisible();
  expect(deletes).toBe(1);
});

for (const failure of [403, 404, 500, "network"] as const) {
  test(`user actions handle ${failure} without a success notice`, async ({ page }) => {
    await seedSession(page);
    const resetting = failure === 403 || failure === 500;
    await page.route("http://api.e2e.test/v1/users**", route => {
      const url = new URL(route.request().url());
      if (route.request().method() === "GET") return route.fulfill({ json: url.pathname.endsWith(`/${user.user_id}`) ? success(user) : listing });
      if (failure === "network") return route.abort("failed");
      return route.fulfill({ status: failure, json: { message: "Synthetic action failure", status: "error", status_code: failure, error_code: failure === 404 ? "users.not_found" : "synthetic.action_failure", request_id: "synthetic-action-failure" } });
    });
    await page.goto("/portal/admin/users");
    await page.getByRole("button", { name: `${resetting ? "รีเซ็ตรหัสผ่านผู้ใช้" : "ลบผู้ใช้"} ${user.username}`, exact: true }).click();
    const form = page.getByRole("form", { name: resetting ? "รีเซ็ตรหัสผ่านผู้ใช้" : "ลบผู้ใช้", exact: true });
    if (resetting) {
      await form.getByLabel("รหัสผ่านใหม่", { exact: true }).fill("synthetic-secret");
      await form.getByLabel("ยืนยันรหัสผ่านใหม่", { exact: true }).fill("synthetic-secret");
    } else await form.getByLabel("พิมพ์ชื่อผู้ใช้เพื่อยืนยัน", { exact: true }).fill(user.username);
    await form.getByRole("button", { name: resetting ? "ยืนยันรีเซ็ตรหัสผ่าน" : "ยืนยันลบผู้ใช้", exact: true }).click();
    const dialog = page.getByRole("dialog");
    if (failure === 403) await expect(dialog.getByRole("heading", { name: "ไม่มีสิทธิ์", exact: true })).toBeVisible();
    else if (failure === 404) await expect(dialog.getByRole("button", { name: "กลับไปรายการผู้ใช้", exact: true })).toBeVisible();
    else if (failure === 500) await expect(dialog.getByRole("alert")).toContainText("synthetic-action-failure");
    else await expect(dialog.getByText("ยังยืนยันการดำเนินการไม่ได้ กรุณาตรวจสอบบัญชีผู้ใช้ก่อนลองอีกครั้ง", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem("pathology:session:v1"))).not.toBeNull();
    await expect(page.getByText("ลบผู้ใช้แล้ว", { exact: true })).toHaveCount(0);
    await expect(page.getByText("รีเซ็ตรหัสผ่านสำเร็จ ผู้ใช้ต้องเปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบครั้งถัดไป", { exact: true })).toHaveCount(0);
  });
}

for (const viewport of [{ width: 1896, height: 1244 }, { width: 1280, height: 720 }, { width: 390, height: 844 }]) {
  test(`reset and delete dialogs fit English 120% at ${viewport.width}px`, async ({ page }, testInfo) => {
    await seedSession(page); await page.setViewportSize(viewport);
    await page.addInitScript(() => localStorage.setItem("pathology:portal-preferences:v1", JSON.stringify({ language: "en", fontSize: 120 })));
    await page.route("http://api.e2e.test/v1/users**", route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith(`/${user.user_id}`) ? success(user) : listing }));
    await page.goto("/portal/admin/users");
    for (const [label, action] of [["Reset user password", "reset"], ["Delete user", "delete"]]) {
      await page.getByRole("button", { name: `${label} ${user.username}`, exact: true }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("form")).toBeVisible();
      const bounds = await dialog.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
      await page.screenshot({ path: testInfo.outputPath(`${action}-user.png`), fullPage: true });
      const confirm = dialog.getByRole("button", { name: action === "reset" ? "Confirm password reset" : "Confirm user deletion", exact: true });
      await confirm.scrollIntoViewIfNeeded(); await expect(confirm).toBeInViewport();
      await page.keyboard.press("Escape");
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
