import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig({
  testDir: "../frontend/tests/e2e",
  testMatch: "workspace-ux.spec.ts",
  outputDir: "../test-results",
  timeout: 120_000,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:4173", trace: "retain-on-failure", actionTimeout: 15_000, navigationTimeout: 30_000 },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    cwd: root,
  },
});
