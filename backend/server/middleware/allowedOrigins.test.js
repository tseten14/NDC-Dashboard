/**
 * Verifies Allowed Origins behavior so regressions cannot silently change a published value, evidence boundary, or user workflow.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { allowedOrigins, isAllowedOrigin } from "./allowedOrigins.js";

beforeEach(() => {
  for (const name of ["FRONTEND_ORIGIN", "VERCEL", "VERCEL_URL", "VERCEL_BRANCH_URL", "VERCEL_PROJECT_PRODUCTION_URL"]) vi.stubEnv(name, undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe("origin allowlist", () => {
  it("does not silently allow localhost in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(allowedOrigins()).toEqual([]);
    expect(isAllowedOrigin("http://localhost:8080")).toBe(false);
  });
  it("only trusts the exact Vercel deployment, even without NODE_ENV", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_URL", "ndc-preview.vercel.app");
    expect(allowedOrigins()).toEqual(["https://ndc-preview.vercel.app"]);
    expect(isAllowedOrigin("https://ndc-preview.vercel.app.evil.example")).toBe(false);
    expect(isAllowedOrigin("null")).toBe(false);
  });
  it("normalizes valid origins and refuses paths, credentials, and wildcards", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("FRONTEND_ORIGIN", "https://EXAMPLE.org/, *, null, https://user:pass@example.net, https://example.net/path, https://example.net/?query=1, javascript:alert(1)");
    expect(allowedOrigins()).toEqual(["https://example.org"]);
    expect(isAllowedOrigin("https://example.org/")).toBe(true);
    expect(isAllowedOrigin("https://example.org/path")).toBe(false);
  });
  it("preserves loopback development and preview access", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(isAllowedOrigin("http://127.0.0.1:4173")).toBe(true);
    expect(isAllowedOrigin("http://localhost:8080")).toBe(true);
    expect(isAllowedOrigin("http://untrusted.example:8080")).toBe(false);
  });
});
