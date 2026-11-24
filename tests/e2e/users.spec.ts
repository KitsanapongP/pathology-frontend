import { expect, test } from "@playwright/test";
import { seedSession, success } from "./auth-fixture";

const user = { user_id: "synthetic-user-id", username: "synthetic-user", first_name: "Synthetic", last_name: "User", email: "synthetic@example.invalid", status: "active", tenant_id: "synthetic-tenant", must_change_password: false, created_at: 1_700_000_000 };
function listing(page = 1, size = 20, name = user.username) {
  return { ...success([{ ...user, username: name }]), pagination: { current_page: page, page_size: size, total_records: 41, total_pages: Math.ceil(41 / size) } };
}

test("authenticated users can open the directory and preserve search and pagination through history and reload", async ({ page }) => {
  await seedSession(page);
  const requests: URL[] = [];
  await page.route("http://api.e2e.test/v1/users**", route => {
    expect(route.request().headers().authorization).toBe("Bearer synthetic-e2e-access");
    const url = new URL(route.request().url()); requests.push(url);
    expect(url.searchParams.has("page_size")).toBe(false);
    return route.fulfill({ json: listing(Number(url.searchParams.get("page")), Number(url.searchParams.get("size")), url.searchParams.get("q") || user.username) });
  });
  await page.goto("/portal");
  await page.getByRole("link", { name: "จัดการผู้ใช้", exact: true }).click();
  await expect(page.getByRole("cell", { name: user.username, exact: true })).toBeVisible();
  await page.getByLabel("ค้นหาผู้ใช้", { exact: true }).fill("synthetic query");
  await expect(page.getByRole("cell", { name: "synthetic query", exact: true })).toBeVisible();
  await expect(page.getByLabel("ค้นหาผู้ใช้", { exact: true })).toBeFocused();
  expect(requests.at(-1)?.pathname).toBe("/v1/users/search");
  await page.getByRole("button", { name: "หน้าถัดไป" }).click();
  await expect(page).toHaveURL(/page=2.*size=20.*q=synthetic\+query/);
  await page.getByLabel("จำนวนต่อหน้า").selectOption("50");
  await expect(page).toHaveURL(/page=1.*size=50/);
  await expect(page.getByRole("button", { name: "หน้าถัดไป" })).toBeDisabled();
  await page.goBack();
  await expect(page).toHaveURL(/page=2.*size=20/);
  await page.reload();
  await expect(page.getByLabel("ค้นหาผู้ใช้", { exact: true })).toHaveValue("synthetic query");
  await expect(page.getByRole("cell", { name: "synthetic query", exact: true })).toBeVisible();
  await page.getByLabel("ค้นหาผู้ใช้", { exact: true }).fill("");
  await expect(page.getByRole("cell", { name: user.username, exact: true })).toBeVisible();
  expect(requests.at(-1)?.pathname).toBe("/v1/users");
  expect(requests.at(-1)?.searchParams.get("page")).toBe("1");
});

test("a late search response cannot overwrite a newer search", async ({ page }) => {
  await seedSession(page);
  let releaseOld!: () => void;
  const oldResponse = new Promise<void>(resolve => { releaseOld = resolve; });
  let oldStarted = false;
  await page.route("http://api.e2e.test/v1/users**", async route => {
    const q = new URL(route.request().url()).searchParams.get("q");
    if (q === "old") { oldStarted = true; await oldResponse; }
    await route.fulfill({ json: listing(1, 20, q || user.username) }).catch(() => {});
  });
  await page.goto("/portal/admin/users");
  await page.getByLabel("ค้นหาผู้ใช้", { exact: true }).fill("old");
  await expect.poll(() => oldStarted).toBe(true);
  await page.getByLabel("ค้นหาผู้ใช้", { exact: true }).fill("new");
  await expect(page.getByRole("cell", { name: "new", exact: true })).toBeVisible();
  releaseOld();
  await expect(page.getByRole("cell", { name: "old", exact: true })).toHaveCount(0);
  await expect(page.getByRole("cell", { name: "new", exact: true })).toBeVisible();
});

test("server failure exposes diagnostics and retry, and empty search remains usable", async ({ page }) => {
  await seedSession(page);
  let calls = 0;
  await page.route("http://api.e2e.test/v1/users**", route => {
    calls++;
    if (calls === 1) return route.fulfill({ status: 500, json: { message: "Synthetic backend failure", status: "error", status_code: 500, error_code: "internal.error", request_id: "synthetic-users-request" } });
    return route.fulfill({ json: { ...success([]), pagination: { current_page: 1, page_size: 20, total_records: 0, total_pages: 0 } } });
  });
  await page.goto("/portal/admin/users?q=absent");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("synthetic-users-request");
  await page.getByRole("button", { name: "โหลดรายการผู้ใช้อีกครั้ง" }).click();
  await expect(page.getByText("ไม่พบผู้ใช้ที่ตรงกับการค้นหา", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "หน้าถัดไป" })).toBeDisabled();
  expect(calls).toBe(2);
});

test("403 shows access denied without refreshing or deleting the session", async ({ page }) => {
  await seedSession(page);
  let refreshes = 0;
  page.on("request", request => { if (request.url().endsWith("/auth/refresh")) refreshes++; });
  await page.route("http://api.e2e.test/v1/users**", route => route.fulfill({ status: 403, json: { message: "Synthetic access denial", status: "error", status_code: 403, error_code: "auth.forbidden", request_id: "synthetic-forbidden" } }));
  await page.goto("/portal/admin/users");
  await expect(page.getByRole("heading", { name: "ไม่มีสิทธิ์", exact: true })).toBeVisible();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Synthetic access denial");
  expect(refreshes).toBe(1);
  expect(await page.evaluate(() => sessionStorage.getItem("pathology:session:v1"))).not.toBeNull();
  await page.getByRole("link", { name: "กลับไปหน้า Portal", exact: true }).click();
  await expect(page).toHaveURL("/portal");
});

for (const forced of [false, true]) {
  test(`directory keeps ${forced ? "mandatory-password" : "anonymous"} guard`, async ({ page }) => {
    if (forced) await seedSession(page, true);
    let calls = 0;
    await page.route("http://api.e2e.test/v1/users**", route => { calls++; return route.abort(); });
    await page.goto("/portal/admin/users");
    await expect(page).toHaveURL(forced ? "/change-password" : "/");
    expect(calls).toBe(0);
  });
}

for (const viewport of [{ width: 1896, height: 1244 }, { width: 1280, height: 720 }, { width: 390, height: 844 }]) {
  test(`user list layout ${viewport.width}px at English 120%`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await seedSession(page);
    await page.addInitScript(() => localStorage.setItem("pathology:portal-preferences:v1", JSON.stringify({ language: "en", fontSize: 120 })));
    await page.route("http://api.e2e.test/v1/users**", route => route.fulfill({ json: listing() }));
    await page.goto("/portal/admin/users");
    await expect(page.getByRole("cell", { name: user.username, exact: true })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    expect(await page.locator("html").evaluate(element => getComputedStyle(element).fontSize)).toBe("19.2px");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("users.png"), fullPage: true });
  });
}
