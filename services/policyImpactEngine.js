/**
 * Rule-based Policy Impact Engine — matches interventions to KCI case studies
 * and aggregates socio-economic outcomes with provenance.
 */

const SECTOR_ALIASES = {
  afolu: "AFOLU",
  agriculture: "AFOLU",
  energy: "Energy",
  transport: "Transport",
  "economy-wide": "Economy-wide",
  economy: "Economy-wide",
};

const INTERVENTION_ALIASES = {
  agricultural_credit: ["agricultural_credit", "credit", "subsidy", "finance"],
  renewable_energy_investment: ["renewable_energy_investment", "renewable", "solar", "wind", "re_investment"],
  carbon_pricing: ["carbon_pricing", "carbon_price", "tax", "ets"],
  response_measures: ["response_measures", "climate_policy", "mitigation_policy"],
  ev_transition: ["ev_transition", "electric_vehicle", "transport"],
  fuel_tax: ["fuel_tax", "fiscal"],
  efficiency_programme: ["efficiency_programme", "efficiency"],
  reforestation: ["reforestation", "forest"],
  grid_investment: ["grid_investment", "grid"],
};

function normalizeSector(sector) {
  const s = String(sector ?? "").trim();
  return SECTOR_ALIASES[s.toLowerCase()] ?? s;
}

function interventionMatchScore(requestType, caseType) {
  const req = String(requestType).toLowerCase();
  const cas = String(caseType).toLowerCase();
  if (req === cas) return 1;
  for (const [canonical, aliases] of Object.entries(INTERVENTION_ALIASES)) {
    const aliasSet = [canonical, ...aliases].map((a) => a.toLowerCase());
    const reqHit = aliasSet.some((a) => req.includes(a) || a.includes(req));
    const casHit = aliasSet.some((a) => cas.includes(a) || a.includes(cas));
    if (reqHit && casHit) return 0.85;
  }
  if (req.includes(cas) || cas.includes(req)) return 0.5;
  return 0;
}

function sectorMatchScore(requestSector, caseSector) {
  const a = normalizeSector(requestSector).toLowerCase();
  const b = normalizeSector(caseSector).toLowerCase();
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.6;
  if (b === "economy-wide" || a === "economy-wide") return 0.3;
  return 0;
}

function regionAffinity(contextCountry, caseRegion, caseCountry) {
  if (contextCountry === "UGA" && caseRegion.toLowerCase().includes("africa")) return 0.9;
  if (caseCountry.toLowerCase().includes("multi")) return 0.7;
  return 0.4;
}

/**
 * @param {import('../shared/schemas/policyImpact.schema.js').policyCaseSchema['_output']} policyCase
 * @param {{ intervention: { type: string }, parameters: { scale: number, sector: string }, context?: { country?: string } }} request
 */
export function scoreCaseMatch(policyCase, request) {
  const sectorScore = sectorMatchScore(request.parameters.sector, policyCase.sector);
  const interventionScore = interventionMatchScore(request.intervention.type, policyCase.intervention_type);
  const regionScore = regionAffinity(
    request.context?.country ?? "UGA",
    policyCase.region,
    policyCase.country,
  );
  const scaleScore = 0.8; // placeholder until case-specific scale params added

  const total =
    sectorScore * 0.4 +
    interventionScore * 0.35 +
    regionScore * 0.15 +
    scaleScore * 0.1;

  return {
    id: policyCase.id,
    title: policyCase.title,
    country: policyCase.country,
    match_score: Math.round(total * 1000) / 1000,
    sector_score: sectorScore,
    intervention_score: interventionScore,
    region_score: regionScore,
    scale_score: scaleScore,
  };
}

function averageOutcomeConfidence(policyCase) {
  if (!policyCase.outcomes.length) return 0.6;
  const sum = policyCase.outcomes.reduce((s, o) => s + o.confidence, 0);
  return sum / policyCase.outcomes.length;
}

/** Weighted confidence from top matches — primary match dominates, weak analogues don't drag score down. */
function computeOverallConfidence(topMatches) {
  if (topMatches.length === 0) return 0.25;

  const weightSum = topMatches.reduce((s, t) => s + t.match_score, 0);
  const topMatchScore = topMatches[0].match_score;

  const evidenceQuality = topMatches.reduce((s, t) => {
    const w = t.match_score / weightSum;
    return s + w * averageOutcomeConfidence(t.case);
  }, 0);

  // Emphasise best analogue (55%) plus corpus evidence quality (45%)
  const raw = topMatchScore * 0.55 + evidenceQuality * 0.45;
  return Math.round(Math.min(0.92, raw) * 100) / 100;
}

function scaleMagnitude(magnitude, scale) {
  if (!magnitude) return undefined;
  return {
    ...magnitude,
    value: Math.round(magnitude.value * scale * 100) / 100,
    low: magnitude.low != null ? Math.round(magnitude.low * scale * 100) / 100 : undefined,
    high: magnitude.high != null ? Math.round(magnitude.high * scale * 100) / 100 : undefined,
  };
}

function mergePathwayChains(cases, weights) {
  const nodes = [];
  const edges = [];
  const seen = new Set();
  for (const c of cases) {
    for (const n of c.tef_chain.nodes) {
      const key = `${n.kind}:${n.label}`;
      if (!seen.has(key)) {
        seen.add(key);
        nodes.push({ ...n, id: `${c.id}-${n.id}` });
      }
    }
    for (const e of c.tef_chain.edges) {
      edges.push({ from: `${c.id}-${e.from}`, to: `${c.id}-${e.to}` });
    }
  }
  return { nodes, edges };
}

/**
 * @param {ReturnType<import('./policyCaseData.js').getAllPolicyCases>} allCases
 * @param {object} request - validated forecast request
 */
export function runPolicyImpactForecast(allCases, request) {
  const scale = request.parameters.scale ?? 1;
  const scored = allCases
    .map((c) => ({ case: c, ...scoreCaseMatch(c, request) }))
    .filter((s) => s.match_score > 0.15)
    .sort((a, b) => b.match_score - a.match_score);

  const top = scored.slice(0, 3);
  if (top.length === 0) {
    const nearest = allCases
      .map((c) => ({ case: c, ...scoreCaseMatch(c, request) }))
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 2);

    return {
      impacts: [],
      trade_offs: nearest.flatMap((n) =>
        n.case.trade_offs.map((t) => ({
          ...t,
          provenance: `Nearest comparable case: ${n.case.title} (low confidence)`,
          case_ids: [n.case.id],
        })),
      ),
      pathway_diagram: nearest[0]?.case.tef_chain ?? { nodes: [], edges: [] },
      matched_cases: nearest.map((n) => ({
        id: n.id,
        title: n.title,
        match_score: n.match_score,
        country: n.country,
        sector_score: n.sector_score,
        intervention_score: n.intervention_score,
        region_score: n.region_score,
        scale_score: n.scale_score,
      })),
      overall_confidence: 0.25,
      disclaimers: [
        "No strong case study match for this intervention/sector combination.",
        "Results are indicative analogies only — not official government projections.",
        "Uganda-specific KCI evidence is not yet available; nearest cases shown.",
      ],
      data_source: "bundled KCI corpus — low match",
    };
  }

  const weightSum = top.reduce((s, t) => s + t.match_score, 0);
  const impactMap = new Map();

  for (const { case: policyCase, match_score, title, id } of top) {
    const w = match_score / weightSum;
    for (const outcome of policyCase.outcomes) {
      const key = outcome.category;
      const existing = impactMap.get(key);
      const provenance = `Based on ${title} (match ${Math.round(match_score * 100)}%)`;
      if (!existing) {
        impactMap.set(key, {
          category: outcome.category,
          direction: outcome.direction,
          description: outcome.description,
          magnitude: scaleMagnitude(outcome.magnitude, scale),
          confidence: outcome.confidence * w * scale,
          provenance,
          case_ids: [id],
        });
      } else {
        existing.confidence = Math.min(0.95, existing.confidence + outcome.confidence * w * 0.5);
        if (!existing.case_ids.includes(id)) existing.case_ids.push(id);
        existing.provenance += `; ${provenance}`;
        if (outcome.magnitude && existing.magnitude) {
          existing.magnitude.value =
            Math.round(((existing.magnitude.value + outcome.magnitude.value * w) / 2) * scale * 100) / 100;
        }
      }
    }
  }

  const tradeOffs = [];
  const seenTradeOffs = new Set();
  for (const { case: policyCase, match_score, title, id } of top) {
    for (const t of policyCase.trade_offs) {
      const key = `${t.positive_effect}|${t.negative_effect}`;
      if (seenTradeOffs.has(key)) continue;
      seenTradeOffs.add(key);
      tradeOffs.push({
        ...t,
        provenance: `Based on ${title} (match ${Math.round(match_score * 100)}%)`,
        case_ids: [id],
      });
    }
  }

  const overallConfidence = computeOverallConfidence(top);

  return {
    impacts: Array.from(impactMap.values()).sort((a, b) => b.confidence - a.confidence),
    trade_offs: tradeOffs,
    pathway_diagram: mergePathwayChains(
      top.map((t) => t.case),
      top.map((t) => t.match_score),
    ),
    matched_cases: top.map((t) => ({
      id: t.id,
      title: t.title,
      match_score: t.match_score,
      country: t.country,
      sector_score: t.sector_score,
      intervention_score: t.intervention_score,
      region_score: t.region_score,
      scale_score: t.scale_score,
    })),
    overall_confidence: overallConfidence,
    disclaimers: [
      "Indicative forecast — not an official government projection.",
      "Analogical matching from UNFCCC KCI case studies; Uganda-specific evidence limited.",
      `Objective: ${request.objective}`,
    ],
    data_source: "bundled KCI corpus",
  };
}
