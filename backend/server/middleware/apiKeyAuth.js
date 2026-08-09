/**
 * The gate in front of every endpoint that changes stored data.
 *
 * Reading from this API is open to anyone — the emissions figures and policy
 * documents it serves are public. Writing is not: an import can overwrite the
 * numbers the dashboard reports, so it has to be proven to come from an
 * authorised operator.
 *
 * Two ways of proving it are accepted, because there are two kinds of caller:
 *
 *   A person using the import screen sends a session cookie, obtained by typing
 *   the operator passphrase into the unlock box. The passphrase itself never
 *   reaches the browser, so it cannot be read out of the page.
 *
 *   A script or scheduled job sends the passphrase directly in an x-api-key
 *   header. There is no browser involved, so there is nothing to leak.
 *
 * Cookie-authenticated requests get one extra check. Browsers attach cookies
 * automatically, so without it another website could quietly make a logged-in
 * operator's browser perform an import. Requiring the request to declare that it
 * came from this app's own pages closes that.
 */
import { logger } from "../logger.js";
import { SESSION_COOKIE, configuredWriteKey, readCookie, safeCompare, verifySessionToken } from "../auth/operatorSession.js";
import { isAllowedOrigin } from "./allowedOrigins.js";

/**
 * Confirm a state-changing request was started by one of our own pages.
 *
 * Origin is set by the browser and cannot be forged by page scripts. When it is
 * absent (some same-origin form posts, and every non-browser client) we fall
 * back to Referer, and failing that accept the request — a caller with no
 * browser context is not the cross-site scenario this guards against, and it
 * still had to present valid credentials to get here.
 */
function isSameSiteRequest(req) {
  const origin = req.headers.origin;
  if (origin) return isAllowedOrigin(origin);

  const referer = req.headers.referer;
  if (referer) {
    try {
      return isAllowedOrigin(new URL(referer).origin);
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * Require operator authority. Attaches req.writeAuth describing how the caller
 * proved it, so route handlers and audit logs can tell a human import from an
 * automated one.
 */
export function requireWriteApiKey(req, res, next) {
  const expected = configuredWriteKey();
  if (!expected) {
    // Failing closed matters more than availability here: with no passphrase
    // configured there is nothing to check, and letting writes through would
    // leave the import endpoints open to anyone who found them.
    logger.error({ event: "auth_misconfigured" }, "INGEST_API_KEY is not set — write endpoints disabled");
    return res.status(503).json({ error: "write_endpoints_unavailable" });
  }

  const sessionToken = readCookie(req.headers.cookie, SESSION_COOKIE);
  if (sessionToken && verifySessionToken(sessionToken)) {
    if (!isSameSiteRequest(req)) {
      req.log?.warn({ event: "csrf_blocked", origin: req.headers.origin ?? null }, "cross-site write rejected");
      return res.status(403).json({ error: "cross_site_request_blocked" });
    }
    req.writeAuth = { method: "session" };
    return next();
  }

  const provided = req.headers["x-api-key"];
  if (typeof provided === "string" && safeCompare(provided, expected)) {
    req.writeAuth = { method: "api_key" };
    return next();
  }

  req.log?.warn({ event: "write_auth_failed", path: req.originalUrl }, "unauthorized write attempt");
  return res.status(401).json({ error: "unauthorized" });
}

/** True when the caller already holds a valid operator session. */
export function hasOperatorSession(req) {
  const token = readCookie(req.headers.cookie, SESSION_COOKIE);
  return Boolean(token && verifySessionToken(token));
}
