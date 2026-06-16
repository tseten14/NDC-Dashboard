/**
 * Browser record of files uploaded through the Data Ingestion pipeline, shown
 * on the Settings tab. Mirrors the localStorage approach used by the activities
 * store; the server-side `ingest_jobs` table is the source of truth when a
 * database is configured.
 */

const STORAGE_KEY = "uganda-ndc-uploads-v1";

export type UploadStatus = "scanned" | "uploaded" | "imported";

export interface UploadedFile {
  id: string;
  name: string;
  ext: string; // "csv" | "json" | "pdf" | ...
  size: number; // bytes
  rows: number | null;
  status: UploadStatus;
  uploadedAt: string; // ISO
}

function read(): UploadedFile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as UploadedFile[]) : [];
  } catch {
    return [];
  }
}

function write(list: UploadedFile[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    // Let same-tab listeners (e.g. the Settings page) refresh.
    window.dispatchEvent(new Event("uploads-changed"));
  } catch {
    /* storage full / unavailable — non-fatal */
  }
}

/** Record (or de-duplicate by name+size) an uploaded file. Newest first. */
export function recordUpload(input: {
  name: string;
  ext: string;
  size: number;
  rows?: number | null;
  status?: UploadStatus;
}): UploadedFile {
  const list = read();
  const entry: UploadedFile = {
    id: crypto.randomUUID(),
    name: input.name,
    ext: input.ext.replace(/^\./, "").toLowerCase(),
    size: input.size,
    rows: input.rows ?? null,
    status: input.status ?? "uploaded",
    uploadedAt: new Date().toISOString(),
  };
  // Replace an existing record for the same file (latest status wins).
  const deduped = list.filter((u) => !(u.name === entry.name && u.size === entry.size));
  const next = [entry, ...deduped].slice(0, 200);
  write(next);
  return entry;
}

export function listUploads(): UploadedFile[] {
  return read().sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export function clearUploads(): void {
  write([]);
}
