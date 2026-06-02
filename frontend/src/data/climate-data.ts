import {
  Trees, Flame, Droplets, Factory, Trash2, Bus, CloudRain,
  type LucideIcon,
} from "lucide-react";
import { calculateProgressPercent, calculateProgressStatus } from "@/lib/progress";

export type Status = "on-track" | "at-risk" | "off-track";

export interface Sector {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
  baselineYear: number;
  baselineEmissions: number; // MtCO2e
  targetYear: number;
  targetReduction: number; // percentage
  currentEmissions: number;
  activities: Activity[];
  historicalData: YearlyData[];
  projectedData: YearlyData[];
}

export interface Activity {
  id: string;
  name: string;
  status: Status;
  investment: number; // USD millions
  emissionsReduced: number; // MtCO2e
  startYear: number;
  description: string;
}

export interface YearlyData {
  year: number;
  emissions: number;
  target: number;
}

export interface DecisionOption {
  id: string;
  label: string;
  description: string;
  type: "terminate" | "increase" | "reduce" | "maintain";
}

export const decisionOptions: DecisionOption[] = [
  { id: "terminate", label: "Terminate Activity", description: "End underperforming program and reallocate funds", type: "terminate" },
  { id: "increase", label: "Increase Investment", description: "Scale up funding for high-impact activities", type: "increase" },
  { id: "reduce", label: "Reduce Sector Emissions", description: "Implement additional reduction measures in sector", type: "reduce" },
  { id: "maintain", label: "Maintain Current Course", description: "Continue with existing strategy and monitor", type: "maintain" },
];

function generateHistorical(baseline: number, years: number[], reductionRate: number): YearlyData[] {
  return years.map((y, i) => ({
    year: y,
    emissions: Math.round(baseline * (1 - reductionRate * (i + 1)) * 10) / 10,
    target: Math.round(baseline * (1 - 0.03 * (i + 1)) * 10) / 10,
  }));
}

function generateProjected(lastEmissions: number, years: number[], targetFinal: number): YearlyData[] {
  const totalYears = years.length;
  return years.map((y, i) => ({
    year: y,
    emissions: Math.round((lastEmissions - (lastEmissions - targetFinal) * ((i + 1) / totalYears)) * 10) / 10,
    target: Math.round((lastEmissions - (lastEmissions - targetFinal * 0.9) * ((i + 1) / totalYears)) * 10) / 10,
  }));
}

export const sectors: Sector[] = [
  {
    id: "afolu",
    name: "AFOLU",
    icon: Trees,
    description: "Agriculture, Forestry & Other Land Use",
    baselineYear: 2015,
    baselineEmissions: 245,
    targetYear: 2030,
    targetReduction: 30,
    currentEmissions: 198,
    activities: [
      { id: "a1", name: "Reforestation Program", status: "on-track", investment: 120, emissionsReduced: 18.5, startYear: 2018, description: "National tree planting initiative targeting 2M hectares" },
      { id: "a2", name: "Sustainable Agriculture", status: "at-risk", investment: 85, emissionsReduced: 12.3, startYear: 2019, description: "Transition to low-emission farming practices" },
      { id: "a3", name: "Peatland Restoration", status: "off-track", investment: 45, emissionsReduced: 5.2, startYear: 2020, description: "Rewetting degraded peatlands" },
    ],
    historicalData: generateHistorical(245, [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024], 0.02),
    projectedData: generateProjected(198, [2025, 2026, 2027, 2028, 2029, 2030], 171.5),
  },
  {
    id: "energy",
    name: "Energy",
    icon: Flame,
    description: "Energy Production & Renewable Energy",
    baselineYear: 2015,
    baselineEmissions: 520,
    targetYear: 2030,
    targetReduction: 45,
    currentEmissions: 365,
    activities: [
      { id: "e1", name: "Solar Farm Expansion", status: "on-track", investment: 340, emissionsReduced: 65, startYear: 2017, description: "Utility-scale solar deployment program" },
      { id: "e2", name: "Coal Phase-out", status: "on-track", investment: 200, emissionsReduced: 55, startYear: 2018, description: "Gradual retirement of coal-fired power plants" },
      { id: "e3", name: "Wind Energy Program", status: "at-risk", investment: 180, emissionsReduced: 28, startYear: 2019, description: "Onshore and offshore wind development" },
    ],
    historicalData: generateHistorical(520, [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024], 0.032),
    projectedData: generateProjected(365, [2025, 2026, 2027, 2028, 2029, 2030], 286),
  },
  {
    id: "water",
    name: "Water",
    icon: Droplets,
    description: "Water Resources & Management",
    baselineYear: 2015,
    baselineEmissions: 45,
    targetYear: 2030,
    targetReduction: 20,
    currentEmissions: 39,
    activities: [
      { id: "w1", name: "Water Treatment Upgrade", status: "on-track", investment: 60, emissionsReduced: 3.5, startYear: 2019, description: "Modernizing wastewater treatment facilities" },
      { id: "w2", name: "Irrigation Efficiency", status: "at-risk", investment: 25, emissionsReduced: 1.8, startYear: 2020, description: "Smart irrigation systems rollout" },
    ],
    historicalData: generateHistorical(45, [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024], 0.015),
    projectedData: generateProjected(39, [2025, 2026, 2027, 2028, 2029, 2030], 36),
  },
  {
    id: "ippu",
    name: "IPPU",
    icon: Factory,
    description: "Industrial Processes & Product Use",
    baselineYear: 2015,
    baselineEmissions: 180,
    targetYear: 2030,
    targetReduction: 25,
    currentEmissions: 158,
    activities: [
      { id: "i1", name: "Cement Decarbonization", status: "at-risk", investment: 95, emissionsReduced: 10, startYear: 2020, description: "Low-carbon cement production transition" },
      { id: "i2", name: "HFC Phase-down", status: "on-track", investment: 40, emissionsReduced: 8, startYear: 2019, description: "Kigali Amendment implementation" },
    ],
    historicalData: generateHistorical(180, [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024], 0.013),
    projectedData: generateProjected(158, [2025, 2026, 2027, 2028, 2029, 2030], 135),
  },
  {
    id: "waste",
    name: "Waste",
    icon: Trash2,
    description: "Waste Management & Circular Economy",
    baselineYear: 2015,
    baselineEmissions: 65,
    targetYear: 2030,
    targetReduction: 35,
    currentEmissions: 50,
    activities: [
      { id: "wa1", name: "Methane Capture", status: "on-track", investment: 55, emissionsReduced: 8, startYear: 2018, description: "Landfill gas capture and utilization" },
      { id: "wa2", name: "Recycling Infrastructure", status: "on-track", investment: 30, emissionsReduced: 4.5, startYear: 2019, description: "National recycling facility expansion" },
    ],
    historicalData: generateHistorical(65, [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024], 0.025),
    projectedData: generateProjected(50, [2025, 2026, 2027, 2028, 2029, 2030], 42.25),
  },
  {
    id: "transport",
    name: "Transport",
    icon: Bus,
    description: "Transportation & Mobility",
    baselineYear: 2015,
    baselineEmissions: 310,
    targetYear: 2030,
    targetReduction: 40,
    currentEmissions: 255,
    activities: [
      { id: "t1", name: "EV Transition", status: "on-track", investment: 250, emissionsReduced: 30, startYear: 2018, description: "Electric vehicle adoption incentives" },
      { id: "t2", name: "Public Transit Expansion", status: "at-risk", investment: 180, emissionsReduced: 15, startYear: 2019, description: "Metro and bus rapid transit development" },
      { id: "t3", name: "Fuel Efficiency Standards", status: "off-track", investment: 20, emissionsReduced: 5, startYear: 2020, description: "Stricter vehicle emission standards" },
    ],
    historicalData: generateHistorical(310, [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024], 0.02),
    projectedData: generateProjected(255, [2025, 2026, 2027, 2028, 2029, 2030], 186),
  },
  {
    id: "climate-risk",
    name: "Climate Risk",
    icon: CloudRain,
    description: "Flooding, Drought, Wildfires & Deforestation",
    baselineYear: 2015,
    baselineEmissions: 85,
    targetYear: 2030,
    targetReduction: 15,
    currentEmissions: 78,
    activities: [
      { id: "c1", name: "Early Warning Systems", status: "on-track", investment: 35, emissionsReduced: 2, startYear: 2019, description: "National disaster early warning network" },
      { id: "c2", name: "Flood Resilience", status: "at-risk", investment: 90, emissionsReduced: 3, startYear: 2020, description: "Urban flood defense infrastructure" },
    ],
    historicalData: generateHistorical(85, [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024], 0.009),
    projectedData: generateProjected(78, [2025, 2026, 2027, 2028, 2029, 2030], 72.25),
  },
];

export function getSectorStatus(sector: Sector): Status {
  const targetEmissions = sector.baselineEmissions * (1 - sector.targetReduction / 100);
  const latestYear =
    sector.historicalData[sector.historicalData.length - 1]?.year ?? new Date().getFullYear();
  const percent = calculateProgressPercent(
    {
      baselineYear: sector.baselineYear,
      baselineValue: sector.baselineEmissions,
      targetYear: sector.targetYear,
      targetValue: targetEmissions,
      metricType: "emissions-reduction",
    },
    { latestValue: sector.currentEmissions, latestYear },
  );
  const status = calculateProgressStatus(
    percent,
    { baselineYear: sector.baselineYear, targetYear: sector.targetYear },
    { latestYear },
  );
  // climate-data sectors always have observations; map the "unknown" case
  // (no Status equivalent) to the conservative "at-risk".
  return status === "unknown" ? "at-risk" : status;
}

export function getProgressPercent(sector: Sector): number {
  const targetEmissions = sector.baselineEmissions * (1 - sector.targetReduction / 100);
  const totalReduction = sector.baselineEmissions - targetEmissions;
  const currentReduction = sector.baselineEmissions - sector.currentEmissions;
  return Math.min(100, Math.round((currentReduction / totalReduction) * 100));
}

export function getTotalEmissions(): number {
  return sectors.reduce((sum, s) => sum + s.currentEmissions, 0);
}

export function getTotalBaseline(): number {
  return sectors.reduce((sum, s) => sum + s.baselineEmissions, 0);
}

export function getOverallProgress(): number {
  const baseline = getTotalBaseline();
  const current = getTotalEmissions();
  const weightedTarget = sectors.reduce((sum, s) => sum + s.baselineEmissions * (s.targetReduction / 100), 0);
  return Math.round(((baseline - current) / weightedTarget) * 100);
}
