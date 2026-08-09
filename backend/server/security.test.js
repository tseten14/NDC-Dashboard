/**
 * Guards against the security holes this codebase has already had.
 *
 * Every test below corresponds to a real finding from the security audit, not a
 * hypothetical one. They exist because a fix that nothing checks is a fix that
 * quietly comes undone — someone adds a route and forgets the auth middleware,
 * or reinstates an error message that leaks the database host, and without a
 * failing test nobody notices until it matters.
 *
 * The app is started on a real port and driven over HTTP rather than by calling
 * handlers directly, because most of what is being tested — cookie attributes,
 * CORS decisions, response headers — only exists once a real request has been
 * through the whole middleware stack.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer } from "node:http";

const PASSPHRASE = "test-operator-passphrase-do-not-reuse";
const ALLOWED_ORIGIN = "http://localhost:8080";

let server;
let baseUrl;
let previousEnv;

beforeAll(async () => {
  previousEnv = {
    INGEST_API_KEY: process.env.INGEST_API_KEY,
    FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN,
    SESSION_SECRET: process.env.SESSION_SECRET,
    LOG_LEVEL: process.env.LOG_LEVEL,
    USE_MOCK_DATA: process.env.USE_MOCK_DATA,
  };
  process.env.INGEST_API_KEY = PASSPHRASE;
  process.env.FRONTEND_ORIGIN = ALLOWED_ORIGIN;
  process.env.SESSION_SECRET = "test-session-secret";
  process.env.LOG_LEVEL = "silent";
  process.env.USE_MOCK_DATA = "true";

  // Imported after the environment is set: the modules read configuration at
  // import time, so importing earlier would capture the wrong values.
  const { createApp } = await import("./createApp.js");
  const express = (await import("express")).default;
  const outer = express();
  outer.use("/api", createApp());

  server = createServer(outer);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  for (const [key, value] of Object.entries(previousEnv ?? {})) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await new Promise((resolve) => server?.close(resolve));
});

/** Endpoints that change data or expose operational detail. */
const PROTECTED_ENDPOINTS = [
  ["POST", "/api/v1/ingest/files/import"],
  ["POST", "/api/v1/ingest/clean"],
  ["POST", "/api/v1/ingest/pipeline/scan"],
  ["POST", "/api/v1/ingest/confirm"],
  ["POST", "/api/v1/ingest/upload"],
  ["POST", "/api/v1/ingest/scan"],
  ["GET", "/api/v1/ingest/jobs"],
];

describe("write authorisation", () => {
  it.each(PROTECTED_ENDPOINTS)("%s %s refuses an anonymous caller", async (method, path) => {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: method === "POST" ? { "Content-Type": "application/json" } : {},
      body: method === "POST" ? "{}" : undefined,
    });
    expect(res.status).toBe(401);
  });

  it.each(PROTECTED_ENDPOINTS)("%s %s refuses a wrong key", async (method, path) => {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { "Content-Type": "application/json", "x-api-key": "not-the-passphrase" },
      body: method === "POST" ? "{}" : undefined,
    });
    expect(res.status).toBe(401);
  });

  it("accepts the correct key for machine callers", async () => {
    const res = await fetch(`${baseUrl}/api/v1/ingest/jobs`, {
      headers: { "x-api-key": PASSPHRASE },
    });
    expect(res.status).toBe(200);
  });
});

describe("operator session", () => {
  it("rejects a wrong passphrase without revealing anything about the real one", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ALLOWED_ORIGIN },
      body: JSON.stringify({ passphrase: "wrong" }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain(PASSPHRASE);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("issues a cookie that JavaScript cannot read and other sites cannot trigger", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ALLOWED_ORIGIN },
      body: JSON.stringify({ passphrase: PASSPHRASE }),
    });
    expect(res.status).toBe(200);

    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("ndc_ops_session=");
    // The three attributes that make this safe to use as a credential.
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\/api/i);
    // The passphrase must not be recoverable from the token it issued.
    expect(cookie).not.toContain(PASSPHRASE);
  });

  it("lets a session cookie authorise a write from our own origin", async () => {
    const login = await fetch(`${baseUrl}/api/v1/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ALLOWED_ORIGIN },
      body: JSON.stringify({ passphrase: PASSPHRASE }),
    });
    const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0];

    const res = await fetch(`${baseUrl}/api/v1/ingest/jobs`, {
      headers: { Cookie: cookie, Origin: ALLOWED_ORIGIN },
    });
    expect(res.status).toBe(200);
  });

  it("blocks a cookie-authenticated write started by another website", async () => {
    const login = await fetch(`${baseUrl}/api/v1/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ALLOWED_ORIGIN },
      body: JSON.stringify({ passphrase: PASSPHRASE }),
    });
    const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0];

    // Simulates a malicious page riding a logged-in operator's browser. The
    // cookie is valid; the origin is not.
    const res = await fetch(`${baseUrl}/api/v1/ingest/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        Origin: "https://evil.example.com",
      },
      body: JSON.stringify({ jobId: "x", finalColumnMapping: {} }),
    });
    expect(res.status).toBe(403);
  });

  /**
   * The test above is satisfied by the CORS layer, which rejects the foreign
   * origin before the request reaches the route at all. That is the outer of
   * two defences, and testing only the outer one means the inner one could be
   * deleted without anything noticing. So the auth middleware is also exercised
   * on its own here, with no CORS in front of it.
   */
  it("the auth middleware itself refuses a foreign origin, independently of CORS", async () => {
    const { requireWriteApiKey } = await import("./middleware/apiKeyAuth.js");
    const { issueSessionToken } = await import("./auth/operatorSession.js");
    const token = issueSessionToken();

    const run = (origin) =>
      new Promise((resolve) => {
        const req = {
          method: "POST",
          originalUrl: "/v1/ingest/confirm",
          headers: { cookie: `ndc_ops_session=${token}`, origin },
        };
        const res = {
          statusCode: 200,
          status(code) {
            this.statusCode = code;
            return this;
          },
          json(body) {
            resolve({ status: this.statusCode, body });
            return this;
          },
        };
        requireWriteApiKey(req, res, () => resolve({ status: 200, body: null }));
      });

    expect((await run("https://evil.example.com")).status).toBe(403);
    expect((await run(ALLOWED_ORIGIN)).status).toBe(200);
  });

  it("refuses a tampered session token", async () => {
    const res = await fetch(`${baseUrl}/api/v1/ingest/jobs`, {
      headers: { Cookie: "ndc_ops_session=v1.99999999999.abc.forgedsignature" },
    });
    expect(res.status).toBe(401);
  });
});

describe("cross-origin rules", () => {
  it("does not grant access to an unlisted website", async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`, {
      headers: { Origin: "https://evil.example.com" },
    });
    // Either the request is refused outright, or it succeeds without the header
    // that would let the other site read the response. Both are safe; what must
    // never happen is echoing the attacker's origin back.
    expect(res.headers.get("access-control-allow-origin")).not.toBe("https://evil.example.com");
    expect(res.headers.get("access-control-allow-origin")).not.toBe("*");
  });

  it("grants access to the configured front end", async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`, {
      headers: { Origin: ALLOWED_ORIGIN },
    });
    expect(res.headers.get("access-control-allow-origin")).toBe(ALLOWED_ORIGIN);
  });
});

describe("response headers", () => {
  it("sets the protective headers on API responses", async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    expect(res.headers.get("content-security-policy")).toContain("default-src 'self'");
    expect(res.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(res.headers.get("permissions-policy")).toContain("geolocation=()");
    expect(res.headers.get("strict-transport-security")).toContain("max-age=");
    // Should not advertise the server software.
    expect(res.headers.get("x-powered-by")).toBeNull();
  });
});

describe("input validation", () => {
  it("does not treat an inherited property name as a valid sector", async () => {
    // `NDC_TARGETS[sector]` used to answer truthily for "constructor", letting
    // this request past the allow-list.
    for (const probe of ["constructor", "toString", "__proto__", "valueOf"]) {
      const res = await fetch(`${baseUrl}/api/v1/emissions/timeseries?sector=${probe}`);
      expect(res.status, `sector=${probe} should be rejected`).toBe(400);
    }
  });

  it("still accepts a real sector", async () => {
    const res = await fetch(`${baseUrl}/api/v1/emissions/timeseries?sector=energy`);
    expect(res.status).toBe(200);
  });

  it("rejects a body that is not valid JSON", async () => {
    const res = await fetch(`${baseUrl}/api/v1/dashboard/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not json",
    });
    expect(res.status).toBe(400);
  });

  it("rejects an oversized request body", async () => {
    const res = await fetch(`${baseUrl}/api/v1/dashboard/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context: { blob: "x".repeat(2 * 1024 * 1024) } }),
    });
    expect(res.status).toBe(413);
  });

  it("rejects an over-long AI question rather than billing for it", async () => {
    const res = await fetch(`${baseUrl}/api/v1/dashboard/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context: {}, question: "a".repeat(5000) }),
    });
    expect(res.status).toBe(400);
  });
});

describe("server-side request forgery", () => {
  it("refuses to fetch a document from an unapproved host", async () => {
    const hostile = [
      "http://169.254.169.254/latest/meta-data/", // cloud metadata service
      "https://evil.example.com/report.pdf",
      "file:///etc/passwd",
      "http://localhost:8787/api/v1/health",
    ];
    for (const contentUrl of hostile) {
      const res = await fetch(`${baseUrl}/api/v1/policy/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentUrl }),
      });
      expect(res.status, `${contentUrl} should be refused`).toBe(400);
    }
  });
});

describe("error responses", () => {
  it("returns a generic 404 rather than an HTML stack trace", async () => {
    const res = await fetch(`${baseUrl}/api/v1/definitely-not-a-route`);
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("application/json");
    const text = await res.text();
    expect(text).not.toMatch(/at \w+ \(/); // stack frame shape
    expect(text.toLowerCase()).not.toContain("node_modules");
  });

  it("never leaks filesystem paths or connection details in an error body", async () => {
    const probes = [
      "/api/v1/health/db",
      "/api/v1/emissions/timeseries?sector=energy&since=notayear",
      "/api/v1/documents/nope-not-real",
    ];
    for (const path of probes) {
      const text = await (await fetch(`${baseUrl}${path}`)).text();
      expect(text).not.toMatch(/\/Users\/|\/home\/|[A-Z]:\\\\/);
      expect(text).not.toMatch(/postgres(ql)?:\/\//);
      expect(text).not.toContain("node_modules");
    }
  });
});

describe("secrets never appear in responses", () => {
  it("keeps the operator passphrase out of every public endpoint", async () => {
    const paths = [
      "/api/health",
      "/api/v1/health",
      "/api/v1/health/full",
      "/api/v1/health/db",
      "/api/v1/ingest/health",
      "/api/v1/auth/session",
      "/api/v1/emissions/summary",
    ];
    for (const path of paths) {
      const text = await (await fetch(`${baseUrl}${path}`)).text();
      expect(text, `${path} leaked the passphrase`).not.toContain(PASSPHRASE);
      expect(text).not.toContain("test-session-secret");
    }
  });
});

describe("brute-force protection", () => {
  it("stops answering after repeated wrong passphrases", async () => {
    let sawRateLimit = false;
    // The limiter allows 10 failures per window; 15 attempts must hit it.
    for (let i = 0; i < 15; i++) {
      const res = await fetch(`${baseUrl}/api/v1/auth/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: ALLOWED_ORIGIN },
        body: JSON.stringify({ passphrase: `guess-${i}` }),
      });
      if (res.status === 429) {
        sawRateLimit = true;
        const body = await res.json();
        expect(body.retry_after_seconds).toBeGreaterThan(0);
        break;
      }
    }
    expect(sawRateLimit).toBe(true);
  });
});
