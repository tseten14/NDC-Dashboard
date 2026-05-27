import type { MetricType, ProgressStatus, QAQCStatus } from "@/data/uganda-ndc-data";
import {
  calculateProgress as calculateProgressCore,
  calculateProgressPercent as calculateProgressPercentCore,
  calculateProgressStatus as calculateProgressStatusCore,
  apiStatusFromUiStatus,
  uiStatusFromApiStatus,
} from "../../../shared/progress.js";

export type ProgressTargetInput = {
  baselineYear: number;
  baselineValue: number;
  targetYear: number;
  targetValue: number;
  metricType: MetricType | string;
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

/** Derive QA/QC flags for Climate TRACE live observed datasets. */
export function deriveTraceDataQuality(hints: {
  missingSlugs?: string[];
  dataStale?: boolean;
  reconciliationDeltaPct?: number | null;
}): { qaqcStatus: QAQCStatus; isValidated: boolean; isEstimated: boolean } {
  const missing = hints.missingSlugs?.length ?? 0;
  const stale = hints.dataStale ?? false;
  const deltaPct = hints.reconciliationDeltaPct ?? 0;

  let qaqcStatus: QAQCStatus = "ok";
  let isValidated = true;
  const isEstimated = true;

  if (missing > 0) {
    isValidated = false;
    qaqcStatus = "warning";
  }
  if (stale) {
    isValidated = false;
    if (qaqcStatus === "ok") qaqcStatus = "warning";
  }
  if (deltaPct > 5) {
    isValidated = false;
    qaqcStatus = "inconsistent";
  }

  return { qaqcStatus, isValidated, isEstimated };
}

export function reconciliationDeltaPercent(
  deltaMt: number | null | undefined,
  referenceMt: number | null | undefined,
): number | null {
  if (deltaMt == null || referenceMt == null || referenceMt === 0) return null;
  return Math.abs((deltaMt / referenceMt) * 100);
}
