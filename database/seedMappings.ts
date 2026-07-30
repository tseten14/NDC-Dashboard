/**
 * Converts bundled reference data into database records.
 *
 * The app ships with starting data — Uganda's sectors and the strategy
 * indicators. This translates that material into the exact shape the tables
 * expect, so a fresh database can be filled with something useful rather than
 * starting empty.
 */
export type MetricType = "emissions_reduction" | "rising_share" | "absolute_level";

export function mapMetricType(input: string): MetricType {
  if (input === "emissions-reduction" || input === "emissions_reduction") {
    return "emissions_reduction";
  }
  if (
    input === "activity-share" ||
    input === "forest-cover" ||
    input === "renewable-energy" ||
    input === "transport-modal-shift" ||
    input === "rising_share"
  ) {
    return "rising_share";
  }
  return "absolute_level";
}

export type SeedTarget = {
  legacyKey: string;
  sector: string;
  baselineYear: number;
  targetYear: number;
  metricType: MetricType;
  baselineValue: number;
  targetValue: number;
  unit: string;
};

export type SeedObservation = {
  legacyKey: string;
  targetLegacyKey: string;
  year: number;
  value: number;
  source: string;
  asOf: string;
  isEstimated: boolean;
  isValidated: boolean;
  qaqcStatus: string;
};

/** Map climate-data sectors → targets + historical observations. */
export function mapClimateSectors(sectors: Array<{
  id: string;
  baselineYear: number;
  baselineEmissions: number;
  targetYear: number;
  targetReduction: number;
  historicalData: Array<{ year: number; emissions: number }>;
}>): { targets: SeedTarget[]; observations: SeedObservation[] } {
  const targets: SeedTarget[] = [];
  const observations: SeedObservation[] = [];

  for (const sector of sectors) {
    const targetValue = +(sector.baselineEmissions * (1 - sector.targetReduction / 100)).toFixed(4);
    const legacyKey = `climate-${sector.id}`;
    targets.push({
      legacyKey,
      sector: sector.id,
      baselineYear: sector.baselineYear,
      targetYear: sector.targetYear,
      metricType: "emissions_reduction",
      baselineValue: sector.baselineEmissions,
      targetValue,
      unit: "MtCO₂e",
    });

    for (const row of sector.historicalData) {
      observations.push({
        legacyKey: `${legacyKey}-${row.year}`,
        targetLegacyKey: legacyKey,
        year: row.year,
        value: row.emissions,
        source: "climate-data.ts (legacy demo)",
        asOf: `${row.year}-12-31`,
        isEstimated: true,
        isValidated: false,
        qaqcStatus: "warning",
      });
    }
  }

  return { targets, observations };
}

/** Map uganda-strategy KPIs → targets; progress records → observations. */
export function mapStrategyKpis(
  kpis: Array<{
    id: string;
    unit: string;
    is_proxy: boolean;
    targets: Array<{ target_value: number; target_year: number; strategy_id: string }>;
  }>,
  progressRecords: Array<{
    id: string;
    kpi_id: string;
    period_end: string;
    value: number;
    validation_status: string;
    provenance_note: string;
  }>,
): { targets: SeedTarget[]; observations: SeedObservation[] } {
  const targets: SeedTarget[] = [];
  const observations: SeedObservation[] = [];

  for (const kpi of kpis) {
    const primary = kpi.targets[0];
    if (!primary) continue;
    const metricType: MetricType = kpi.is_proxy ? "rising_share" : "absolute_level";
    targets.push({
      legacyKey: kpi.id,
      sector: primary.strategy_id.replace("STRAT-", "").toLowerCase(),
      baselineYear: primary.target_year - 5,
      targetYear: primary.target_year,
      metricType,
      baselineValue: 0,
      targetValue: primary.target_value,
      unit: kpi.unit,
    });
  }

  for (const pr of progressRecords) {
    const year = parseInt(pr.period_end.slice(0, 4), 10);
    observations.push({
      legacyKey: pr.id,
      targetLegacyKey: pr.kpi_id,
      year,
      value: pr.value,
      source: pr.provenance_note || "uganda-strategy-data.ts",
      asOf: pr.period_end,
      isEstimated: pr.validation_status !== "Verified",
      isValidated: pr.validation_status === "Verified",
      qaqcStatus: pr.validation_status === "Verified" ? "ok" : "warning",
    });
  }

  return { targets, observations };
}
