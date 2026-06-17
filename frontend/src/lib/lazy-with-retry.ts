import { lazy } from "react";
import type { ComponentType, LazyExoticComponent } from "react";

/**
 * Drop-in replacement for React.lazy that survives stale-chunk failures.
 *
 * Vite emits content-hashed chunks (e.g. MapExplorer-BdTnozeq.js). When a new
 * version is deployed, a browser still running the previous index.html requests
 * chunk hashes that no longer exist on the server, and the dynamic import
 * rejects with "Failed to fetch dynamically imported module" — white-screening
 * the route. (The ErrorBoundary's "Try again" can't help: re-rendering re-runs
 * the same dead import.)
 *
 * Strategy: retry once for a transient network blip, then — if it still looks
 * like a chunk-load error — force a single full reload to pull the fresh
 * index.html. A sessionStorage guard prevents a reload loop if the asset is
 * genuinely missing.
 */
const RELOAD_FLAG = "ndc:chunk-reload";

export function isChunkLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return (
    /failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /importing a module script failed/i.test(msg) ||
    /dynamically imported module/i.test(msg) ||
    // A 404 fallback serves index.html (text/html) where JS was expected.
    /expected a javascript.*module|mime type.*text\/html/i.test(msg)
  );
}

function clearReloadGuard() {
  try {
    window.sessionStorage?.removeItem(RELOAD_FLAG);
  } catch {
    /* sessionStorage unavailable (private mode / SSR) — ignore */
  }
}

function reloadOnceForStaleChunk(): boolean {
  try {
    if (window.sessionStorage?.getItem(RELOAD_FLAG) === "1") return false;
    window.sessionStorage?.setItem(RELOAD_FLAG, "1");
  } catch {
    // No sessionStorage → fall through and reload anyway (best effort, once).
  }
  window.location.reload();
  return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const mod = await factory();
      clearReloadGuard(); // import succeeded → reset guard for next navigation
      return mod;
    } catch (firstErr) {
      // One transient retry before deciding it's a stale/missing chunk.
      try {
        await new Promise((r) => setTimeout(r, 400));
        const mod = await factory();
        clearReloadGuard();
        return mod;
      } catch (secondErr) {
        if (isChunkLoadError(secondErr) && reloadOnceForStaleChunk()) {
          // Keep the Suspense fallback up while the page reloads.
          return new Promise<{ default: T }>(() => {});
        }
        throw secondErr;
      }
    }
  });
}
