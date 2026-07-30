/**
 * Password check for the endpoints that change data.
 *
 * Anyone may read from this API, but writing to it — importing figures, in
 * practice — requires a shared secret sent in the x-api-key header. This is
 * what stops a stranger from posting made-up emissions data into the system.
 *
 * Read requests (GET) pass through untouched; everything else must present the
 * key or is rejected.
 */
import { logger } from "../logger.js";

/**
 * Shared-secret auth for write endpoints. Requires INGEST_API_KEY in x-api-key header.
 */
export function requireWriteApiKey(req, res, next) {
  const expected = process.env.INGEST_API_KEY?.trim();
  if (!expected) {
    logger.error({ event: "auth_misconfigured" }, "INGEST_API_KEY is not set");
    return res.status(503).json({ error: "write endpoints unavailable" });
  }

  const provided = req.headers["x-api-key"];
  if (!provided || provided !== expected) {
    return res.status(401).json({ error: "unauthorized" });
  }
  return next();
}

/** Apply write auth to non-GET methods on a router. */
export function writeAuthUnlessGet(req, res, next) {
  if (req.method === "GET") return next();
  return requireWriteApiKey(req, res, next);
}
