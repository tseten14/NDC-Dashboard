/**
 * Plain-JS seed source derived from:
 * - frontend/src/data/climate-data.ts (sector baselines + historical series)
 * - frontend/src/data/uganda-strategy-data.ts (KPI targets + progress records)
 *
 * Used by db/seed.ts and services/persistence.js fallback (no Vite @/ aliases in Node).
 */

function generateHistorical(baseline, years, reductionRate) {
  return years.map((year, i) => ({
    year,
    emissions: Math.round(baseline * (1 - reductionRate * (i + 1)) * 10) / 10,
  }));
}

export const climateSectors = [
  {
    id: "afolu",
    baselineYear: 2015,
    baselineEmissions: 245,
    targetYear: 2030,
    targetReduction: 30,
    historicalData: generateHistorical(245, [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024], 0.02),
  },
  {
    id: "energy",
    baselineYear: 2015,
    baselineEmissions: 520,
    targetYear: 2030,
    targetReduction: 45,
    historicalData: generateHistorical(520, [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024], 0.032),
  },
  {
    id: "water",
    baselineYear: 2015,
    baselineEmissions: 45,
    targetYear: 2030,
    targetReduction: 20,
    historicalData: generateHistorical(45, [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024], 0.015),
  },
  {
    id: "ippu",
    baselineYear: 2015,
    baselineEmissions: 180,
    targetYear: 2030,
    targetReduction: 25,
    historicalData: generateHistorical(180, [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024], 0.013),
  },
  {
    id: "waste",
    baselineYear: 2015,
    baselineEmissions: 65,
    targetYear: 2030,
    targetReduction: 35,
    historicalData: generateHistorical(65, [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024], 0.025),
  },
  {
    id: "transport",
    baselineYear: 2015,
    baselineEmissions: 310,
    targetYear: 2030,
    targetReduction: 40,
    historicalData: generateHistorical(310, [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024], 0.02),
  },
  {
    id: "climate-risk",
    baselineYear: 2015,
    baselineEmissions: 85,
    targetYear: 2030,
    targetReduction: 15,
    historicalData: generateHistorical(85, [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024], 0.009),
  },
];

export const strategyKpis = [
  { id: "KPI-CO2-RED", unit: "tCO2e", is_proxy: false, targets: [{ strategy_id: "STRAT-NDC", target_value: 1200000, target_year: 2026 }] },
  { id: "KPI-RE-MW", unit: "MW", is_proxy: false, targets: [{ strategy_id: "STRAT-TENFOLD", target_value: 2000, target_year: 2027 }] },
  { id: "KPI-RELIAB", unit: "index_0_1", is_proxy: true, targets: [{ strategy_id: "STRAT-TENFOLD", target_value: 0.8, target_year: 2027 }] },
  { id: "KPI-EXPORT", unit: "USD", is_proxy: false, targets: [{ strategy_id: "STRAT-TENFOLD", target_value: 10000000000, target_year: 2027 }] },
  { id: "KPI-IRR-HA", unit: "hectares", is_proxy: false, targets: [{ strategy_id: "STRAT-ASSP", target_value: 50000, target_year: 2027 }] },
  { id: "KPI-AFOLU-DISP", unit: "tCO2e", is_proxy: true, targets: [{ strategy_id: "STRAT-NDC", target_value: 150000, target_year: 2027 }] },
  { id: "KPI-ERW-CO2", unit: "tCO2e", is_proxy: true, targets: [{ strategy_id: "STRAT-NDC", target_value: 50000, target_year: 2027 }] },
  { id: "KPI-NDP-ALIGN", unit: "pct", is_proxy: true, targets: [{ strategy_id: "STRAT-NDPIV", target_value: 0.9, target_year: 2027 }] },
  { id: "KPI-YIELD-IX", unit: "index_0_1", is_proxy: true, targets: [{ strategy_id: "STRAT-ASSP", target_value: 0.75, target_year: 2027 }] },
  { id: "KPI-JOBS", unit: "count", is_proxy: false, targets: [{ strategy_id: "STRAT-TENFOLD", target_value: 500000, target_year: 2027 }] },
  { id: "KPI-BUDG-COV", unit: "pct", is_proxy: false, targets: [{ strategy_id: "STRAT-NDPIV", target_value: 0.85, target_year: 2027 }] },
];

export const strategyProgressRecords = [
  { id: "PRG-001", kpi_id: "KPI-IRR-HA", period_end: "2026-03-31", value: 8200, validation_status: "Verified", provenance_note: "MAAIF district reports via UBOS API." },
  { id: "PRG-002", kpi_id: "KPI-AFOLU-DISP", period_end: "2026-03-31", value: 10250, validation_status: "Preliminary", provenance_note: "Calculated with provisional diesel factors; pending MWE verification." },
  { id: "PRG-003", kpi_id: "KPI-RE-MW", period_end: "2026-03-31", value: 1380, validation_status: "Verified", provenance_note: "UBOS energy registry." },
  { id: "PRG-004", kpi_id: "KPI-RELIAB", period_end: "2026-03-31", value: 0.63, validation_status: "Preliminary", provenance_note: "Proxy from RE_MW, CF=0.23, reported outages." },
];

export function climateSectorsForSeed() {
  return climateSectors.map((s) => ({
    id: s.id,
    baselineYear: s.baselineYear,
    baselineEmissions: s.baselineEmissions,
    targetYear: s.targetYear,
    targetReduction: s.targetReduction,
    historicalData: s.historicalData.map((h) => ({ year: h.year, emissions: h.emissions })),
  }));
}
