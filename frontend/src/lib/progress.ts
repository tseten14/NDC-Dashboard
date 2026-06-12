import type { MetricType, ProgressStatus, QAQCStatus } from "@/data/uganda-ndc-data";
import {
  calculateProgress as calculateProgressCore,
  calculateProgressPercent as calculateProgressPercentCore,
  calculateProgressStatus as calculateProgressStatusCore,
  apiStatusFromUiStatus,
  uiStatusFromApiStatus,
  isBauCapEmissionsTarget,
  capTargetPosition,
} from "../../../shared/progress.js";
import { reviewDashboardQaqc } from "../../../shared/qaqcReview.js";

export { isBauCapEmissionsTarget, capTargetPosition };
export type CapTargetPosition = "below_cap" | "between_cap_and_bau" | "above_bau";

export type ProgressTargetInput = {
  baselineYear: number;
  baselineValue: number;
  targetYear: number;
  targetValue: number;
  metricType: MetricType | string;
  /** 2030 business-as-usual level for cap-style emissions targets (target > baseline). */
  bau2030?: number | null;
};

export type ProgressObservationsInput = {
  latestValue: number | null | undefined;
  latestYear?: number | null;
  qaqcStatus?: QAQCStatus | string;
};

export type ProgressResult = {
  percent: number | null;
  status: ProgressStatus;
};

export function calculateProgressPercent(
  target: ProgressTargetInput,
  observations: ProgressObservationsInput,
): number | null {
  return calculateProgressPercentCore(target, observations);
}

export function calculateProgressStatus(
  percent: number | null,
  target: Pick<ProgressTargetInput, "baselineYear" | "targetYear">,
  observations: Pick<ProgressObservationsInput, "latestYear" | "qaqcStatus"> = {},
): ProgressStatus {
  return calculateProgressStatusCore(percent, target, observations) as ProgressStatus;
}

export function calculateProgress(
  target: ProgressTargetInput,
  observations: ProgressObservationsInput,
  options?: Record<string, unknown>,
): ProgressResult {
  const result = calculateProgressCore(target, observations, options);
  return {
    percent: result.percent,
    status: result.status as ProgressStatus,
  };
}

export { apiStatusFromUiStatus, uiStatusFromApiStatus };

export { reviewDashboardQaqc };

/** Derive QA/QC flags for Climate TRACE live observed datasets. */
export function deriveTraceDataQuality(
  hints: {
    missingSlugs?: string[];
    dataStale?: boolean;
    reconciliationDeltaPct?: number | null;
    timeseries?: { year: number; value: number | null }[];
    unit?: string;
  } = {},
): { qaqcStatus: QAQCStatus; isValidated: boolean; isEstimated: boolean } {
  if (hints.timeseries?.length) {
    const reviewed = reviewDashboardQaqc(hints.timeseries, hints.unit ?? "MtCO₂e");
    return { ...reviewed, isEstimated: true };
  }

  return { qaqcStatus: "ok", isValidated: true, isEstimated: true };
}

export function reconciliationDeltaPercent(
  deltaMt: number | null | undefined,
  referenceMt: number | null | undefined,
): number | null {
  if (deltaMt == null || referenceMt == null || referenceMt === 0) return null;
  return Math.abs((deltaMt / referenceMt) * 100);
}
