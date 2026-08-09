/**
 * End-to-end checks that the security hardening did not break the app, and
 * that the parts a browser is responsible for actually behave.
 *
 * Some of what was changed can only be observed in a real browser: whether the
 * content security policy blocks the app's own scripts, whether the session
 * cookie survives a page reload, whether the unlock box appears before the
 * upload controls. A server-side test cannot see any of that.
 */
import { test, expect, type ConsoleMessage } from "@playwright/test";
import { seedUgandaSession, waitForApi } from "./helpers";

/** Console noise that is expected and unrelated to security. */
const IGNORED = [
  /Download the React DevTools/i,
  /\[vite\]/i,
  /React Router Future Flag/i,
];

function collectConsoleErrors(page: import("@playwright/test").Page) {
  const errors: string[] = [];
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (IGNORED.some((re) => re.test(text))) return;
    errors.push(text);
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

test.describe("security hardening does not break the app", () => {
  test("dashboard loads with no content-security-policy or CORS failures", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await seedUgandaSession(page);
    await waitForApi(page);
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("body")).toBeVisible();

    // A blocked script or refused cross-origin request shows up here. Both were
    // real risks: the CSP was newly tightened, and CORS stopped allowing every
    // origin.
    const security = errors.filter((e) =>
      /content security policy|refused to|cors|blocked by/i.test(e),
    );
    expect(security, `security-related console errors:\n${security.join("\n")}`).toHaveLength(0);
  });

  test("public data still loads without any credentials", async ({ request }) => {
    for (const path of [
      "/api/v1/health",
      "/api/v1/emissions/summary",
      "/api/v1/documents?limit=2",
      "/api/v1/policy-cases",
    ]) {
      const res = await request.get(path);
      expect(res.status(), `${path} should stay public`).toBe(200);
    }
  });

  test("import screens are hidden behind the unlock box until the passphrase is given", async ({
    page,
  }) => {
    await seedUgandaSession(page, "Admin");
    await page.goto("/ingest");
    await page.waitForLoadState("networkidle");

    const unlock = page.getByRole("heading", { name: /unlock importing/i });
    await expect(unlock).toBeVisible();

    // A wrong passphrase must not open anything.
    await page.getByLabel(/operator passphrase/i).fill("definitely-not-the-passphrase");
    await page.getByRole("button", { name: /unlock/i }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(unlock).toBeVisible();

    // The correct one does.
    await page.getByLabel(/operator passphrase/i).fill("dev-ingest-key-change-me");
    await page.getByRole("button", { name: /unlock/i }).click();
    await expect(page.getByText(/unlocked · lock now/i)).toBeVisible({ timeout: 10_000 });
    await expect(unlock).toBeHidden();
  });

  test("the unlock survives a reload but the passphrase is not stored in the page", async ({
    page,
  }) => {
    await seedUgandaSession(page, "Admin");
    await page.goto("/ingest");
    await page.getByLabel(/operator passphrase/i).fill("dev-ingest-key-change-me");
    await page.getByRole("button", { name: /unlock/i }).click();
    await expect(page.getByText(/unlocked · lock now/i)).toBeVisible({ timeout: 10_000 });

    await page.reload();
    await expect(page.getByText(/unlocked · lock now/i)).toBeVisible({ timeout: 10_000 });

    // The whole point of the redesign: page scripts must not be able to reach
    // the credential, and it must not have been squirrelled away in storage.
    const exposure = await page.evaluate(() => ({
      cookie: document.cookie,
      storage: JSON.stringify(window.localStorage) + JSON.stringify(window.sessionStorage),
    }));
    expect(exposure.cookie).not.toContain("ndc_ops_session");
    expect(exposure.cookie).not.toContain("dev-ingest-key-change-me");
    expect(exposure.storage).not.toContain("dev-ingest-key-change-me");
  });

  test("main screens each load without errors", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await seedUgandaSession(page, "Admin");

    for (const path of ["/dashboard", "/documents", "/my-work"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("body"), `${path} rendered nothing`).toBeVisible();
    }

    const fatal = errors.filter((e) => /content security policy|cors|is not a function|undefined is not/i.test(e));
    expect(fatal, `console errors:\n${fatal.join("\n")}`).toHaveLength(0);
  });
});
