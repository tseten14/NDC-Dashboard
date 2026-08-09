/**
 * Decides which websites may call this API from a browser.
 *
 * Browsers block one site from reading another site's API responses unless that
 * API says it is allowed. This grants that permission to the app's own front end
 * and nothing else, so another website cannot quietly use this API on a
 * visitor's behalf.
 *
 * This previously allowed *every* origin whenever the app was running on Vercel,
 * on the reasoning that the front end and API are deployed together. That
 * reasoning does not hold: the browser applies these rules per request, not per
 * deployment, so any website in the world could read this API's responses using
 * a visitor's own browser. Now the deployment's real hostnames are added to the
 * permitted list instead, which keeps co-deployment working without opening the
 * door to everyone. See allowedOrigins.js.
 */
import cors from "cors";
import { allowedOrigins, isAllowedOrigin, primaryFrontendOrigin } from "./allowedOrigins.js";

export function resolveFrontendOrigin() {
  return primaryFrontendOrigin();
}

export function createCorsMiddleware() {
  return cors({
    origin(origin, callback) {
      // No Origin header means the request did not come from a web page —
      // curl, a server-side job, a health check. There is no other site to
      // protect a visitor from, so these are allowed through.
      if (!origin) return callback(null, true);
      if (isAllowedOrigin(origin)) return callback(null, true);
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    // Required so the operator session cookie is sent on import requests.
    // Safe only because the origin list above is explicit — a wildcard origin
    // combined with credentials is exactly the combination browsers refuse.
    credentials: true,
    allowedHeaders: ["Content-Type", "x-api-key", "x-request-id"],
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    maxAge: 600,
  });
}

export { allowedOrigins };
