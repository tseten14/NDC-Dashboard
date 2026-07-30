/**
 * Browser test settings.
 *
 * Configures the end-to-end tests, which drive a real browser against a running
 * copy of the app. Starts the app automatically if it is not already running,
 * with stand-in data so the tests do not depend on Climate TRACE being
 * reachable.
 *
 * Run with: npm run test:e2e
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export default defineConfig({
  testDir: path.join(root, "frontend/tests/e2e"),
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:8080",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:8080/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    cwd: root,
    env: {
      ...process.env,
      USE_MOCK_DATA: "true",
      SKIP_DEV_VERIFY: "true",
      INGEST_API_KEY: process.env.INGEST_API_KEY ?? "dev-ingest-key-change-me",
    },
  },
});
