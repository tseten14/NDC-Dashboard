/**
 * Declares which routes need the shared emissions provider so unrelated pages do not trigger live data requests.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
const EMISSIONS_ROUTES = new Set(["/dashboard", "/ndc", "/library", "/exports"]);

export function routeNeedsEmissions(pathname: string): boolean {
  return EMISSIONS_ROUTES.has(pathname.replace(/\/+$/, "") || "/");
}
