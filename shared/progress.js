/**
 * Unified NDC progress calculation (shared by Express API + Vite frontend).
 * Replaces separate 80/50, time-linear, and 70/35 threshold paths.
 */

const DECREASE_METRICS = new Set(["emissions-reduction"]);

/**
 * @param {{ baselineValue: number, targetValue: number, metricType: string }} target
 * @param {{ latestValue: number | null | undefined }} observations
 * @returns {number | null}
 */
export function calculateProgressPercent(target, observations) {
  const latestValue = observations.latestValue;
  if (latestValue == null || Number.isNaN(latestValue)) return null;

  const { baselineValue, targetValue, metricType } = target;

  if (DECREASE_METRICS.has(metricType)) {
    const denom = baselineValue - targetValue;
    if (!Number.isFinite(denom) || denom === 0) return null;
    const pct = ((baselineValue - latestValue) / denom) * 100;
    return Math.min(100, Math.max(0, Math.round(pct)));
  }

  const totalChange = Math.abs(targetValue - baselineValue);
  if (totalChange === 0) return latestValue === baselineValue ? 100 : 0;
  const currentChange = Math.abs(latestValue - baselineValue);
  return Math.min(100, Math.max(0, Math.round((currentChange / totalChange) * 100)));
}

/**
 * @param {number | null} percent
 * @param {{ baselineYear: number, targetYear: number }} target
 * @param {{ latestYear?: number | null, qaqcStatus?: string }} observations
 * @returns {"on-track"|"at-risk"|"off-track"|"unknown"}
 */
export function calculateProgressStatus(percent, target, observations = {}) {
  if (percent == null) return "unknown";

  const qaqc = observations.qaqcStatus;
  if (qaqc === "missing") return "unknown";

  const latestYear = observations.latestYear ?? new Date().getFullYear();
  const totalYears = target.targetYear - target.baselineYear;
  if (totalYears <= 0) return "unknown";

  const yearsElapsed = latestYear - target.baselineYear;
  const expectedProgress = (yearsElapsed / totalYears) * 100;

  let status;
  if (percent >= expectedProgress * 0.9) status = "on-track";
  else if (percent >= expectedProgress * 0.6) status = "at-risk";
  else status = "off-track";

  if ((qaqc === "warning" || qaqc === "inconsistent") && status === "on-track") {
    status = "at-risk";
  }

  return status;
}

/**
 * @param {{ baselineYear: number, baselineValue: number, targetYear: number, targetValue: number, metricType: string }} target
 * @param {{ latestValue: number | null | undefined, latestYear?: number | null, qaqcStatus?: string }} observations
 * @param {Record<string, unknown>} [_options]
 */
export function calculateProgress(target, observations, _options = {}) {
  const percent = calculateProgressPercent(target, observations);
  if (percent == null) return { percent: null, status: "unknown" };
  const status = calculateProgressStatus(percent, target, observations);
  return { percent, status };
}

/** @param {"on-track"|"at-risk"|"off-track"|"unknown"} status */
export function apiStatusFromUiStatus(status) {
  if (status === "on-track") return "on_track";
  if (status === "at-risk") return "mixed";
  if (status === "off-track") return "off_track";
  return "unknown";
}

/** @param {string} s */
export function uiStatusFromApiStatus(s) {
  if (s === "on_track") return "on-track";
  if (s === "at_risk" || s === "mixed") return "at-risk";
  if (s === "off_track") return "off-track";
  return "unknown";
}

/**
 * Backend helper: full progress payload for a Climate TRACE sector.
 * @param {number | null} latestValue
 * @param {import('../config/ndcTargets.js').NDC_TARGETS extends infer T ? never : any} sectorConfig
 * @param {number | null} latestYear
 */
export function computeSectorProgress(latestValue, sectorConfig, latestYear = null) {
  if (!sectorConfig || latestValue == null) return null;

  const result = calculateProgress(
    {
      baselineYear: sectorConfig.baseline_year,
      baselineValue: sectorConfig.baseline,
      targetYear: sectorConfig.target_year,
      targetValue: sectorConfig.target,
      metricType: "emissions-reduction",
    },
    { latestValue, latestYear, qaqcStatus: "ok" },
  );

  if (result.percent == null) return null;

  return {
    baseline_year: sectorConfig.baseline_year,
    baseline_value: sectorConfig.baseline,
    target_year: sectorConfig.target_year,
    target_value: sectorConfig.target,
    latest_value: latestValue,
    progress_pct: result.percent,
    status: apiStatusFromUiStatus(result.status),
  };
}
