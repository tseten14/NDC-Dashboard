const EMISSIONS_ROUTES = new Set(["/dashboard", "/ndc", "/library", "/exports"]);

export function routeNeedsEmissions(pathname: string): boolean {
  return EMISSIONS_ROUTES.has(pathname.replace(/\/+$/, "") || "/");
}
