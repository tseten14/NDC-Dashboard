/**
 * Ingest confirm integration test (HTTP).
 * Stages parsed rows in memory, then POST /ingest/confirm.
 * Full persistence requires DATABASE_URL; otherwise validates mapping and response shape.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { createApp } from "../server/createApp.js";
import { bootstrapDatabase } from "../db/bootstrap.ts";
import { mapRowsToObservations } from "../lib/ingest/confirmRows.ts";
import { resolveTargetId } from "../db/id.ts";
import { parseCsvText } from "../lib/ingest/parsers/csv.ts";
import { suggestColumnMapping } from "../lib/ingest/mapper.ts";
import { createUploadJob } from "../services/ingestUploadStore.js";

const API_KEY = "test-ingest-integration-key";
const CSV = `year,value,source,target_id
2022,16.5,Integration test,t2
2023,17.2,Integration test,t2
`;

let server;
let baseUrl;

beforeAll(async () => {
  process.env.INGEST_API_KEY = API_KEY;
  process.env.USE_MOCK_DATA = "true";
  if (!process.env.DATABASE_URL) {
    process.env.USE_DB_FALLBACK = "true";
  }
  await bootstrapDatabase();

  const app = express();
  app.use(createApp());
  server = createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}/v1`;
});

afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

describe("ingest confirm flow", () => {
  it("maps CSV rows to forest-cover target observations", () => {
    const rows = [
      { year: "2022", value: "16.5", source: "Test", target_id: "t2" },
      { year: "2023", value: "17.2", source: "Test", target_id: "t2" },
    ];
    const { observations, errors } = mapRowsToObservations(
      rows,
      { year: "year", value: "value", source: "source", target_id: "target_id" },
      resolveTargetId,
    );
    expect(errors).toHaveLength(0);
    expect(observations).toHaveLength(2);
    expect(observations[0].targetId).toBe(resolveTargetId("t2"));
  });

  it("staged upload → confirm returns target keys and dashboard hint", async () => {
    const parsed = parseCsvText(CSV);
    const columnMapping = suggestColumnMapping(parsed.headers);
    const jobId = randomUUID();
    createUploadJob({
      jobId,
      filename: "indicator-import.csv",
      fileType: "csv",
      parseResult: parsed,
      columnMapping,
      warnings: [],
    });

    const confirmRes = await fetch(`${baseUrl}/ingest/confirm`, {
      method: "POST",
      headers: {
        "x-api-key": API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jobId,
        finalColumnMapping: columnMapping,
      }),
    });
    expect(confirmRes.ok).toBe(true);
    const confirm = await confirmRes.json();
    expect(confirm.status).toBe("complete");
    expect(confirm.targetKeys).toContain("t2");
    expect(confirm.dashboardHint).toMatch(/Dashboard/i);

    if (confirm.persisted && confirm.rowsImported > 0) {
      const obsRes = await fetch(`${baseUrl}/targets/t2/observations`);
      expect(obsRes.ok).toBe(true);
      const obs = await obsRes.json();
      expect(obs.count).toBeGreaterThan(0);
    }
  });
});
