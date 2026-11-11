import { expect, test } from "@playwright/test";
import { seedSession, success, tokenData } from "./auth-fixture";

test("anonymous visitors cannot mount portal modules", async ({ page }) => {
  await page.goto("/portal/admin");
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "เข้าสู่ระบบ", exact: true })).toBeVisible();
});

test("session survives more than five minutes and logout prevents back/reload access", async ({ page }) => {
  await page.clock.install();
  await seedSession(page);
  let refreshes = 0;
  await page.route("http://api.e2e.test/v1/auth/refresh", route => {
    refreshes++;
    return route.fulfill({ json: success(tokenData()) });
  });
  await page.route("http://api.e2e.test/v1/auth/logout", async route => {
    expect(route.request().postDataJSON()).toEqual({ refresh_token: "synthetic-e2e-refresh" });
    // Even a failing revoke must end local access.
    await route.fulfill({ status: 503, json: { message: "Unavailable", status: "error", status_code: 503, error_code: "internal.error", request_id: "synthetic" } });
  });
  await page.goto("/portal");
  await expect(page.getByRole("switch")).toBeVisible();
  await page.clock.fastForward(270_000);
  await expect.poll(() => refreshes).toBe(2);
  await page.clock.fastForward(90_000);
  await expect(page).toHaveURL("/portal");
  await page.getByRole("button", { name: /รับใบส่งตรวจ/ }).click();
  await expect(page).toHaveURL("/portal/requests");
  const revoked = page.waitForRequest("http://api.e2e.test/v1/auth/logout");
  await page.getByRole("button", { name: "ออกจากระบบ", exact: true }).first().click();
  await revoked;
  await expect(page).toHaveURL("/");
  expect(await page.evaluate(() => sessionStorage.getItem("pathology:session:v1"))).toBeNull();
  await page.goBack();
  await expect(page).toHaveURL("/");
  await page.goto("/portal");
  await expect(page).toHaveURL("/");
  await page.reload();
  await expect(page).toHaveURL("/");
});

test("a rejected refresh ends the session and returns to login", async ({ page }) => {
  await seedSession(page);
  await page.route("http://api.e2e.test/v1/auth/refresh", route => route.fulfill({ status: 401, json: { message: "Expired", status: "error", status_code: 401, error_code: "auth.invalid_refresh_token", request_id: "synthetic" } }));
  await page.goto("/portal");
  await expect(page).toHaveURL("/");
  expect(await page.evaluate(() => sessionStorage.getItem("pathology:session:v1"))).toBeNull();
});
