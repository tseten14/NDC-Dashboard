/**
 * Unified NDC progress calculation (shared by Express API + Vite frontend).
 *
 * BAU-cap targets (Uganda NDC 2022): progress aligns with the FAO NDC Tracking Tool —
 * achieved reduction vs required reduction relative to the 2030 BAU level:
 *   progress % = (BAU_2030 − latest) / (BAU_2030 − NDC_cap) × 100
 * See: FAO NDC Tracking Tool, Module 3 (progress toward BAU-relative targets).
 */

const DECREASE_METRICS = new Set(["emissions-reduction"]);

/** @param {{ baselineValue: number, targetValue: number, bau2030?: number | null, bau_2030?: number | null }} t */
export function isBauCapEmissionsTarget(t) {
  const bau = t.bau2030 ?? t.bau_2030 ?? null;
  return bau != null && t.targetValue > t.baselineValue && bau > t.targetValue;
}

/**
 * Where observed emissions sit on a BAU-cap scale (lower is better).
 * @param {number} latest
 * @param {number} cap NDC 2030 ceiling
 * @param {number} bau 2030 no-policy level
 * @returns {'below_cap' | 'between_cap_and_bau' | 'above_bau'}
 */
export function capTargetPosition(latest, cap, bau) {
  if (latest <= cap) return "below_cap";
  if (latest <= bau) return "between_cap_and_bau";
  return "above_bau";
}

/**
 * @param {{ baselineValue: number, targetValue: number, metricType: string, bau2030?: number | null, bau_2030?: number | null }} target
 * @param {{ latestValue: number | null | undefined }} observations
 * @returns {number | null}
 */
export function calculateProgressPercent(target, observations) {
  const latestValue = observations.latestValue;
  if (latestValue == null || Number.isNaN(latestValue)) return null;

  const { baselineValue, targetValue, metricType } = target;
  const bau2030 = target.bau2030 ?? target.bau_2030 ?? null;

  if (DECREASE_METRICS.has(metricType)) {
    // True reduction: 2030 target is below the base-year inventory (e.g. cut from 2015 level).
    if (targetValue < baselineValue) {
      const denom = baselineValue - targetValue;
      if (!Number.isFinite(denom) || denom === 0) return null;
      const pct = ((baselineValue - latestValue) / denom) * 100;
      return Math.min(100, Math.max(0, Math.round(pct)));
    }

    // Cap target: 2030 ceiling is above 2015 baseline but below BAU — compare observed to BAU trajectory.
    if (bau2030 != null && bau2030 > targetValue) {
      const denom = bau2030 - targetValue;
      if (!Number.isFinite(denom) || denom === 0) return null;
      const pct = ((bau2030 - latestValue) / denom) * 100;
      return Math.min(100, Math.max(0, Math.round(pct)));
    }

    // Cap without BAU metadata: at or below the ceiling counts as complete.
    if (latestValue <= targetValue) return 100;
    const denom = targetValue - baselineValue;
    if (!Number.isFinite(denom) || denom === 0) return null;
    const pct = ((targetValue - latestValue) / denom) * 100;
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

  const usesBauCap =
    sectorConfig.bau_2030 != null && sectorConfig.target > sectorConfig.baseline;

  const result = calculateProgress(
    {
      baselineYear: sectorConfig.baseline_year,
      baselineValue: sectorConfig.baseline,
      targetYear: sectorConfig.target_year,
      targetValue: sectorConfig.target,
      metricType: "emissions-reduction",
      bau2030: sectorConfig.bau_2030 ?? null,
    },
    { latestValue, latestYear, qaqcStatus: "ok" },
  );

  if (result.percent == null) return null;

  return {
    baseline_year: sectorConfig.baseline_year,
    baseline_value: sectorConfig.baseline,
    target_year: sectorConfig.target_year,
    target_value: sectorConfig.target,
    bau_2030: sectorConfig.bau_2030 ?? null,
    latest_value: latestValue,
    progress_pct: result.percent,
    status: apiStatusFromUiStatus(result.status),
    progress_method: usesBauCap ? "bau_cap" : "baseline_reduction",
  };
}
