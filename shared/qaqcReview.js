/**
 * Dashboard QA/QC review — validates indicator timeseries before marking verified.
 * Used by the indicators API and Observed Data provenance on the dashboard.
 */

/**
 * @param {{ year?: number; value?: number | null }[]} timeseries
 * @param {string} [unit]
 * @returns {{ qaqcStatus: "ok" | "warning" | "missing"; isValidated: boolean }}
 */
export function reviewDashboardQaqc(timeseries, unit = "") {
  const points = (timeseries ?? []).filter(
    (p) => p.value != null && !Number.isNaN(Number(p.value)),
  );
  if (!points.length) {
    return { qaqcStatus: "missing", isValidated: false };
  }

  const isPct = String(unit).includes("%");
  for (const p of points) {
    const v = Number(p.value);
    if (isPct && (v < 0 || v > 100)) {
      return { qaqcStatus: "warning", isValidated: false };
    }
  }

  const sorted = [...points].sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
  for (let i = 1; i < sorted.length; i++) {
    const prev = Number(sorted[i - 1].value);
    const curr = Number(sorted[i].value);
    if (prev !== 0 && Math.abs((curr - prev) / prev) > 0.5) {
      return { qaqcStatus: "warning", isValidated: false };
    }
  }

  return { qaqcStatus: "ok", isValidated: true };
}
