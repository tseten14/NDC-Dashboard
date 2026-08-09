/**
 * The fact sheet and citations behind AI answers.
 *
 * Builds a ledger of verified figures, each paired with the source it came from
 * — the UNFCCC NDC registry, Climate TRACE — and the rules the assistant must
 * follow when citing them.
 *
 * The point is that every claim in an answer can be traced to a source. An
 * assistant that cannot cite where a number came from should not be stating it.
 */
import {
  ndcTargets,
  type NDCTarget,
  type SectorId,
} from "@/data/uganda-ndc-data";
import type { EmissionsDataContextValue } from "@/context/EmissionsDataContext";
import {
  CLIMATE_TRACE_API_SECTORS,
  getClimateTraceSectorForTarget,
  type ClimatetraceApiSector,
} from "@/lib/emissions-integration";
import { getTargetPlainLanguage } from "@/lib/target-plain-language";
import { SECTOR_LINEAGE, CLIMATE_TRACE_API_DOCS_URL } from "@/lib/data-lineage";
import type { DashboardAnalyzeContext } from "@/lib/dashboard-ai-context";
import type { AiSourceLink } from "@/data/policy-ai-mock";

// Uganda's Updated NDC (Sept 2022) on the UNFCCC NDC Registry. The earlier
// 2022-08 path 404s — this 2022-09 file is the one UNFCCC actually publishes.
export const UNFCCC_UGANDA_NDC_PDF =
  "https://unfccc.int/sites/default/files/NDC/2022-09/Updated%20NDC%20_Uganda_2022%20Final.pdf";

export const UNFCCC_NDC_REGISTRY = "https://unfccc.int/NDCREG";

export const CLIMATE_TRACE_PUBLIC_UGANDA = "https://climatetrace.org/inventory?country=UGA";

const CT_API_V7 = "https://api.climatetrace.org/v7";

/** Climate TRACE v7 sector slugs (API + public inventory). */
const CT_SECTOR_SLUG: Record<ClimatetraceApiSector, string> = {
  afolu: "forestry-and-land-use",
  agriculture: "agriculture",
  energy: "energy",
  transport: "transportation",
  waste: "waste",
  ippu: "manufacturing",
};

export interface DashboardDataFact {
  /** Citation id — LLM must copy exactly into refs[]. */
  id: string;
  /** Plain-language description of this data point. */
  claim: string;
  value: number | null;
  unit?: string;
  year?: number | null;
  source_label: string;
  /** Exact URL where this value can be verified (API endpoint or official document). */
  source_url: string;
  /** Human-readable explorer page (tooltip). */
  viewer_url: string;
  domain: string;
}

function ctEmissionsApiUrl(year: number, sectorSlug: string, gadmId = "UGA"): string {
  const params = new URLSearchParams({
    year: String(year),
    gas: "co2e_100yr",
    gadmId,
    sectors: sectorSlug,
  });
  return `${CT_API_V7}/sources/emissions?${params}`;
}

function ctCountryEmissionsApiUrl(year: number, gadmId = "UGA"): string {
  const params = new URLSearchParams({
    year: String(year),
    gas: "co2e_100yr",
    gadmId,
  });
  return `${CT_API_V7}/sources/emissions?${params}`;
}

function ctRankingsApiUrl(year: number): string {
  const params = new URLSearchParams({
    gas: "co2e_100yr",
    start: String(year),
    end: String(year),
  });
  return `${CT_API_V7}/rankings/countries?${params}`;
}

function ctPublicInventoryUrl(sectorSlug?: string): string {
  if (!sectorSlug) return CLIMATE_TRACE_PUBLIC_UGANDA;
  const params = new URLSearchParams({ country: "UGA", sector: sectorSlug });
  return `https://climatetrace.org/inventory?${params}`;
}

function domainFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\.|^api\./, "");
    if (host.includes("climatetrace")) return "climatetrace";
    if (host.includes("unfccc")) return "unfccc";
    return host.split(".")[0] || "source";
  } catch {
    return "source";
  }
}

function pushFact(facts: DashboardDataFact[], fact: DashboardDataFact) {
  if (!facts.some((f) => f.id === fact.id)) facts.push(fact);
}

export function buildDashboardFactLedger(
  emissions: EmissionsDataContextValue,
  selectedTarget: NDCTarget | null,
): DashboardDataFact[] {
  const facts: DashboardDataFact[] = [];
  const to = emissions.dashboard?.to ?? emissions.dashboard?.inventory_year ?? 2025;
  const gadmId = emissions.dashboard?.gadm_id ?? "UGA";

  for (const sector of CLIMATE_TRACE_API_SECTORS) {
    const pr = emissions.progressBySector[sector];
    const slug = CT_SECTOR_SLUG[sector];
    const lineage = SECTOR_LINEAGE[sector];
    const year = pr?.latest_year ?? to;

    if (pr?.latest_value != null) {
      pushFact(facts, {
        id: `fact_trace_${sector}_latest_${year}`,
        claim: `Climate TRACE ${lineage.sectorLabel} emissions, Uganda ${year}`,
        value: pr.latest_value,
        unit: "MtCO₂e",
        year,
        source_label: `Climate TRACE v7 API — ${lineage.sectorLabel}, ${gadmId}, ${year}`,
        source_url: ctEmissionsApiUrl(year, slug, gadmId),
        viewer_url: ctPublicInventoryUrl(slug),
        domain: "climatetrace",
      });
    }

    if (pr?.progress_pct != null) {
      pushFact(facts, {
        id: `fact_trace_${sector}_progress`,
        claim: `Progress toward NDC ceiling for ${lineage.sectorLabel} (derived from Climate TRACE vs NDC target)`,
        value: pr.progress_pct,
        unit: "%",
        year,
        source_label: `Dashboard progress calc — Climate TRACE ${lineage.sectorLabel} vs NDC target`,
        source_url: ctEmissionsApiUrl(year, slug, gadmId),
        viewer_url: ctPublicInventoryUrl(slug),
        domain: "climatetrace",
      });
    }

    if (pr?.target_value != null) {
      pushFact(facts, {
        id: `fact_ndc_sector_${sector}_target_2030`,
        claim: `NDC 2030 emissions ceiling for ${lineage.sectorLabel}`,
        value: pr.target_value,
        unit: "MtCO₂e",
        year: 2030,
        source_label: "Uganda Updated NDC 2022 — sector 2030 target (UNFCCC)",
        source_url: UNFCCC_UGANDA_NDC_PDF,
        viewer_url: UNFCCC_NDC_REGISTRY,
        domain: "unfccc",
      });
    }

    if (pr?.bau_2030 != null) {
      pushFact(facts, {
        id: `fact_ndc_sector_${sector}_bau_2030`,
        claim: `Business-as-usual 2030 projection for ${lineage.sectorLabel} (NDC annex)`,
        value: pr.bau_2030,
        unit: "MtCO₂e",
        year: 2030,
        source_label: "Uganda Updated NDC 2022 — BAU 2030 (UNFCCC)",
        source_url: UNFCCC_UGANDA_NDC_PDF,
        viewer_url: UNFCCC_NDC_REGISTRY,
        domain: "unfccc",
      });
    }

    const ts = emissions.timeseriesBySector[sector]?.timeseries;
    if (ts?.length) {
      for (const row of ts.filter((r) => r.year < 2030 && r.value != null).slice(-5)) {
        pushFact(facts, {
          id: `fact_trace_${sector}_year_${row.year}`,
          claim: `Climate TRACE ${lineage.sectorLabel} emissions, ${row.year}`,
          value: row.value,
          unit: "MtCO₂e",
          year: row.year,
          source_label: `Climate TRACE v7 API — ${lineage.sectorLabel}, ${gadmId}, ${row.year}`,
          source_url: ctEmissionsApiUrl(row.year, slug, gadmId),
          viewer_url: ctPublicInventoryUrl(slug),
          domain: "climatetrace",
        });
      }
    }
  }

  const rec = emissions.reconciliation;
  if (rec?.country_total_mt != null && rec.reference_year != null) {
    pushFact(facts, {
      id: `fact_trace_country_total_${rec.reference_year}`,
      claim: `Climate TRACE economy-wide emissions, Uganda ${rec.reference_year}`,
      value: rec.country_total_mt,
      unit: "MtCO₂e",
      year: rec.reference_year,
      source_label: `Climate TRACE v7 API — country total, UGA, ${rec.reference_year}`,
      source_url: ctCountryEmissionsApiUrl(rec.reference_year),
      viewer_url: CLIMATE_TRACE_PUBLIC_UGANDA,
      domain: "climatetrace",
    });
    pushFact(facts, {
      id: `fact_trace_ranking_${rec.reference_year}`,
      claim: `Uganda global emissions rank, ${rec.reference_year}`,
      value: emissions.dashboard?.global_rank ?? null,
      unit: "rank",
      year: rec.reference_year,
      source_label: `Climate TRACE v7 rankings API — ${rec.reference_year}`,
      source_url: ctRankingsApiUrl(rec.reference_year),
      viewer_url: CLIMATE_TRACE_PUBLIC_UGANDA,
      domain: "climatetrace",
    });
  }

  for (const t of ndcTargets) {
    const plain = getTargetPlainLanguage(t);
    pushFact(facts, {
      id: `fact_ndc_${t.id}_baseline`,
      claim: `NDC baseline (${t.baselineYear}) — ${plain.summary}`,
      value: t.baselineValue,
      unit: t.unit,
      year: t.baselineYear,
      source_label: "Uganda Updated NDC 2022 — baseline year value (UNFCCC)",
      source_url: UNFCCC_UGANDA_NDC_PDF,
      viewer_url: UNFCCC_NDC_REGISTRY,
      domain: "unfccc",
    });
    pushFact(facts, {
      id: `fact_ndc_${t.id}_target`,
      claim: `NDC ${t.targetYear} target — ${plain.summary}`,
      value: t.targetValue,
      unit: t.unit,
      year: t.targetYear,
      source_label: "Uganda Updated NDC 2022 — 2030 target (UNFCCC)",
      source_url: UNFCCC_UGANDA_NDC_PDF,
      viewer_url: UNFCCC_NDC_REGISTRY,
      domain: "unfccc",
    });
  }

  if (selectedTarget) {
    const { percent } = emissions.getProgressForTarget(selectedTarget);
    const apiSector = getClimateTraceSectorForTarget(selectedTarget);
    if (percent != null) {
      pushFact(facts, {
        id: `fact_progress_${selectedTarget.id}`,
        claim: `Progress toward selected target — ${getTargetPlainLanguage(selectedTarget).summary}`,
        value: percent,
        unit: "%",
        year: to,
        source_label: apiSector
          ? `Climate TRACE ${SECTOR_LINEAGE[apiSector].sectorLabel} vs NDC target`
          : "NDC target progress (indicator)",
        source_url: apiSector
          ? ctEmissionsApiUrl(
              emissions.progressBySector[apiSector]?.latest_year ?? to,
              CT_SECTOR_SLUG[apiSector],
              gadmId,
            )
          : UNFCCC_UGANDA_NDC_PDF,
        viewer_url: apiSector
          ? ctPublicInventoryUrl(CT_SECTOR_SLUG[apiSector])
          : UNFCCC_NDC_REGISTRY,
        domain: apiSector ? "climatetrace" : "unfccc",
      });
    }
  }

  pushFact(facts, {
    id: "fact_ct_api_docs",
    claim: "Climate TRACE API v7 methodology and field definitions",
    value: null,
    source_label: "Climate TRACE API v7 documentation",
    source_url: CLIMATE_TRACE_API_DOCS_URL,
    viewer_url: CLIMATE_TRACE_PUBLIC_UGANDA,
    domain: "climatetrace",
  });

  return facts;
}

export function buildCatalogFromFacts(facts: DashboardDataFact[]): AiSourceLink[] {
  const byId = new Map<string, AiSourceLink>();
  for (const f of facts) {
    byId.set(f.id, {
      id: f.id,
      label: f.source_label,
      url: f.source_url,
    });
  }
  return Array.from(byId.values());
}

export function factCitationGuide(facts: DashboardDataFact[]): { id: string; claim: string; value: number | null; unit?: string }[] {
  return facts
    .filter((f) => f.value != null)
    .map((f) => ({
      id: f.id,
      claim: f.claim,
      value: f.value,
      unit: f.unit,
    }));
}
