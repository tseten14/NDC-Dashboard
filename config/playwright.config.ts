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
  testIgnore: ["workspace-ux.spec.ts", "sector-classification.spec.ts"],
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:18080",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "npm run start:api",
      url: "http://127.0.0.1:18787/api/health",
      reuseExistingServer: false,
      timeout: 240_000,
      cwd: root,
      env: {
        API_PORT: "18787",
        USE_MOCK_DATA: "true",
        INGEST_API_KEY: "dev-ingest-key-change-me",
        FRONTEND_ORIGIN: "http://127.0.0.1:18080",
      },
    },
    {
      command: "npm run dev:frontend -- --host 127.0.0.1 --port 18080 --strictPort",
      url: "http://127.0.0.1:18080/api/health",
      reuseExistingServer: false,
      timeout: 240_000,
      cwd: root,
      env: {
        API_PORT: "18787",
        VITE_API_BASE_URL: "http://127.0.0.1:18080",
      },
    },
  ],
});
