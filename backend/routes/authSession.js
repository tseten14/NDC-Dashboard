/**
 * Unlocking and locking the import screens.
 *
 * The import screens can overwrite the figures the dashboard reports, so they
 * are held behind an operator passphrase. This is where that passphrase is
 * exchanged, once, for a short-lived pass held in a cookie the page's own
 * JavaScript cannot read — see backend/server/auth/operatorSession.js for why
 * that indirection exists.
 *
 * Guessing is made impractical rather than merely discouraged: attempts are
 * capped per address, the passphrase is compared in constant time, and a wrong
 * answer is met with the same flat "incorrect" every time, so nothing about the
 * real value can be inferred from the reply.
 *
 * Endpoints:
 *   GET    /auth/session — is this browser currently unlocked?
 *   POST   /auth/session — exchange the passphrase for a pass
 *   DELETE /auth/session — lock again
 */
import express from "express";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  configuredWriteKey,
  issueSessionToken,
  safeCompare,
  sessionCookieOptions,
} from "../server/auth/operatorSession.js";
import { hasOperatorSession } from "../server/middleware/apiKeyAuth.js";
import { authAttemptRateLimiter } from "../server/middleware/rateLimit.js";

const router = express.Router();

router.get("/auth/session", (req, res) => {
  return res.json({
    authenticated: hasOperatorSession(req),
    // Lets the unlock box explain "ask an administrator to configure this"
    // rather than silently rejecting every passphrase on a misconfigured server.
    configured: Boolean(configuredWriteKey()),
  });
});

router.post("/auth/session", authAttemptRateLimiter, (req, res) => {
  const expected = configuredWriteKey();
  if (!expected) {
    return res.status(503).json({ error: "write_endpoints_unavailable" });
  }

  const passphrase = req.body?.passphrase;
  // Bound the input before hashing it: without this a caller could post a
  // multi-megabyte string on every attempt purely to burn server time.
  if (typeof passphrase !== "string" || passphrase.length === 0 || passphrase.length > 512) {
    return res.status(400).json({ error: "passphrase_required" });
  }

  if (!safeCompare(passphrase, expected)) {
    req.log?.warn({ event: "operator_unlock_failed" }, "operator unlock rejected");
    return res.status(401).json({ error: "invalid_passphrase" });
  }

  const token = issueSessionToken();
  if (!token) {
    return res.status(503).json({ error: "write_endpoints_unavailable" });
  }

  res.cookie(SESSION_COOKIE, token, sessionCookieOptions(req));
  req.log?.info({ event: "operator_unlock_succeeded" }, "operator session issued");
  return res.json({ authenticated: true, expires_in_seconds: SESSION_TTL_SECONDS });
});

router.delete("/auth/session", (req, res) => {
  res.clearCookie(SESSION_COOKIE, { ...sessionCookieOptions(req), maxAge: undefined });
  return res.json({ authenticated: false });
});

export default router;
