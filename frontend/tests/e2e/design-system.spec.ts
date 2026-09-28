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
  "/page-that-does-not-exist",
];

for (const viewport of [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1280, height: 600 },
  { width: 1920, height: 1200 },
]) {
  test(`country page keeps its footer below content at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/select-country");
    await expect(page.getByRole("heading", { name: "Select a country" })).toBeVisible();
    for (const query of ["", "No matching country"]) {
      await page.getByLabel("Search countries").fill(query);
      const layout = await page.evaluate(() => {
        const header = document.querySelector("header")!.getBoundingClientRect();
        const main = document.querySelector("main")!.getBoundingClientRect();
        const footer = document.querySelector("[data-app-footer]")!.getBoundingClientRect();
        const options = document.querySelector('[aria-label="Country options"]')!.getBoundingClientRect();
        const headerContent = document.querySelector("header > div")!.getBoundingClientRect();
        const footerContent = document.querySelector("[data-app-footer] > div")!.getBoundingClientRect();
        return {
          headerBottom: header.bottom, mainTop: main.top, mainBottom: main.bottom,
          footerTop: footer.top, footerBottom: footer.bottom + scrollY, optionsBottom: options.bottom,
          pageBottom: document.documentElement.scrollHeight,
          overflow: document.documentElement.scrollWidth - innerWidth,
          headerLeft: headerContent.left, footerLeft: footerContent.left, mainLeft: main.left,
        };
      });
      expect(layout.overflow).toBeLessThanOrEqual(1);
      expect(layout.mainTop).toBeCloseTo(layout.headerBottom, 0);
      expect(layout.footerTop).toBeCloseTo(layout.mainBottom, 0);
      expect(layout.footerTop - layout.optionsBottom).toBeGreaterThanOrEqual(31);
      expect(Math.abs(layout.footerBottom - Math.max(viewport.height, layout.pageBottom))).toBeLessThanOrEqual(1);
      expect(layout.footerLeft).toBeCloseTo(layout.mainLeft, 0);
      expect(layout.headerLeft).toBeCloseTo(layout.mainLeft, 0);
    }
  });
}

for (const width of [320, 390, 768, 1280, 1920]) {
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
    const layoutProblems: string[] = [];
    page.on("pageerror", (error) => crashes.push(error.message));
    for (const route of routes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.locator("#main-content"), route).toBeVisible();
      await expect(page.getByText("Loading page…"), route).toHaveCount(0);
      await page.waitForTimeout(80);
      await expect(page.getByRole("heading", { name: "Something went wrong" }), route).toHaveCount(0);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${route} at ${width}px`).toBeLessThanOrEqual(1);
      const layout = await page.evaluate(() => {
        const main = document.querySelector<HTMLElement>("#main-content")!;
        const header = document.querySelector("header[data-top-nav]")!.getBoundingClientRect();
        const footer = document.querySelector("[data-app-footer]")!.getBoundingClientRect();
        const content = main.getBoundingClientRect();
        const clippedScrollAreas = Array.from(main.querySelectorAll<HTMLElement>("[data-radix-scroll-area-viewport]"))
          .filter((area) => area.clientWidth > 0 && area.scrollWidth > area.clientWidth + 1 && getComputedStyle(area).overflowX === "hidden")
          .map((area) => `${area.scrollWidth}px content in ${area.clientWidth}px scroll area`);
        return {
          headerBottom: header.bottom, mainTop: content.top, mainBottom: content.bottom,
          footerTop: footer.top, footerBottom: footer.bottom,
          mainOverflow: main.scrollWidth - main.clientWidth, clippedScrollAreas,
        };
      });
      expect(layout.mainTop, route).toBeCloseTo(layout.headerBottom, 0);
      expect(layout.mainBottom, route).toBeCloseTo(layout.footerTop, 0);
      expect(layout.footerBottom, route).toBeCloseTo(900, 0);
      if (layout.mainOverflow > 1) layoutProblems.push(`${route}: main overflows by ${layout.mainOverflow}px`);
      layoutProblems.push(...layout.clippedScrollAreas.map((issue) => `${route}: ${issue}`));
    }
    expect(crashes).toEqual([]);
    expect(layoutProblems).toEqual([]);
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

test("saved dark preferences and system dark mode still use the light interface", async ({ page }) => {
  await seedUgandaSession(page);
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.keyboard.press("Tab");
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement as HTMLElement).outlineStyle);
  expect(outline).not.toBe("none");
  await expect(page.getByRole("button", { name: /Switch to .* mode/ })).toHaveCount(0);
  await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  const animation = await page.evaluate(() => getComputedStyle(document.body).animationName);
  expect(animation).toBe("none");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations.map(({ id, nodes }) => `${id}: ${nodes.map(({ target }) => target.join(" ")).join(", ")}`)).toEqual([]);
});

test("short phone layouts keep content reachable and scrolling controls above the footer", async ({ page }) => {
  await seedUgandaSession(page);
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto("/");
  const guide = page.getByRole("link", { name: "Read the guide", exact: true });
  await guide.scrollIntoViewIfNeeded();
  await expect(guide).toBeInViewport();
  const backToTop = page.getByRole("button", { name: "Scroll back to top" });
  await expect(backToTop).toBeVisible();
  const footer = await page.locator("[data-app-footer]").boundingBox();
  const button = await backToTop.boundingBox();
  expect(button!.y + button!.height).toBeLessThanOrEqual(footer!.y - 15);
  await backToTop.click();
  await expect(page.getByRole("heading", { name: "Climate evidence and planning" })).toBeInViewport();

  await page.goto("/financial-flow");
  const table = page.getByRole("region", { name: "Project financial flows" });
  await table.scrollIntoViewIfNeeded();
  await table.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => table.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);

  await page.goto("/indicators");
  const details = page.getByRole("heading", { name: /Driven by/ });
  await details.scrollIntoViewIfNeeded();
  await expect(details).toBeInViewport();
  const detailsBox = await details.boundingBox();
  expect(detailsBox!.y + detailsBox!.height).toBeLessThanOrEqual(footer!.y);

  await page.goto("/page-that-does-not-exist");
  await expect(page.getByRole("link", { name: "Return to Home" })).toBeInViewport();
  const unnecessaryScroll = await page.locator("#main-content").evaluate((main) => main.scrollHeight - main.clientHeight);
  expect(unnecessaryScroll).toBeLessThanOrEqual(1);
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
