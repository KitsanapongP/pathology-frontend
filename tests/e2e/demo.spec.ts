import { expect, test } from "@playwright/test";

for (const viewport of [{ width: 1280, height: 720 }, { width: 1896, height: 1244 }]) {
  test(`demo role buttons fit ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.getByRole("button", { name: "เข้าสู่ระบบ Student / Professor" })).toBeVisible();
    await expect(page.getByRole("button", { name: "เข้าสู่ระบบ Admin" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("demo-login.png"), fullPage: true });
  });
}

for (const role of ["Student / Professor", "Admin"]) {
  test(`demo ${role} opens its dashboard, reloads and signs out without API calls`, async ({ page }) => {
    let apiCalls = 0;
    await page.route("**/v1/**", route => { apiCalls++; return route.abort(); });
    await page.goto("/");
    await page.getByRole("button", { name: `เข้าสู่ระบบ ${role}`, exact: true }).click();
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
