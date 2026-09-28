import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { seedUgandaSession } from "./helpers";

// Every static application route, including the nested risk screens. Dynamic
// record routes are represented by their parent workflows below.
const routes = [
  "/", "/dashboard", "/library", "/my-work", "/activities/new",
  "/executive", "/delivery", "/evidence", "/finance", "/ingest",
  "/ai-2030", "/climate-finance", "/documents", "/documents/view",
  "/mwp-marketplace", "/policy-impact", "/map", "/district-translator",
  "/sector-classification", "/scenario-analysis", "/docs", "/risk",
  "/risk/map", "/risk/screening", "/risk/drilldown", "/legacy-overview",
  "/ndc", "/indicators", "/interlinkages", "/causal-chains",
  "/project-check", "/tenfold", "/ndp-iv", "/vision-2040",
  "/afolu-mrv", "/kpis", "/ownership", "/projections",
  "/investment", "/exports", "/admin", "/financial-flow",
  "/cost-effectiveness", "/institutional-map",
];

for (const width of [390, 768, 1280, 1920]) {
  test(`all routes render at ${width}px without page overflow`, async ({ page }) => {
    test.setTimeout(240_000);
    await seedUgandaSession(page);
    // This pass checks layout for every route. Keep its many navigations from
    // consuming the API's rate limit before the workflow and security tests.
    await page.route("**/api/**", (request) => request.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"error":"Route layout check"}',
    }));
    await page.setViewportSize({ width, height: 900 });
    const crashes: string[] = [];
    page.on("pageerror", (error) => crashes.push(error.message));
    for (const route of routes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.locator("#main-content"), route).toBeVisible();
      await expect(page.getByText("Loading page…"), route).toHaveCount(0);
      await page.waitForTimeout(80);
      await expect(page.getByRole("heading", { name: "Something went wrong" }), route).toHaveCount(0);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${route} at ${width}px`).toBeLessThanOrEqual(1);
    }
    expect(crashes).toEqual([]);
  });
}

test("country selection, home, and shared navigation meet automated accessibility rules", async ({ page }) => {
  await page.goto("/select-country");
  await expect(page.getByRole("heading", { name: "Select a country" })).toBeVisible();
  let results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations.map(({ id, nodes }) => `${id}: ${nodes.map(({ target }) => target.join(" ")).join(", ")}`)).toEqual([]);

  await page.getByRole("button", { name: /Uganda Full cockpit available/ }).click();
  await expect(page.getByRole("heading", { name: "Climate evidence and planning" })).toBeVisible();
  results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations.map(({ id, nodes }) => `${id}: ${nodes.map(({ target }) => target.join(" ")).join(", ")}`)).toEqual([]);

  await page.getByRole("button", { name: "Open all tools" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations.map(({ id, nodes }) => `${id}: ${nodes.map(({ target }) => target.join(" ")).join(", ")}`)).toEqual([]);
});

test("dashboard, map, planning, and document pages meet automated accessibility rules", async ({ page }) => {
  await seedUgandaSession(page);
  for (const route of ["/dashboard", "/map", "/scenario-analysis", "/docs"]) {
    await page.goto(route);
    await expect(page.getByText("Loading page…"), route).toHaveCount(0);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations.map(({ id, nodes }) => `${id}: ${nodes.map(({ target }) => target.join(" ")).join(", ")}`), route).toEqual([]);
  }
});

test("theme, keyboard focus, and reduced motion", async ({ page }) => {
  await seedUgandaSession(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.keyboard.press("Tab");
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement as HTMLElement).outlineStyle);
  expect(outline).not.toBe("none");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  const animation = await page.evaluate(() => getComputedStyle(document.body).animationName);
  expect(animation).toBe("none");
  const darkResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(darkResults.violations.map(({ id, nodes }) => `${id}: ${nodes.map(({ target }) => target.join(" ")).join(", ")}`)).toEqual([]);
});

test("print view uses dark text, white paper, and hides navigation controls", async ({ page }) => {
  await seedUgandaSession(page);
  await page.goto("/dashboard");
  await expect(page.getByText("Loading page…")).toHaveCount(0);
  await page.emulateMedia({ media: "print" });
  const styles = await page.evaluate(() => {
    const body = getComputedStyle(document.body);
    return { background: body.backgroundColor, color: body.color };
  });
  expect(styles.background).toBe("rgb(255, 255, 255)");
  expect(styles.color).toBe("rgb(27, 31, 35)");
  for (const navigation of await page.locator("header[data-top-nav] nav").all()) {
    await expect(navigation).toBeHidden();
  }
  const pdf = await page.pdf({ format: "A4", printBackground: false });
  expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
});
