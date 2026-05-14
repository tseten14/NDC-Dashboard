// Hooks for Climate Risk & Vulnerability module — fetch hazard layers, districts, risk cells, adaptation options.
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DataStatus = "Illustrative" | "Preliminary" | "Validated";
export type ConfidenceRating = "Low" | "Medium" | "High";
export type RiskLevel = "Low" | "Medium" | "High" | "Extreme";

export interface HazardLayer {
  id: string;
  name: string;
  hazard_type: string;
  acute_or_chronic: "Acute" | "Chronic";
  scenario_name: string | null;
  time_horizon: string | null;
  spatial_resolution: string | null;
  geography_coverage: string | null;
  source_provider: string | null;
  source_url: string | null;
  license: string | null;
  vintage_date: string | null;
  confidence_rating: ConfidenceRating;
  uncertainty_notes: string | null;
  methodology_notes: string | null;
  data_status: DataStatus;
  data_access_mode: "Upload" | "API" | "Computed";
}

export interface RiskDistrict {
  id: string;
  name: string;
  region: string | null;
  geojson: { type: string; coordinates: number[][][] };
}

export interface RiskCell {
  id: string;
  district_id: string;
  hazard_layer_id: string;
  intensity_score_0_100: number;
  risk_level: RiskLevel;
  confidence: ConfidenceRating;
  scenario: string | null;
  time_horizon: string | null;
  vintage: string | null;
  source_provider: string | null;
  notes: string | null;
  data_status: DataStatus;
}

export interface AdaptationOption {
  id: string;
  name: string;
  hazard_types: string[];
  applicable_sectors: string[];
  description: string | null;
  expected_risk_reduction: string | null;
  cost_range_min_usd: number | null;
  cost_range_max_usd: number | null;
  co_benefits: string | null;
  data_status: DataStatus;
}

export function useHazardLayers() {
  const [data, setData] = useState<HazardLayer[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (supabase as any).from("hazard_layers").select("*").order("name")
      .then(({ data }: any) => { setData(data || []); setLoading(false); });
  }, []);
  return { data, loading };
}

export function useRiskDistricts() {
  const [data, setData] = useState<RiskDistrict[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (supabase as any).from("risk_districts").select("*").order("name")
      .then(({ data }: any) => { setData(data || []); setLoading(false); });
  }, []);
  return { data, loading };
}

export function useRiskCells() {
  const [data, setData] = useState<RiskCell[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (supabase as any).from("risk_cells").select("*")
      .then(({ data }: any) => { setData(data || []); setLoading(false); });
  }, []);
  return { data, loading };
}

export function useAdaptationOptions() {
  const [data, setData] = useState<AdaptationOption[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (supabase as any).from("adaptation_options").select("*").order("name")
      .then(({ data }: any) => { setData(data || []); setLoading(false); });
  }, []);
  return { data, loading };
}

// Color helper for risk score (semantic tokens via inline style — using HSL values
// from the earth-tone palette range without introducing new globals).
export function riskColor(score: number): string {
  // 0–25 calm green, 26–50 amber, 51–75 orange, 76–100 deep red
  if (score >= 76) return "hsl(0, 65%, 42%)";
  if (score >= 51) return "hsl(22, 75%, 48%)";
  if (score >= 26) return "hsl(38, 80%, 52%)";
  return "hsl(95, 35%, 45%)";
}

export function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 76) return "Extreme";
  if (score >= 51) return "High";
  if (score >= 26) return "Medium";
  return "Low";
}

// Compose helpers
export function useTopHotspots(limit = 5) {
  const { data: cells } = useRiskCells();
  const { data: districts } = useRiskDistricts();
  const { data: hazards } = useHazardLayers();
  return useMemo(() => {
    const dById = new Map(districts.map(d => [d.id, d]));
    const hById = new Map(hazards.map(h => [h.id, h]));
    return [...cells]
      .sort((a, b) => b.intensity_score_0_100 - a.intensity_score_0_100)
      .slice(0, limit)
      .map(c => ({
        cell: c,
        district: dById.get(c.district_id),
        hazard: hById.get(c.hazard_layer_id),
      }));
  }, [cells, districts, hazards, limit]);
}