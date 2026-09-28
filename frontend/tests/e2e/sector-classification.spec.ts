import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function stubClassification(page: Page) {
  await page.route("**/api/v1/emissions/classification/catalog", (route) => route.fulfill({ json: {
    geography: "UGA", unit: "MtCO2e", gas: "co2e_100yr", year_min: 2015, latest_complete_year: 2025, latest_available_year: 2026,
    categories: [
      { code: "1.A.1", label: "Energy Industries", subsector: "electricity-generation", scope: "Electricity generation only.", coverage: "partial" },
      { code: "3.A.1", label: "Enteric Fermentation", subsector: "enteric-fermentation-cattle-pasture", scope: "Cattle on pasture only.", coverage: "partial" },
    ],
    provenance: { source: "Climate TRACE", api_version: "v7", api_url: "https://api.climatetrace.org/v7/docs/index.html", published_release: { version: "5.11.0", published_at: "2026-09-24", data_through: "2026-07", verified_at: "2026-09-28", url: "https://climatetrace.org/data" }, api_dataset_release: null },
  } }));
  await page.route("**/api/v1/emissions/classification/series?*", (route) => {
    const url = new URL(route.request().url());
    const code = url.searchParams.get("code") ?? "1.A.1";
    const since = Number(url.searchParams.get("since"));
    const to = Number(url.searchParams.get("to"));
    const isEnteric = code === "3.A.1";
    return route.fulfill({ json: {
      category: { code, label: isEnteric ? "Enteric Fermentation" : "Energy Industries", subsector: isEnteric ? "enteric-fermentation-cattle-pasture" : "electricity-generation", scope: isEnteric ? "Cattle on pasture only." : "Electricity generation only.", coverage: "partial" },
      geography: "UGA", unit: "MtCO2e", gas: "co2e_100yr", since, to,
      series: Array.from({ length: to - since + 1 }, (_, index) => ({ year: since + index, value_mtco2e: isEnteric ? 11.275 : 0.1315, status: "available", complete_year: since + index <= 2025, source_url: "https://api.climatetrace.org/v7/sources/emissions" })),
      retrieved_at: "2026-09-28T12:00:00.000Z",
      provenance: { source: "Climate TRACE", api_version: "v7", api_url: "https://api.climatetrace.org/v7/docs/index.html", published_release: { version: "5.11.0", published_at: "2026-09-24", data_through: "2026-07", verified_at: "2026-09-28", url: "https://climatetrace.org/data" }, api_dataset_release: null },
    } });
  });
}

async function openUganda(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /^Uganda Full cockpit available/ }).click();
}

test("classification is beside the translator and shows API data with source and partial-coverage labels", async ({ page }) => {
  await stubClassification(page);
  await openUganda(page);
  const nav = page.getByRole("navigation", { name: "Primary navigation" });
  const links = await nav.getByRole("link").allTextContents();
  expect(links.indexOf("Sector Classification")).toBe(links.indexOf("District Translator") + 1);
  await nav.getByRole("link", { name: "Sector Classification" }).click();
  await expect(page.getByRole("heading", { name: "Sector Classification" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Where this data comes from" })).toBeVisible();
  await expect(page.getByText("Partial IPCC coverage.")).toBeVisible();
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(6);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: "test-results/classification-desktop.png", fullPage: true });
  const csv = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download CSV" }).click();
  expect((await csv).suggestedFilename()).toBe("climate-trace-uganda-1.A.1-2021-2025.csv");
  await page.getByRole("combobox", { name: "IPCC 2006 category" }).selectOption("1.A.2");
  await expect(page.getByRole("heading", { name: "Data unavailable for this category" })).toBeVisible();
  await page.getByRole("combobox", { name: "IPCC 2006 category" }).selectOption("3.A.1");
  await expect(page.getByText("Cattle on pasture only.")).toBeVisible();
});

test("classification and read-only exercise archive fit a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await stubClassification(page);
  await openUganda(page);
  await page.evaluate(() => {
    const now = new Date().toISOString();
    localStorage.setItem("ndc-inventory-exercises-v1:UG", JSON.stringify([{
      schemaVersion: 1, id: "saved-one", countryCode: "UG", name: "Saved inventory", sample: false, updatedAt: now, step: 1, status: "draft",
      selection: { schemaVersion: 1, countryCode: "UG", frameworkId: "ipcc-2006", hierarchyVersion: "2006-table8.2-level3-v1", selectedCodes: [], savedAt: now },
      sources: [], activeCategory: "", start: 2010, end: 2024,
      thresholds: { r2: 0.95, mape: 5, bias: 2, coverage: 90 }, assignments: {}, decisions: {}, notes: {}, recalculations: {}, focalPoints: {}, reviewer: "", acknowledged: false,
      audit: [{ at: now, action: "Exercise created" }],
    }]));
  });
  await page.getByRole("button", { name: "Open all tools" }).click();
  await page.getByRole("navigation", { name: "All workspace tools" }).getByRole("link", { name: /Sector Classification/ }).click();
  await expect(page.getByRole("heading", { name: "Sector Classification" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("link", { name: "View saved exercise archive" }).click();
  await page.getByRole("button", { name: /Saved inventory/ }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: "test-results/classification-archive-mobile.png", fullPage: true });
  await expect(page.getByRole("button", { name: "Export exercise backup" })).toBeVisible();
  await expect(page.getByRole("button", { name: "New exercise" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
