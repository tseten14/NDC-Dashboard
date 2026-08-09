/**
 * Checks that an uploaded file really is what it claims to be.
 *
 * A file named "data.csv" can contain anything at all. This inspects the actual
 * contents to identify the true format and rejects the upload if it is not one
 * the importer supports. Trusting the file extension alone would let someone
 * upload an executable disguised as a spreadsheet.
 */
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

/**
 * Content check for the multi-file scan endpoint, which also accepts .txt.
 *
 * Text formats — CSV, JSON, plain text — have no magic bytes, so there is
 * nothing to sniff and the extension is all there is to go on. What can be
 * checked is that they are not something else in disguise: if the sniffer
 * recognises a real binary format (an executable, an archive, an image) then
 * whatever the name says, this is not a spreadsheet and must not reach a parser.
 *
 * @returns {Promise<{ ok: true } | { ok: false, reason: string }>}
 */
export async function validateScanContent(buffer, extension) {
  const detected = await fileTypeFromBuffer(buffer);

  if (extension === "pdf") {
    if (detected?.mime !== "application/pdf") {
      return { ok: false, reason: "File is named .pdf but its contents are not a PDF." };
    }
    return { ok: true };
  }

  if (!detected) return { ok: true };
  if (ALLOWED_MIMES.has(detected.mime)) return { ok: true };
  return {
    ok: false,
    reason: `File contents are ${detected.mime}, which this scanner does not accept.`,
  };
}

export { ALLOWED_MIMES };
