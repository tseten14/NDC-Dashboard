/**
 * Fetches climate risk data and turns scores into colours.
 *
 * Loads the hazard layers, district and cell scores and adaptation options, and
 * provides the shared mapping from a numeric score to a risk level and its
 * colour — kept here so every risk screen and the map colour identically.
 */
// Climate Risk module — data from Express API.
import { useEffect, useState, useMemo } from "react";

import { resolveApiHost } from "@/lib/api";

const API_BASE = resolveApiHost();

async function fetchRiskJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`Risk API ${res.status}`);
  return res.json() as Promise<T>;
}

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
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    setError(null);
    fetchRiskJSON<{ layers: HazardLayer[] }>("/api/v1/risk/hazard-layers")
      .then((r) => setData(r.layers || []))
      .catch((e: unknown) => {
        setError(e instanceof Error ? e : new Error(String(e)));
        setData([]);
      })
      .finally(() => setLoading(false));
  }, []);
  return useMemo(() => ({ data, loading, error }), [data, loading, error]);
}

export function useRiskDistricts() {
  const [data, setData] = useState<RiskDistrict[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    setError(null);
    fetchRiskJSON<{ districts: RiskDistrict[] }>("/api/v1/risk/districts")
      .then((r) => setData(r.districts || []))
      .catch((e: unknown) => {
        setError(e instanceof Error ? e : new Error(String(e)));
        setData([]);
      })
      .finally(() => setLoading(false));
  }, []);
  return useMemo(() => ({ data, loading, error }), [data, loading, error]);
}

export function useRiskCells() {
  const [data, setData] = useState<RiskCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    setError(null);
    fetchRiskJSON<{ cells: RiskCell[] }>("/api/v1/risk/cells")
      .then((r) => setData(r.cells || []))
      .catch((e: unknown) => {
        setError(e instanceof Error ? e : new Error(String(e)));
        setData([]);
      })
      .finally(() => setLoading(false));
  }, []);
  return useMemo(() => ({ data, loading, error }), [data, loading, error]);
}

export function useAdaptationOptions() {
  const [data, setData] = useState<AdaptationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    setError(null);
    fetchRiskJSON<{ options: AdaptationOption[] }>("/api/v1/risk/adaptation-options")
      .then((r) => setData(r.options || []))
      .catch((e: unknown) => {
        setError(e instanceof Error ? e : new Error(String(e)));
        setData([]);
      })
      .finally(() => setLoading(false));
  }, []);
  return useMemo(() => ({ data, loading, error }), [data, loading, error]);
}

export function riskColor(score: number): string {
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

export function useTopHotspots(limit = 5) {
  const { data: cells, loading: cellsLoading, error: cellsError } = useRiskCells();
  const { data: districts, loading: districtsLoading, error: districtsError } = useRiskDistricts();
  const { data: hazards, loading: hazardsLoading, error: hazardsError } = useHazardLayers();
  const loading = cellsLoading || districtsLoading || hazardsLoading;
  const error = cellsError || districtsError || hazardsError;
  const hotspots = useMemo(() => {
    const dById = new Map(districts.map((d) => [d.id, d]));
    const hById = new Map(hazards.map((h) => [h.id, h]));
    return [...cells]
      .sort((a, b) => b.intensity_score_0_100 - a.intensity_score_0_100)
      .slice(0, limit)
      .map((c) => ({
        cell: c,
        district: dById.get(c.district_id),
        hazard: hById.get(c.hazard_layer_id),
      }));
  }, [cells, districts, hazards, limit]);
  return { hotspots, loading, error };
}
