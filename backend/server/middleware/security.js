/**
 * Standard protective HTTP headers.
 *
 * Sets the browser-level defences that come free once asked for: refusing to be
 * embedded in someone else's page, stopping browsers guessing a file's type,
 * forcing HTTPS, withholding the full URL from other sites, switching off device
 * permissions the app never uses, and a content security policy naming the only
 * outside addresses the app may contact.
 *
 * Note on scope: these headers travel with API responses. The app's own HTML is
 * served as a static file by the host, which never passes through this code, so
 * the equivalent headers for the page itself are configured in vercel.json. Both
 * are needed — a policy on the API alone would not protect the page.
 */
import helmet from "helmet";
import { CLIMATE_TRACE_BASE_URL } from "../../../config/climateTrace.js";
import { allowedOrigins } from "./allowedOrigins.js";

export function createHelmetMiddleware() {
  const connectSrc = ["'self'", CLIMATE_TRACE_BASE_URL, ...allowedOrigins()];

  return helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: [...new Set(connectSrc)],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        // Nothing may embed these responses in a frame, and nothing may be
        // loaded through the legacy plugin/applet mechanisms.
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        // Stops an injected <base> tag from silently re-pointing every relative
        // URL on the page at an attacker's server.
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    // Tell browsers to use HTTPS for this host for the next two years, including
    // the very first visit, which is the one a downgrade attack targets.
    strictTransportSecurity: {
      maxAge: 63072000,
      includeSubDomains: true,
      preload: true,
    },
    // Send only the origin to other sites, and nothing at all when leaving
    // HTTPS, so query strings never travel to a third party in a Referer header.
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    // Helmet defaults this to SAMEORIGIN, which still permits our own pages to
    // frame API responses. The CSP above already says frame-ancestors 'none';
    // this matches it for older browsers that only understand this header.
    xFrameOptions: { action: "deny" },
    // The API is read from the app's own pages, which may sit on a different
    // hostname in development; blocking that outright breaks local work.
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // Suppresses the header that advertises which server software is running.
    hidePoweredBy: true,
  });
}

/**
 * Switch off browser features this app never uses.
 *
 * Helmet does not set this one. Declaring the unused capabilities explicitly
 * means that if a script ever is injected into a page, it still cannot reach the
 * camera, microphone or location.
 */
export function permissionsPolicyMiddleware(_req, res, next) {
  res.setHeader(
    "Permissions-Policy",
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()",
  );
  next();
}
