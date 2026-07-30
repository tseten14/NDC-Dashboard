/**
 * Emissions unit conversion for the front end.
 *
 * Re-exports the shared conversion helpers so the browser and the API use one
 * definition of a tonne. Two conversion routines would eventually disagree.
 */
export {
  roundMtco2e,
  toMtco2eFromTonnes,
  emissionsChartDisplay,
} from "../../../shared/emissionsUnits.js";
