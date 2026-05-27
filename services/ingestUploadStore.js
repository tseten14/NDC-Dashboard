import { randomUUID } from "node:crypto";

/** In-memory staging for upload → confirm flow (TTL 2 hours). */
const jobs = new Map();
const jobHistory = new Map();
const TTL_MS = 2 * 60 * 60 * 1000;

function purgeExpired() {
  const now = Date.now();
  for (const [id, job] of jobs.entries()) {
    if (now - job.createdAtMs > TTL_MS) jobs.delete(id);
  }
}

export function createUploadJob(payload) {
  purgeExpired();
  const jobId = payload.jobId ?? randomUUID();
  const record = {
    jobId,
    createdAtMs: Date.now(),
    ...payload,
  };
  jobs.set(jobId, record);
  return record;
}

export function getUploadJob(jobId) {
  purgeExpired();
  return jobs.get(jobId) ?? null;
}

export function deleteUploadJob(jobId) {
  jobs.delete(jobId);
}

export function upsertMemoryIngestJob(entry) {
  jobHistory.set(entry.id, entry);
}

export function getMemoryIngestJobs(limit = 10) {
  return [...jobHistory.values()]
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, limit);
}
