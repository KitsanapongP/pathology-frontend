import type { Page } from "@playwright/test";

export function tokenData(mustChangePassword = false) {
  return { access_token: "synthetic-e2e-access", refresh_token: "synthetic-e2e-refresh", token_type: "Bearer", expires_in: 300, refresh_expires_in: 1800, must_change_password: mustChangePassword };
}
export function success(data: unknown) { return { message: "สำเร็จ", status: "success", status_code: 200, data }; }
export async function seedSession(page: Page, mustChangePassword = false) {
  await page.addInitScript(({ forced }) => {
    if (sessionStorage.getItem("e2e:seeded")) return;
    sessionStorage.setItem("e2e:seeded", "true");
    sessionStorage.setItem("pathology:session:v1", JSON.stringify({ refresh_token: "synthetic-e2e-refresh", refresh_expires_at: Date.now() + 1800_000, must_change_password: forced }));
  }, { forced: mustChangePassword });
  await page.route("http://api.e2e.test/v1/auth/refresh", route => route.fulfill({ json: success(tokenData(mustChangePassword)) }));
}
