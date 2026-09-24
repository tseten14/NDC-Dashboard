import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
// Set this to exercise a running development server as well as the preview build.
const runningServerUrl = process.env.NDC_UX_BASE_URL;

export default defineConfig({
  testDir: "../frontend/tests/e2e",
  testMatch: ["workspace-ux.spec.ts", "sector-classification.spec.ts", "scenario-analysis.spec.ts"],
  outputDir: "../test-results",
  timeout: 120_000,
  workers: 1,
  use: { baseURL: runningServerUrl ?? "http://127.0.0.1:4173", trace: "retain-on-failure", actionTimeout: 15_000, navigationTimeout: 30_000 },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: runningServerUrl ? undefined : {
    command: "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    cwd: root,
  },
});
