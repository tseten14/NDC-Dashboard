/**
 * Caps how many requests one visitor may make.
 *
 * Protects the service, and the paid quotas behind it, from a single caller —
 * whether a runaway script or a deliberate flood — using up capacity everyone
 * else needs. The caps are not uniform, because the endpoints are not: reading a
 * cached chart costs almost nothing, while a question put to the AI assistant
 * costs real money on every single call, so those are limited far more tightly.
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

const base = {
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
};

/** 200 GET requests / 15 min per IP on /api/v1/* */
export const readRateLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: 200,
  skip: (req) => req.method !== "GET",
});

/**
 * Backstop for every state-changing request.
 *
 * Previously only the import routes were capped, which left the AI and forecast
 * endpoints with no limit at all. This covers anything that is not a GET, so a
 * route added later is protected before anyone remembers to think about it.
 */
export const writeRateLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: 60,
  skip: (req) => req.method === "GET" || req.method === "OPTIONS",
});

/** 20 requests / 15 min per IP on /api/v1/ingest/* write routes */
export const ingestWriteRateLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: 20,
  skip: (req) => req.method === "GET",
});

/**
 * AI endpoints, capped hard.
 *
 * Every call that misses the cache is a paid request to OpenAI, and the question
 * text is part of the cache key — so a caller who varies the wording slightly
 * each time bypasses the cache entirely and bills the account on every request.
 * This is the limit that stops an open dashboard becoming an open wallet.
 */
export const aiRateLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: 20,
  skip: (req) => req.method !== "POST",
});

/** Forecast/modelling endpoints: cheap per call, but unbounded loops if hammered. */
export const computeRateLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: 60,
  skip: (req) => req.method !== "POST",
});

/**
 * Passphrase attempts.
 *
 * Ten tries per address per fifteen minutes turns an online guessing attack into
 * something that would take longer than the passphrase's useful life. Successful
 * unlocks are not counted, so a legitimate operator who reconnects repeatedly is
 * never locked out by their own activity.
 */
export const authAttemptRateLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
});

/** 50 client error reports / hour per IP */
export const clientErrorsRateLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  max: 50,
});
