/**
 * Adaptive MtCO₂e rounding.
 * National totals stay at 2 dp; small district-level values keep extra precision
 * so they are not rounded to zero (e.g. 61 t → 0.000061 Mt, not 0).
 */
export function roundMtco2e(mt) {
  if (mt == null || Number.isNaN(Number(mt))) return null;
  const n = Number(mt);
  if (n === 0) return 0;
  const abs = Math.abs(n);
  if (abs < 0.0001) return +n.toFixed(6);
  if (abs < 0.01) return +n.toFixed(4);
  if (abs < 1) return +n.toFixed(3);
  return +n.toFixed(2);
}

/** Convert Climate TRACE tonnes (co2e_100yr) to MtCO₂e with adaptive precision. */
export function toMtco2eFromTonnes(tonnes) {
  if (tonnes == null || Number.isNaN(Number(tonnes))) return null;
  return roundMtco2e(Number(tonnes) / 1_000_000);
}

/**
 * Chart display scale for emissions time series stored in MtCO₂e.
 * District totals below 0.01 Mt are shown in tCO₂e so bars remain visible.
 */
export function emissionsChartDisplay(values, unitLabel = "MtCO₂e") {
  const nums = values.filter((v) => v != null && Number.isFinite(v) && v > 0);
  const maxMt = nums.length ? Math.max(...nums) : 0;
  const isMt = /mtco/i.test(String(unitLabel).replace(/\s/g, ""));

  if (isMt && maxMt > 0 && maxMt < 0.01) {
    return {
      unitLabel: "tCO₂e",
      scale: 1_000_000,
      formatValue: (mt) => {
        if (mt == null || !Number.isFinite(mt)) return "";
        if (mt === 0) return "0";
        const t = mt * 1_000_000;
        if (t >= 100) return Math.round(t).toLocaleString();
        if (t >= 10) return t.toFixed(1);
        return t.toFixed(2);
      },
    };
  }

  return {
    unitLabel,
    scale: 1,
    formatValue: (mt) => {
      if (mt == null || !Number.isFinite(mt)) return "";
      if (mt === 0) return "0";
      const abs = Math.abs(mt);
      if (abs >= 1000) return Math.round(mt).toLocaleString();
      if (abs >= 100) return Math.round(mt).toString();
      if (abs >= 10) return mt.toFixed(1);
      if (abs >= 1) return mt.toFixed(2);
      if (abs >= 0.01) return mt.toFixed(3);
      return mt.toFixed(4);
    },
  };
}
