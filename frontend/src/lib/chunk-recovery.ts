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
