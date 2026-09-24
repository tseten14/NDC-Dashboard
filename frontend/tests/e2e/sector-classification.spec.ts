import { test, expect, type Page } from "@playwright/test";

async function openClassification(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /^Uganda Full cockpit available/ }).click();
  await page.getByRole("button", { name: "Open all tools" }).click();
  const nav = page.getByRole("navigation", { name: "All workspace tools" });
  const links = await nav.getByRole("link").allTextContents();
  expect(links.findIndex((text) => text.includes("Sector Classification"))).toBe(links.findIndex((text) => text.includes("District Translator")) + 1);
  await nav.getByRole("link", { name: /Sector Classification/ }).click();
  await expect(page.getByRole("heading", { name: "Sector Classification", exact: true })).toBeVisible();
}

test("classification: desktop selection, keyboard search, save, refresh and framework change", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const crashes: string[] = [];
  const failedModules: string[] = [];
  page.on("pageerror", (error) => crashes.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400 && /\/node_modules\/\.vite\/deps\/|\/src\/|\/assets\/.*\.js/.test(response.url())) {
      failedModules.push(`${response.status()} ${response.url()}`);
    }
  });
  await openClassification(page);
  const primary = page.getByRole("navigation", { name: "Primary navigation" });
  const links = await primary.getByRole("link").allTextContents();
  expect(links.indexOf("Sector Classification")).toBe(links.indexOf("District Translator") + 1);
  await page.getByRole("button", { name: /^Expand 3 Agriculture/ }).click();
  const livestock = page.getByRole("checkbox", { name: "3.A Livestock" });
  await livestock.focus();
  await page.keyboard.press("Space");
  await expect(livestock).toBeChecked();
  await expect(page.getByRole("checkbox", { name: /^3 Agriculture/ })).toHaveAttribute("aria-checked", "mixed");
  await page.getByRole("button", { name: /^Collapse 3 Agriculture/ }).click();
  await page.getByRole("textbox", { name: "Search sectors by name or code" }).fill("3A1");
  const enteric = page.getByRole("checkbox", { name: "3.A.1 Enteric Fermentation" });
  await expect(enteric).toBeChecked();
  await enteric.focus(); await page.keyboard.press("Space");
  await page.getByRole("button", { name: "Clear search" }).click();
  await page.getByRole("button", { name: "Save selection" }).click();
  await expect(page.getByText("Saved on this device", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /^Review selection/ }).click();
  await expect(page.getByRole("button", { name: "Remove 3.A.2 Manure Management" })).toBeVisible();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await primary.getByRole("link", { name: "Sector Classification", exact: true }).click();
  await expect(page.getByText("Saved on this device", { exact: true })).toBeVisible();
  await page.locator("#main-content").evaluate((element) => element.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: "test-results/classification-desktop-dark.png", fullPage: true });
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await page.getByRole("button", { name: /^Expand 3 Agriculture/ }).click();
  await page.locator("#main-content").evaluate((element) => element.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: "test-results/classification-desktop-light.png", fullPage: true });
  await page.getByRole("radio", { name: "IPCC 2006 + 2019 Refinement", exact: true }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("Manure Management");
  await dialog.getByRole("button", { name: "Keep current framework" }).click();
  await expect(page.getByRole("radio", { name: "IPCC 2006", exact: true })).toBeFocused();
  // Verify the radio group can also initiate a framework change from the keyboard.
  await page.keyboard.down("ArrowDown");
  await expect(dialog).toBeVisible();
  await page.keyboard.up("ArrowDown");
  await dialog.getByRole("button", { name: "Remove categories and switch" }).click();
  await expect(page.getByRole("radio", { name: "IPCC 2006 + 2019 Refinement", exact: true })).toBeChecked();
  await page.getByRole("textbox").fill("Hydrogen");
  await page.getByRole("checkbox", { name: "2.B.10 Hydrogen Production" }).click();
  await page.getByRole("button", { name: "Save selection" }).click();
  await page.reload();
  await page.getByRole("button", { name: /^Review selection/ }).click();
  await expect(page.getByRole("button", { name: "Remove 2.B.10 Hydrogen Production" })).toBeVisible();
  expect(crashes).toEqual([]);
  expect(failedModules).toEqual([]);
});

test.describe("classification on mobile", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test("selection and summary fit the phone; saved categories survive navigation", async ({ page }) => {
    await openClassification(page);
    await page.getByRole("button", { name: /^Expand 3 Agriculture/ }).click();
    await page.getByRole("checkbox", { name: "3.A Livestock" }).click();
    await page.getByRole("checkbox", { name: "3.B Land" }).click();
    await page.getByRole("textbox").fill("3.A.1");
    await page.getByRole("checkbox", { name: "3.A.1 Enteric Fermentation" }).click();
    await page.getByRole("button", { name: "Clear search" }).click();
    await expect(page.getByRole("button", { name: "Save selection" })).toBeInViewport();
    await page.getByRole("button", { name: "Save selection" }).click();
    await expect(page.getByText("Saved on this device", { exact: true })).toBeVisible();
    await page.screenshot({ path: "test-results/classification-mobile-summary.png" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.reload();
    await page.getByRole("button", { name: "Review selection (7)" }).click();
    await expect(page.getByRole("button", { name: "Remove 3.A.2 Manure Management" })).toBeVisible();
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await page.getByRole("button", { name: "Change framework", exact: true }).click();
    await page.getByRole("radio", { name: "IPCC 2006 + 2019 Refinement", exact: true }).click();
    await expect(page.getByRole("alertdialog")).toBeInViewport();
    await page.getByRole("button", { name: "Keep current framework" }).click();
    await page.getByRole("button", { name: "Hide frameworks", exact: true }).click();
    await page.getByRole("textbox").fill("Harvested Wood");
    await expect(page.getByRole("checkbox", { name: "3.D.1 Harvested Wood Products" })).toBeVisible();
    await page.getByRole("heading", { name: "Sectors", exact: true }).scrollIntoViewIfNeeded();
    await page.locator("#main-content").evaluate((element) => { const sector = element.querySelector('[aria-labelledby="sectors-heading"]') as HTMLElement; element.scrollTo({ top: sector.offsetTop - 20, behavior: "instant" }); });
    await page.screenshot({ path: "test-results/classification-mobile-search.png" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
});

test("classification remains within a tablet viewport", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await openClassification(page);
  await page.getByRole("button", { name: /^Expand 3 Agriculture/ }).click();
  await page.getByRole("button", { name: "Expand 3.A Livestock" }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/classification-tablet.png" });
});
