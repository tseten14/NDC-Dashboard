import helmet from "helmet";
import { CLIMATE_TRACE_BASE_URL } from "../../config/climateTrace.js";
import { resolveFrontendOrigin } from "./cors.js";

export function createHelmetMiddleware() {
  const frontendOrigin = resolveFrontendOrigin();
  const connectSrc = ["'self'", CLIMATE_TRACE_BASE_URL];
  if (frontendOrigin && !connectSrc.includes(frontendOrigin)) {
    connectSrc.push(frontendOrigin);
  }

  return helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        connectSrc,
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });
}
