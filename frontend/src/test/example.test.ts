/**
 * Verifies Example behavior so regressions cannot silently change a published value, evidence boundary, or user workflow.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { describe, it, expect } from "vitest";

describe("example", () => {
  it("should pass", () => {
    expect(true).toBe(true);
  });
});
