import { fileTypeFromBuffer } from "file-type";

const ALLOWED_MIMES = new Set(["application/pdf", "text/csv", "application/json"]);

function extOf(name) {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

/**
 * MIME-sniff upload buffer; fall back to extension for text formats without magic bytes.
 * @returns {{ ok: true, mime: string } | { ok: false, reason: string }}
 */
export async function validateUploadMime(buffer, filename) {
  const detected = await fileTypeFromBuffer(buffer);

  if (detected) {
    if (!ALLOWED_MIMES.has(detected.mime)) {
      return { ok: false, reason: `Unsupported file content type: ${detected.mime}` };
    }
    return { ok: true, mime: detected.mime };
  }

  const ext = extOf(filename);
  if (ext === "csv") return { ok: true, mime: "text/csv" };
  if (ext === "json") return { ok: true, mime: "application/json" };
  if (ext === "pdf") {
    return { ok: false, reason: "Could not verify PDF content (invalid or empty file)" };
  }

  return { ok: false, reason: "Could not determine file type from content" };
}

export { ALLOWED_MIMES };
