import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createServer } from "node:http";

let server;
let base;
beforeAll(async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("USE_MOCK_DATA", "true");
  vi.stubEnv("LOG_LEVEL", "silent");
  const { createApp } = await import("./createApp.js");
  server = createServer(createApp());
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(async () => {
  await new Promise(resolve => server?.close(resolve));
  vi.unstubAllEnvs();
});

describe("production data boundaries", () => {
  it("cannot expose a mock feed even if the deployment requests mock mode", async () => {
    expect((await (await fetch(`${base}/v1/health`)).json()).mock_mode).toBe(false);
    for (const path of ["emissions/summary", "emissions/timeseries?sector=energy", "provenance"]) {
      const response = await fetch(`${base}/v1/mock/${path}`);
      expect(response.status).toBe(404);
      expect(await response.json()).toMatchObject({ error: "not_found" });
    }
  });
});
