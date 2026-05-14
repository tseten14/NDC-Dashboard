// QA / QC Rulebook — produces qa_flags for indicators.
// Rules are pure functions over Indicator + optional time series.

import type { Indicator, QAFlag } from "./indicator-registry";

export interface TimePoint { year: string; value: number; source?: string; }

export interface RuleResult { flags: QAFlag[]; }

const PCT_UNITS = ["%", "percent", "share"];

function isPct(unit: string) { return PCT_UNITS.some(u => unit.toLowerCase().includes(u)); }

export const qaRules = {
  rangeCheck(ind: Indicator): QAFlag[] {
    const out: QAFlag[] = [];
    if (isPct(ind.unit)) {
      const vals = [ind.baseline_value, ind.target_value_2025, ind.target_value_2030, ind.target_value_2040, ind.current_value]
        .filter((v): v is number => typeof v === "number");
      const bad = vals.find(v => v < 0 || v > 100);
      if (bad !== undefined) out.push({ rule_id: "QA-RANGE-PCT", severity: "warn", message: `Value ${bad}${ind.unit} outside 0–100 range.` });
    }
    if (ind.unit === "USD" || ind.unit === "UGX" || ind.unit.includes("count")) {
      const vals = [ind.baseline_value, ind.target_value_2025, ind.target_value_2030, ind.target_value_2040]
        .filter((v): v is number => typeof v === "number");
      if (vals.some(v => v < 0)) out.push({ rule_id: "QA-RANGE-NEG", severity: "error", message: "Negative value in non-signed unit." });
    }
    return out;
  },

  unitConsistency(ind: Indicator): QAFlag[] {
    if (!ind.unit) return [{ rule_id: "QA-UNIT-MISSING", severity: "error", message: "Unit missing." }];
    return [];
  },

  timeContinuity(series: TimePoint[]): QAFlag[] {
    if (series.length < 2) return [];
    const sorted = [...series].sort((a, b) => a.year.localeCompare(b.year));
    const out: QAFlag[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1].value;
      const curr = sorted[i].value;
      if (prev !== 0 && Math.abs((curr - prev) / prev) > 0.5) {
        out.push({ rule_id: "QA-CONTINUITY", severity: "warn", message: `Year-on-year jump >50% between ${sorted[i-1].year} and ${sorted[i].year}.` });
      }
    }
    return out;
  },

  crossSource(values: { source: string; value: number }[]): QAFlag[] {
    if (values.length < 2) return [];
    const min = Math.min(...values.map(v => v.value));
    const max = Math.max(...values.map(v => v.value));
    if (min === 0) return [];
    if ((max - min) / min > 0.2) return [{ rule_id: "QA-CROSS-SOURCE", severity: "warn", message: `Sources disagree by >20% (${min}–${max}).` }];
    return [];
  },

  trackability(ind: Indicator): QAFlag[] {
    const missing: string[] = [];
    if (!ind.unit) missing.push("unit");
    if (ind.baseline_value === null) missing.push("baseline");
    if (ind.target_value_2025 === null && ind.target_value_2030 === null && ind.target_value_2040 === null) missing.push("target");
    if (!ind.data_source) missing.push("data_source");
    if (!ind.last_update_date) missing.push("last_update_date");
    if (missing.length === 0) return [];
    return [{ rule_id: "QA-TRACKABILITY", severity: "warn", message: `Not trackable — missing: ${missing.join(", ")}.` }];
  },
};

export function runAllRules(ind: Indicator, series?: TimePoint[]): QAFlag[] {
  const flags: QAFlag[] = [
    ...(ind.qa_flags ?? []),
    ...qaRules.unitConsistency(ind),
    ...qaRules.rangeCheck(ind),
    ...qaRules.trackability(ind),
  ];
  if (series) flags.push(...qaRules.timeContinuity(series));
  // dedupe by rule_id+message
  const seen = new Set<string>();
  return flags.filter(f => {
    const k = f.rule_id + "|" + f.message;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
