/**
 * Decides which websites may call this API from a browser.
 *
 * Browsers block one site from calling another site's API unless that API says
 * it is allowed. This sets that permission to the app's own front end and
 * nothing else, so another website cannot quietly use this API on a visitor's
 * behalf. The permitted address comes from configuration, so the local
 * development address and the deployed address can differ.
 */
import cors from "cors";

export function resolveFrontendOrigin() {
  return (process.env.FRONTEND_ORIGIN ?? "http://localhost:8080").replace(/\/$/, "");
}

export function createCorsMiddleware() {
  const allowed = resolveFrontendOrigin();
  // On Vercel the frontend and API are co-deployed — no cross-origin risk.
  const onVercel = Boolean(process.env.VERCEL);

  return cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (origin === allowed) return callback(null, true);
      if (onVercel) return callback(null, true);
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  });
}
