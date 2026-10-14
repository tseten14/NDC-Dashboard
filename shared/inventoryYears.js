/** Shares the verified complete inventory window between the API and browser without server-only dependencies. */
export const INVENTORY_YEAR_MIN = 2015;

export function latestInventoryYear() {
  const year = new Date().getFullYear();
  return Math.min(2025, Math.max(INVENTORY_YEAR_MIN, year >= 2026 ? year - 1 : year));
}

export function defaultInventoryRange() {
  return { since: INVENTORY_YEAR_MIN, to: latestInventoryYear() };
}
