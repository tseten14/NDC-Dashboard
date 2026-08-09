/**
 * The single list of websites this API trusts.
 *
 * Two separate defences read from this list, and they must agree: the CORS rules
 * that decide whose browser may read a response, and the cross-site check that
 * decides whose page may trigger a data change. Keeping one list means a domain
 * can never be permitted by one and refused by the other.
 *
 * Configure with FRONTEND_ORIGIN. Several may be given, comma-separated, which
 * is what a deployment needs when the same API serves a custom domain and a
 * preview URL.
 */

/** Strip a trailing slash so "https://x.com/" and "https://x.com" match. */
function normalize(origin) {
  return origin.trim().replace(/\/$/, "");
}

/**
 * Vercel gives each deployment a generated hostname that cannot be known ahead
 * of time and so cannot be listed in configuration. VERCEL_URL holds it at
 * runtime; including it keeps preview deployments working without resorting to
 * "allow everyone".
 */
function vercelOrigins() {
  const origins = [];
  const url = process.env.VERCEL_URL?.trim();
  if (url) origins.push(normalize(url.startsWith("http") ? url : `https://${url}`));
  const branchUrl = process.env.VERCEL_BRANCH_URL?.trim();
  if (branchUrl) origins.push(normalize(branchUrl.startsWith("http") ? branchUrl : `https://${branchUrl}`));
  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionUrl) {
    origins.push(normalize(productionUrl.startsWith("http") ? productionUrl : `https://${productionUrl}`));
  }
  return origins;
}

/** Every origin permitted to call this API from a browser. */
export function allowedOrigins() {
  const configured = (process.env.FRONTEND_ORIGIN ?? "http://localhost:8080")
    .split(",")
    .map(normalize)
    .filter(Boolean);
  return [...new Set([...configured, ...vercelOrigins()])];
}

/** First configured origin — used where a single canonical value is needed. */
export function primaryFrontendOrigin() {
  return allowedOrigins()[0] ?? "http://localhost:8080";
}

export function isAllowedOrigin(origin) {
  if (!origin) return false;
  return allowedOrigins().includes(normalize(origin));
}
