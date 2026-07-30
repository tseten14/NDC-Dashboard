/**
 * Caps how many requests one visitor may make.
 *
 * Protects the service, and the Climate TRACE quota behind it, from a single
 * caller — whether a runaway script or a deliberate flood — using up capacity
 * everyone else needs. Reading is allowed generously; importing data is capped
 * much more tightly, since each import writes to storage.
 *
 * Callers are told when to come back: an over-limit response carries a
 * retry_after_seconds field rather than just failing.
 *
 * Note: these limits are per visitor only because the app declares how many
 * proxies sit in front of it — see the "trust proxy" setting in createApp.js.
 * Without that, every visitor would be counted as one.
 */
import rateLimit from "express-rate-limit";

function rateLimitHandler(req, res, _next, options) {
  const resetTime = req.rateLimit?.resetTime ?? Date.now() + options.windowMs;
  const retry_after_seconds = Math.max(1, Math.ceil((resetTime - Date.now()) / 1000));
  res.status(429).json({ error: "rate_limited", retry_after_seconds });
}

/** 200 GET requests / 15 min per IP on /api/v1/* */
export const readRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method !== "GET",
  handler: rateLimitHandler,
});

/** 20 requests / 15 min per IP on /api/v1/ingest/* write routes */
export const ingestWriteRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "GET",
  handler: rateLimitHandler,
});

/** 50 client error reports / hour per IP */
export const clientErrorsRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});
