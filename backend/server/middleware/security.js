/**
 * Standard protective HTTP headers.
 *
 * Sets the browser-level defences that come free once asked for: blocking the
 * app from being embedded in someone else's page, stopping browsers guessing a
 * file's type, forcing HTTPS, and — most importantly — a content security policy
 * naming the only outside address the app may contact, which is Climate TRACE.
 * That last one means a script injected into the page cannot send data anywhere
 * of its choosing.
 */
import helmet from "helmet";
import { CLIMATE_TRACE_BASE_URL } from "../../../config/climateTrace.js";
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
