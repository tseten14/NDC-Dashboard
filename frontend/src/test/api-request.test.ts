/** Verifies slow reads terminate and obsolete requests cancel without losing their cancellation reason. */
import { afterEach, expect, it, vi } from "vitest";
import { readJson } from "@/lib/api-request";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

function pending(signal: AbortSignal) {
  return new Promise<never>((_, reject) => {
    if (signal.aborted) reject(signal.reason);
    else signal.addEventListener("abort", () => reject(signal.reason), { once: true });
  });
}

it("times out while the response body is pending, not just while waiting for headers", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn(async (_url, init) => ({ ok: true, json: () => pending(init.signal) })));
  const request = readJson("/slow", {}, 100);
  const assertion = expect(request).rejects.toThrow("timed out");
  await vi.advanceTimersByTimeAsync(100);
  await assertion;
  expect(vi.getTimerCount()).toBe(0);
});

it("forwards caller cancellation and releases its deadline", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn((_url, init) => pending(init.signal)));
  const caller = new AbortController();
  const request = readJson("/obsolete", { signal: caller.signal });
  const reason = new DOMException("Selection changed", "AbortError");
  caller.abort(reason);
  await expect(request).rejects.toBe(reason);
  expect(vi.getTimerCount()).toBe(0);
});

it("clears the timer after a successful request", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ value: 12 }) })));
  await expect(readJson("/ready")).resolves.toEqual({ value: 12 });
  expect(vi.getTimerCount()).toBe(0);
});
