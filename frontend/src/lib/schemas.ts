/**
 * Shared data shape definitions for the front end.
 *
 * Re-exports the schemas so the browser validates API responses against the same
 * definitions the API validated them with.
 */
export { safeParseOrLog } from "../../../shared/validate.js";
export {
  climateTraceEmissionsResponseSchema,
  climateTraceRankingsResponseSchema,
} from "../../../shared/schemas/climateTrace.schema.js";
export { emissionsDashboardSchema } from "../../../shared/schemas/emissionsDashboard.schema.js";
export { indicatorPanelResponseSchema } from "../../../shared/schemas/indicatorPanel.schema.js";
export { ingestScanReportSchema } from "../../../shared/schemas/ingestScan.schema.js";
