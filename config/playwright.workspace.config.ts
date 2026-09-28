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
  use: { baseURL: runningServerUrl ?? "http://127.0.0.1:14173", trace: "retain-on-failure", actionTimeout: 15_000, navigationTimeout: 30_000 },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // The preview build proxies /api to API_PORT (8787), so the API must run too;
  // without it the District Translator never receives its district list.
  webServer: runningServerUrl ? undefined : [
    {
      command: "npm run start:api",
      url: "http://127.0.0.1:18788/api/v1/health",
      reuseExistingServer: false,
      cwd: root,
      env: {
        API_PORT: "18788",
        USE_MOCK_DATA: "false",
        INGEST_API_KEY: "dev-ingest-key-change-me",
        FRONTEND_ORIGIN: "http://127.0.0.1:14173",
      },
    },
    {
      command: "npm run preview -- --host 127.0.0.1 --port 14173 --strictPort",
      url: "http://127.0.0.1:14173",
      reuseExistingServer: false,
      cwd: root,
      env: { API_PORT: "18788" },
    },
  ],
});
