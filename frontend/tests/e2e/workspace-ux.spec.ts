import { test, expect, type Page } from "@playwright/test";

async function openUganda(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /^Uganda Full cockpit available/ }).click();
  await expect(page.getByRole("heading", { name: "Climate evidence. Clearer decisions." })).toBeVisible();
}

test("home loads without dashboard requests; all tools and theme remain accessible", async ({ page }) => {
  const requests: string[] = [];
  const crashes: string[] = [];
  page.on("request", (request) => { requests.push(request.url()); });
  page.on("pageerror", (error) => { crashes.push(error.message); });
  await openUganda(page);
  await page.waitForLoadState("networkidle");
  expect(requests.filter((url) => /\/emissions\/(dashboard|districts)|\/catalog\/|\/indicators\/panel/.test(url))).toEqual([]);
  await expect(page.getByRole("combobox", { name: "Switch active role" })).toContainText("Admin");
  await page.screenshot({ path: "test-results/ux-home-desktop-dark.png" });
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.screenshot({ path: "test-results/ux-home-desktop-light.png" });
  await page.getByRole("button", { name: "Open all tools" }).click();
  await expect(page.getByRole("navigation", { name: "All workspace tools" }).getByRole("link")).toHaveCount(14);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open all tools" })).toBeFocused();
  expect(crashes).toEqual([]);
});

test.describe("phone workspace", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });

  test("navigation and all homepage tools fit the screen", async ({ page }) => {
    await openUganda(page);
    await expect(page.getByRole("button", { name: "Open all tools" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: "test-results/ux-home-mobile.png" });
    await page.getByRole("button", { name: "Open all tools" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog").getByRole("combobox", { name: "Switch active role" })).toBeVisible();
    await page.getByRole("navigation", { name: "All workspace tools" }).getByRole("link", { name: /Documentation/ }).click();
    await expect(page).toHaveURL(/\/docs$/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator("#main-content")).toBeFocused();
    await expect(page.getByRole("heading", { name: "Something went wrong" })).toHaveCount(0);
  });

  test("district insights remain scrollable and exportable on a phone", async ({ page }) => {
    const crashes: string[] = [];
    page.on("pageerror", (error) => { crashes.push(error.message); });
    await openUganda(page);
    await page.getByRole("link", { name: "Explore a district", exact: true }).click();
    await page.getByRole("button", { name: "District", exact: true }).click();
    await expect(page.getByRole("combobox", { name: "Select district" })).toBeEnabled({ timeout: 30_000 });
    await page.getByRole("combobox", { name: "Select district" }).selectOption({ label: "Kampala" });
    const exportButton = page.getByRole("button", { name: "CSV", exact: true });
    await expect(exportButton).toBeAttached({ timeout: 90_000 });
    await page.getByRole("link", { name: "Insights", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Kampala", exact: true })).toBeInViewport();
    await exportButton.scrollIntoViewIfNeeded();
    await expect(exportButton).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: "test-results/ux-translator-mobile.png" });
    const csvDownload = page.waitForEvent("download");
    await exportButton.click();
    const csv = await csvDownload;
    expect(csv.suggestedFilename()).toBe("district-translator-kampala-2025.csv");
    await csv.saveAs("test-results/ux-kampala.csv");
    const geoDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "GeoJSON", exact: true }).click();
    expect((await geoDownload).suggestedFilename()).toBe("district-translator-kampala-2025.geojson");
    expect(crashes).toEqual([]);
  });
});

test("dashboard and exports load their deferred shared-data provider", async ({ page }) => {
  const crashes: string[] = [];
  page.on("pageerror", (error) => { crashes.push(error.message); });
  await openUganda(page);
  const dashboardRequest = page.waitForRequest((request) => request.url().includes("/emissions/dashboard"));
  await page.getByRole("link", { name: "Open Dashboard", exact: true }).click();
  await dashboardRequest;
  await expect(page.getByRole("button", { name: "National", exact: true })).toBeVisible();
  await page.goto("/exports");
  await expect(page.getByRole("heading", { name: "Exports & API", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export CRT/BTR CSV", exact: true })).toBeVisible();
  expect(crashes).toEqual([]);
});

test("district map renders after the patched map library loads", async ({ page }) => {
  const errors: string[] = [];
  const workerRequests: string[] = [];
  page.on("response", (response) => {
    if (/maplibre-gl-worker.*\.js/.test(response.url()) && response.status() === 200 && /javascript/.test(response.headers()["content-type"] ?? "")) workerRequests.push(response.url());
  });
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => { errors.push(error.message); });
  await openUganda(page);
  await page.getByRole("link", { name: "District Translator", exact: true }).click();
  await page.getByRole("button", { name: "District", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Select district" })).toBeEnabled({ timeout: 30_000 });
  await page.getByRole("combobox", { name: "Select district" }).selectOption({ label: "Kampala" });
  await expect(page.getByRole("button", { name: "CSV", exact: true })).toBeAttached({ timeout: 90_000 });
  await expect.poll(() => workerRequests.length).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Clear selection", exact: true }).click();
  const canvas = page.locator("canvas.maplibregl-canvas");
  await expect(async () => {
    await canvas.click();
    await expect(page.getByRole("heading", { name: "Kampala", exact: true })).toBeVisible();
  }).toPass({ timeout: 20_000 });
  await page.screenshot({ path: "test-results/ux-translator-desktop.png" });
  expect(errors).toEqual([]);
});
