/**
 * Recognises stale lazy-loaded browser chunks after a deployment and performs one safe recovery reload.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
const RELOAD_FLAG = "ndc:chunk-reload";

export function claimChunkReload(storage: Pick<Storage, "getItem" | "setItem">): boolean {
  try {
    if (storage.getItem(RELOAD_FLAG) === "1") return false;
    storage.setItem(RELOAD_FLAG, "1");
    return true;
  } catch {
    return false;
  }
}

export function reloadOnceForStaleChunk(): boolean {
  try {
    if (!claimChunkReload(window.sessionStorage)) return false;
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}
