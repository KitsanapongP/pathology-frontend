import { expect, test } from "@playwright/test";
import { seedSession } from "./auth-fixture";

test("authenticated session opens the portal and navigates to request intake", async ({ page }) => {
  await seedSession(page);
  await page.goto("/portal");
  await expect(page).toHaveURL(/\/portal$/);
  await page.getByRole("button", { name: /รับใบส่งตรวจ/ }).click();
  await expect(page).toHaveURL(/\/portal\/requests$/);
  await expect(page.getByRole("main")).toBeVisible();
});

test("language preference survives a reload in an isolated browser context", async ({ page }) => {
  await seedSession(page);
  await page.goto("/portal");
  await page.getByRole("switch").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("switch")).toBeChecked();
});

test("request identifiers stay independent when editing, searching and changing language", async ({ page }, testInfo) => {
  await seedSession(page);
  await page.goto("/portal/requests");
  await page.getByRole("button", { name: /^แก้ไข REQ-/ }).first().click();
  const dialog = page.getByRole("dialog");
  const requestNumber = dialog.getByRole("textbox", { name: "เลขที่สิ่งส่งตรวจ", exact: true });
  const hn = dialog.getByRole("textbox", { name: "HN", exact: true });
  const originalRequest = await requestNumber.inputValue();
  const originalHn = await hn.inputValue();
  await dialog.getByRole("textbox", { name: "Surgical Number", exact: true }).fill("SURG-QA-ONLY-2468");
  await expect(requestNumber).toHaveValue(originalRequest);
  await expect(hn).toHaveValue(originalHn);
  await dialog.getByRole("button", { name: "บันทึกการตรวจสอบ", exact: true }).click();

  const scope = page.getByRole("combobox", { name: "ค้นหาใน", exact: true });
  const search = page.getByRole("textbox", { name: "ค้นหาใบส่งตรวจ", exact: true });
  await scope.selectOption("surgical");
  await search.fill("SURGQAONLY2468");
  await expect(page.getByRole("button", { name: /^ดู REQ-/ })).toHaveCount(1);
  await scope.selectOption("accession");
  await expect(page.getByRole("heading", { name: "ไม่พบใบส่งตรวจ" })).toBeVisible();
  await search.fill(originalRequest);
  await expect(page.getByRole("button", { name: /^ดู REQ-/ })).toHaveCount(1);

  await scope.selectOption("surgical");
  await search.fill("SURG-QA-ONLY-2468");
  await page.getByRole("switch").click();
  await expect(page.getByRole("combobox", { name: "Search in", exact: true })).toHaveValue("surgical");
  await expect(page.getByRole("option", { name: "Request number", exact: true }).first()).toHaveAttribute("value", "accession");
  await page.getByRole("button", { name: /^Edit REQ-/ }).click();
  await expect(dialog.getByRole("textbox", { name: "Request number", exact: true })).toHaveValue(originalRequest);
  await expect(dialog.getByRole("textbox", { name: "Surgical Number", exact: true })).toHaveValue("SURG-QA-ONLY-2468");

  // QA uses synthetic records in a fresh isolated production browser only.
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1896, height: 1244 }]) {
    await page.setViewportSize(viewport);
    await dialog.getByRole("textbox", { name: "Surgical Number", exact: true }).scrollIntoViewIfNeeded();
    await expect(dialog).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`request-identifiers-${viewport.width}.png`) });
  }
});
