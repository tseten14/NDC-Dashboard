import cors from "cors";

export function resolveFrontendOrigin() {
  return (process.env.FRONTEND_ORIGIN ?? "http://localhost:8080").replace(/\/$/, "");
}

export function createCorsMiddleware() {
  const allowed = resolveFrontendOrigin();
  const onVercel = Boolean(process.env.VERCEL);

  return cors({
    origin(origin, callback) {
      // Same-origin / server-to-server / curl (no Origin header)
      if (!origin) return callback(null, true);
      if (origin === allowed) return callback(null, true);
      // On Vercel the frontend and API share the same host — allow any *.vercel.app
      // origin and any deployment-specific preview URL automatically.
      if (onVercel && /^https:\/\/[^/]+\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  });
}
