/**
 * Short-term holding area for files being imported.
 *
 * When someone uploads a spreadsheet, the app does not save it straight away.
 * It first parses the file and keeps the result here, in memory, so the user can
 * review how columns were interpreted and correct any mistakes. Only when they
 * confirm does the data get written for real.
 *
 * Because this lives in memory, anything not confirmed is discarded when the
 * server restarts — which is the intended behaviour for an unfinished import.
 */
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

export function setUploadJobCleaned(jobId, pipelineResult) {
  const job = getUploadJob(jobId);
  if (!job) return null;
  job.pipelineResult = pipelineResult;
  job.cleanedAtMs = Date.now();
  jobs.set(jobId, job);
  return job;
}

export function upsertMemoryIngestJob(entry) {
  jobHistory.set(entry.id, entry);
}

export function getMemoryIngestJobs(limit = 10) {
  return [...jobHistory.values()]
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, limit);
}
