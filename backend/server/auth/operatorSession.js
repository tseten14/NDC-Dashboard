/**
 * Proof that someone is allowed to change data, in a form the browser cannot leak.
 *
 * The problem this solves: the write endpoints used to be guarded by a shared
 * password that the browser had to send on every import. To do that, the password
 * had to be compiled into the JavaScript the app ships to every visitor — so the
 * "secret" was readable by anyone who opened the page source. The guard existed
 * but protected nothing.
 *
 * The fix is to never give the browser the password. An operator types it once
 * into the unlock box; the server checks it and hands back a short-lived signed
 * pass, stored in a cookie the page's own JavaScript is forbidden to read. The
 * pass proves "this person knew the password recently" without ever revealing it,
 * and it expires on its own, so a copied cookie stops working within hours.
 *
 * The pass is signed rather than stored. A signature the server can verify but
 * nobody else can forge means no session table is needed, which matters because
 * the API runs as short-lived serverless functions with no shared memory.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** Cookie name for the operator pass. */
export const SESSION_COOKIE = "ndc_ops_session";

/** How long an unlock lasts before the operator must re-enter the passphrase. */
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

/**
 * Compare two strings without leaking which character differed.
 *
 * A plain `a === b` returns as soon as it finds a mismatch, so the time it takes
 * reveals how much of the guess was right. Repeated over many guesses that is
 * enough to reconstruct a secret one character at a time. Hashing both sides
 * first also keeps the comparison length-independent.
 */
export function safeCompare(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ha = createHmac("sha256", "compare").update(a).digest();
  const hb = createHmac("sha256", "compare").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** The passphrase an operator types, and machines send as x-api-key. */
export function configuredWriteKey() {
  const key = process.env.INGEST_API_KEY?.trim();
  return key || null;
}

/**
 * Key used to sign passes.
 *
 * A dedicated SESSION_SECRET is preferred. Where one is not configured we derive
 * a stable key from the write passphrase instead of refusing to start, so
 * existing deployments keep working after an upgrade. Deriving rather than
 * reusing the passphrase directly means a signed pass never contains material
 * that could be replayed as the passphrase itself.
 */
function signingKey() {
  const explicit = process.env.SESSION_SECRET?.trim();
  if (explicit) return explicit;
  const fallback = configuredWriteKey();
  if (!fallback) return null;
  return createHmac("sha256", "ndc-explorer/session-derivation").update(fallback).digest("hex");
}

function sign(payload, key) {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

/**
 * Mint a pass valid for SESSION_TTL_SECONDS.
 * Format: v1.<expiry seconds>.<nonce>.<signature over the first three parts>
 */
export function issueSessionToken(now = Date.now()) {
  const key = signingKey();
  if (!key) return null;
  const expiresAt = Math.floor(now / 1000) + SESSION_TTL_SECONDS;
  const nonce = randomBytes(12).toString("base64url");
  const payload = `v1.${expiresAt}.${nonce}`;
  return `${payload}.${sign(payload, key)}`;
}

/**
 * Check a pass. Returns false for anything tampered with, expired, or signed
 * with a different key — which is what makes rotating INGEST_API_KEY (or
 * SESSION_SECRET) instantly invalidate every pass already handed out.
 */
export function verifySessionToken(token, now = Date.now()) {
  if (typeof token !== "string" || token.length > 512) return false;
  const parts = token.split(".");
  if (parts.length !== 4) return false;
  const [version, expiresRaw, nonce, signature] = parts;
  if (version !== "v1" || !nonce) return false;

  const key = signingKey();
  if (!key) return false;

  const expected = sign(`${version}.${expiresRaw}.${nonce}`, key);
  if (!safeCompare(signature, expected)) return false;

  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt)) return false;
  return expiresAt * 1000 > now;
}

/**
 * Read one cookie out of a Cookie header.
 *
 * Written by hand rather than pulled from a package: the app needs exactly one
 * cookie and adding a dependency to split a string on ";" is not a trade worth
 * making. Values are decoded defensively because a malformed percent-escape
 * from a client must not throw.
 */
export function readCookie(cookieHeader, name) {
  if (typeof cookieHeader !== "string" || !cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    const raw = part.slice(eq + 1).trim();
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}

/**
 * Cookie attributes.
 *
 * httpOnly  — page JavaScript cannot read it, so an injected script cannot steal it.
 * sameSite  — the browser withholds it on requests started by other sites, which
 *             is what stops a malicious page from importing data as the operator.
 * secure    — HTTPS only, except on plain-HTTP localhost where that would make
 *             the cookie impossible to set during development.
 * path      — sent only to the API, never alongside static asset requests.
 */
export function sessionCookieOptions(req) {
  const forwardedProto = req?.headers?.["x-forwarded-proto"];
  const proto = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto)?.split(",")[0]?.trim();
  const isHttps = proto === "https" || req?.secure === true;
  return {
    httpOnly: true,
    sameSite: "strict",
    secure: isHttps,
    path: "/api",
    maxAge: SESSION_TTL_SECONDS * 1000,
  };
}
