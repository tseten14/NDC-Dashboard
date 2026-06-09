// Brazil climate mock data layer for demo chatbot.
// Data values reflect published figures from SEEG 11.0, INPE PRODES 2022,
// and Brazil's updated 2022 NDC submission. All figures are illustrative
// for demo purposes — not official government reporting.

export type SourceType = "government" | "ngo" | "satellite" | "academic";

export interface DataSource {
  key: string;
  label: string;
  full_name: string;
  type: SourceType;
  badge_class: string;
}

export interface Citation {
  id: number;
  source_key: string;
  title: string;
  url: string;
  year: number;
  publisher: string;
}

export interface KeyStat {
  label: string;
  value: string;
  delta?: string;
  delta_dir?: "up" | "down" | "neutral";
  citation: number;
}

export interface MockResponse {
  id: string;
  keywords: string[];
  headline: string;
  // Plain text segments. Wrap numbers in [N] to produce inline citation links.
  body: string;
  key_stats: KeyStat[];
  citations: Citation[];
  sources_used: string[];
}

// ── Data sources ──────────────────────────────────────────────────────────────

export const DATA_SOURCES: Record<string, DataSource> = {
  seeg: {
    key: "seeg",
    label: "SEEG",
    full_name: "Sistema de Estimativa de Emissões de Gases de Efeito Estufa",
    type: "ngo",
    badge_class: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  },
  climate_trace: {
    key: "climate_trace",
    label: "Climate TRACE",
    full_name: "Climate TRACE Coalition",
    type: "satellite",
    badge_class: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  },
  inpe: {
    key: "inpe",
    label: "INPE / PRODES",
    full_name: "Instituto Nacional de Pesquisas Espaciais — PRODES deforestation monitor",
    type: "government",
    badge_class: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  },
  mma: {
    key: "mma",
    label: "MMA",
    full_name: "Ministério do Meio Ambiente e Mudança do Clima",
    type: "government",
    badge_class: "bg-green-500/10 text-green-700 border-green-500/20",
  },
  unfccc: {
    key: "unfccc",
    label: "UNFCCC",
    full_name: "UN Framework Convention on Climate Change — NDC Registry",
    type: "academic",
    badge_class: "bg-sky-500/10 text-sky-700 border-sky-500/20",
  },
  ibge: {
    key: "ibge",
    label: "IBGE",
    full_name: "Instituto Brasileiro de Geografia e Estatística",
    type: "government",
    badge_class: "bg-violet-500/10 text-violet-700 border-violet-500/20",
  },
  mcti: {
    key: "mcti",
    label: "MCTI / BUR",
    full_name: "Ministério da Ciência, Tecnologia e Inovação — Biennial Update Report",
    type: "government",
    badge_class: "bg-rose-500/10 text-rose-700 border-rose-500/20",
  },
};

// ── Sector timeseries (illustrative, aligned with SEEG 11.0) ──────────────────

export const BRAZIL_SECTOR_TIMESERIES: Record<string, { year: number; value: number }[]> = {
  lulucf: [
    { year: 2012, value: 1310 }, { year: 2013, value: 1280 }, { year: 2014, value: 1150 },
    { year: 2015, value: 1090 }, { year: 2016, value: 990 },  { year: 2017, value: 1050 },
    { year: 2018, value: 1100 }, { year: 2019, value: 1280 }, { year: 2020, value: 1350 },
    { year: 2021, value: 1420 }, { year: 2022, value: 1100 },
  ],
  agriculture: [
    { year: 2012, value: 540 }, { year: 2013, value: 555 }, { year: 2014, value: 565 },
    { year: 2015, value: 572 }, { year: 2016, value: 576 }, { year: 2017, value: 582 },
    { year: 2018, value: 595 }, { year: 2019, value: 608 }, { year: 2020, value: 616 },
    { year: 2021, value: 628 }, { year: 2022, value: 635 },
  ],
  energy: [
    { year: 2012, value: 380 }, { year: 2013, value: 390 }, { year: 2014, value: 398 },
    { year: 2015, value: 390 }, { year: 2016, value: 385 }, { year: 2017, value: 390 },
    { year: 2018, value: 402 }, { year: 2019, value: 410 }, { year: 2020, value: 385 },
    { year: 2021, value: 405 }, { year: 2022, value: 418 },
  ],
  industry: [
    { year: 2012, value: 110 }, { year: 2013, value: 112 }, { year: 2014, value: 108 },
    { year: 2015, value: 100 }, { year: 2016, value: 94 },  { year: 2017, value: 96 },
    { year: 2018, value: 99 },  { year: 2019, value: 98 },  { year: 2020, value: 88 },
    { year: 2021, value: 98 },  { year: 2022, value: 102 },
  ],
  waste: [
    { year: 2012, value: 88 }, { year: 2013, value: 90 }, { year: 2014, value: 93 },
    { year: 2015, value: 95 }, { year: 2016, value: 97 }, { year: 2017, value: 99 },
    { year: 2018, value: 101 },{ year: 2019, value: 103 },{ year: 2020, value: 104 },
    { year: 2021, value: 106 },{ year: 2022, value: 108 },
  ],
};

// ── Preset mock responses ─────────────────────────────────────────────────────

export const MOCK_RESPONSES: MockResponse[] = [
  // ── 1. Overall emissions overview ───────────────────────────────────────────
  {
    id: "overview",
    keywords: ["total", "overall", "emissions", "how much", "tonne", "gigatonne", "gtco2", "2022", "overview", "summary", "brazil", "brasil"],
    headline: "Brazil's Total GHG Emissions — 2022 Overview",
    body: `Brazil emitted approximately **2.36 GtCO₂e** in 2022 [1], making it the **6th largest greenhouse gas emitter** globally [2]. This figure represents a 12% decrease compared to the 2021 peak of 2.68 GtCO₂e [1], driven primarily by a decline in Amazon deforestation following the change in federal government.

Land-use change and forestry (LULUCF) remains the dominant source, accounting for **46% of gross emissions** (≈1.1 GtCO₂e) [1]. Agriculture is the second-largest sector at **27%** (≈635 MtCO₂e), followed by the energy sector at **18%** (≈418 MtCO₂e) [1][3].

Brazil's emissions trajectory is unusually volatile compared to other large emitters because LULUCF emissions fluctuate with enforcement cycles and deforestation policy — not industrial or economic cycles. Between 2019 and 2021, gross emissions rose by over 30% as deforestation enforcement weakened [1][4]. The 2022 reversal suggests policy enforcement is the single most powerful lever available to Brazil in the short term [2].

Climate TRACE satellite-derived estimates for the energy and agriculture sectors align closely with SEEG's ground-truthed inventory [3], providing independent verification of the national reporting figures.`,
    key_stats: [
      { label: "Total emissions (2022)", value: "2.36 GtCO₂e", delta: "−12% vs 2021", delta_dir: "down", citation: 1 },
      { label: "LULUCF share", value: "46%", delta: "≈1.1 Gt", delta_dir: "neutral", citation: 1 },
      { label: "Agriculture share", value: "27%", delta: "≈635 Mt", delta_dir: "neutral", citation: 1 },
      { label: "Energy share", value: "18%", delta: "≈418 Mt", delta_dir: "neutral", citation: 3 },
    ],
    citations: [
      { id: 1, source_key: "seeg", title: "SEEG 11.0 — Estimativas de Emissões de GEE do Brasil (2022)", url: "https://seeg.eco.br", year: 2023, publisher: "Observatório do Clima / SEEG" },
      { id: 2, source_key: "climate_trace", title: "Climate TRACE Country Profile: Brazil", url: "https://climatetrace.org/inventory/brazil", year: 2023, publisher: "Climate TRACE Coalition" },
      { id: 3, source_key: "mcti", title: "Brazil's 4th Biennial Update Report to the UNFCCC", url: "https://unfccc.int/documents/624681", year: 2022, publisher: "MCTI / Government of Brazil" },
      { id: 4, source_key: "inpe", title: "PRODES Amazon Deforestation Monitoring 2021", url: "https://prodes.inpe.br", year: 2022, publisher: "INPE" },
    ],
    sources_used: ["seeg", "climate_trace", "inpe", "mcti"],
  },

  // ── 2. Deforestation / LULUCF ───────────────────────────────────────────────
  {
    id: "lulucf",
    keywords: ["deforestation", "amazon", "lulucf", "forest", "land use", "land-use", "prodes", "cerrado", "tree", "logging", "trees"],
    headline: "Brazil LULUCF & Deforestation — 2022 Update",
    body: `LULUCF (Land Use, Land-Use Change and Forestry) is Brazil's largest emissions source, and deforestation is its primary driver. In 2022, INPE's PRODES system recorded **11,568 km²** of Amazon deforestation [1] — a 11.3% decline from the 2021 peak of 13,038 km² [1], following a change in federal policy and renewed IBAMA enforcement operations.

The Cerrado savannah — Brazil's second major biome — recorded **8,531 km²** of native vegetation loss in 2022 [2], and unlike the Amazon, this trajectory has not improved significantly. The Cerrado hosts 5% of the world's species but receives far less international attention and legal protection [2].

LULUCF emissions in 2022 are estimated at **1.10 GtCO₂e** by SEEG [3], down from 1.42 Gt in 2021, but still representing over 3× the level of the energy sector. The primary deforestation drivers are cattle ranching expansion (≈63% of cleared land), soy cultivation, and illegal land-grabbing for speculative real estate [3][4].

Climate TRACE's satellite-based biomass loss estimates independently corroborate SEEG's inventory, with a ±5% confidence range attributable to cloud cover interference in the wet season [5]. The convergence of two independent methodologies strengthens confidence in the headline figure.`,
    key_stats: [
      { label: "Amazon deforestation (2022)", value: "11,568 km²", delta: "−11.3% vs 2021", delta_dir: "down", citation: 1 },
      { label: "Cerrado loss (2022)", value: "8,531 km²", delta: "stable trend", delta_dir: "neutral", citation: 2 },
      { label: "LULUCF emissions (2022)", value: "1.10 GtCO₂e", delta: "−22% vs 2021 peak", delta_dir: "down", citation: 3 },
      { label: "Primary driver", value: "Cattle ranching", delta: "≈63% of cleared land", delta_dir: "neutral", citation: 4 },
    ],
    citations: [
      { id: 1, source_key: "inpe", title: "PRODES Desmatamento nos Biomas Brasileiros — Amazon 2022", url: "https://prodes.inpe.br/amazonia/", year: 2023, publisher: "INPE" },
      { id: 2, source_key: "inpe", title: "PRODES Cerrado — Monitoramento do Desmatamento 2022", url: "https://prodes.inpe.br/cerrado/", year: 2023, publisher: "INPE" },
      { id: 3, source_key: "seeg", title: "SEEG 11.0 — Mudança de Uso da Terra e Florestas", url: "https://seeg.eco.br/lulucf", year: 2023, publisher: "Observatório do Clima / SEEG" },
      { id: 4, source_key: "mma", title: "Plano de Ação para Prevenção e Controle do Desmatamento na Amazônia Legal (PPCDAm)", url: "https://www.gov.br/mma/pt-br/assuntos/clima/ppcdams", year: 2023, publisher: "MMA" },
      { id: 5, source_key: "climate_trace", title: "Climate TRACE Forestry Sector — Brazil Biomass Loss Estimates", url: "https://climatetrace.org/inventory/brazil/forestry-and-land-use", year: 2023, publisher: "Climate TRACE Coalition" },
    ],
    sources_used: ["inpe", "seeg", "mma", "climate_trace"],
  },

  // ── 3. Agriculture ──────────────────────────────────────────────────────────
  {
    id: "agriculture",
    keywords: ["agriculture", "farming", "cattle", "livestock", "methane", "enteric", "soy", "soja", "crop", "beef", "agri"],
    headline: "Brazil Agriculture Emissions — Sector Deep Dive",
    body: `Brazil's agricultural sector emitted **635 MtCO₂e** in 2022 [1], representing 27% of the national total. Unlike most major economies where energy dominates, Brazil's per-capita agricultural emissions are among the highest globally, driven by the world's largest commercial cattle herd.

**Enteric fermentation** from cattle is the single largest agricultural emission source at approximately **340 MtCO₂e** [1], producing methane (CH₄) as ruminants digest feed. Brazil's cattle herd numbered **234 million head** as of the 2022 IBGE agricultural census [2] — the largest commercial herd on Earth — and is expanding to meet global protein demand.

**Manure management** contributes an additional **58 MtCO₂e** [1]. Synthetic fertilizer (N₂O) from the growing soy and sugarcane sectors adds **87 MtCO₂e** [1][3]. Brazil is the world's largest soy exporter, with production reaching 154 million tonnes in the 2022/23 harvest [3].

Agricultural emissions have grown **+17% since 2012** [1], following herd expansion, even as LULUCF emissions have been volatile. The Brazilian government's ABC+ Plan (Agricultura de Baixo Carbono) targets low-carbon practices across 72 million hectares by 2030, which could avoid an estimated **1.1 GtCO₂e** cumulatively [4].`,
    key_stats: [
      { label: "Agriculture emissions (2022)", value: "635 MtCO₂e", delta: "+17% since 2012", delta_dir: "up", citation: 1 },
      { label: "Cattle herd (2022)", value: "234 M head", delta: "world's largest", delta_dir: "neutral", citation: 2 },
      { label: "Enteric fermentation", value: "340 MtCO₂e", delta: "54% of agri total", delta_dir: "neutral", citation: 1 },
      { label: "ABC+ Plan target", value: "72 M ha", delta: "−1.1 Gt cumulative potential", delta_dir: "down", citation: 4 },
    ],
    citations: [
      { id: 1, source_key: "seeg", title: "SEEG 11.0 — Agropecuária", url: "https://seeg.eco.br/agropecuaria", year: 2023, publisher: "Observatório do Clima / SEEG" },
      { id: 2, source_key: "ibge", title: "Censo Agropecuário 2022 — Rebanho Bovino", url: "https://www.ibge.gov.br/estatisticas/economicas/censo-agropecuario", year: 2023, publisher: "IBGE" },
      { id: 3, source_key: "mma", title: "Brazil Agricultural Production and Trade Statistics 2022/23", url: "https://www.gov.br/agricultura/", year: 2023, publisher: "MAPA / Government of Brazil" },
      { id: 4, source_key: "mma", title: "Plano ABC+ 2020–2030 — Agricultura de Baixo Carbono", url: "https://www.gov.br/mma/abc", year: 2021, publisher: "MMA / MAPA" },
    ],
    sources_used: ["seeg", "ibge", "mma"],
  },

  // ── 4. Energy sector ────────────────────────────────────────────────────────
  {
    id: "energy",
    keywords: ["energy", "electricity", "power", "oil", "gas", "fossil", "fuel", "grid", "renewable", "transport", "fuel combustion"],
    headline: "Brazil Energy Sector Emissions — 2022",
    body: `Brazil's energy sector emitted **418 MtCO₂e** in 2022 [1], accounting for 18% of gross national emissions — a relatively low share compared to global peers. This is primarily because Brazil's electricity grid is **83% renewable** [2], dominated by large hydropower (~65%), complemented by growing wind (12%) and solar (5%) capacity.

**Transport is the largest energy sub-sector** at approximately **215 MtCO₂e** [1], driven by road freight in a vast country with limited rail infrastructure, and by a large personal vehicle fleet still running predominantly on fossil fuels. Brazil's sugarcane ethanol program (ProÁlcool) partially offsets transport emissions — flex-fuel vehicles represent 74% of the light vehicle fleet [3].

**Oil and gas extraction** contributes **58 MtCO₂e** and is a growing concern, as Brazil expands deep-water pre-salt production in the Santos Basin [1][4]. Despite the government's commitment to climate targets, Petrobras's strategic plan projects continued upstream investment through 2028 [4].

**Industrial fuel combustion** (iron, steel, cement, chemicals) adds **95 MtCO₂e** [1]. Energy emissions grew +8.6% from the 2020 COVID-19 trough and have now surpassed pre-pandemic levels [1][2].`,
    key_stats: [
      { label: "Energy emissions (2022)", value: "418 MtCO₂e", delta: "+8.6% since 2020 trough", delta_dir: "up", citation: 1 },
      { label: "Renewable electricity share", value: "83%", delta: "grid predominantly clean", delta_dir: "neutral", citation: 2 },
      { label: "Transport sub-sector", value: "215 MtCO₂e", delta: "51% of energy total", delta_dir: "neutral", citation: 1 },
      { label: "Flex-fuel vehicle share", value: "74%", delta: "ethanol-capable fleet", delta_dir: "neutral", citation: 3 },
    ],
    citations: [
      { id: 1, source_key: "seeg", title: "SEEG 11.0 — Energia", url: "https://seeg.eco.br/energia", year: 2023, publisher: "Observatório do Clima / SEEG" },
      { id: 2, source_key: "mcti", title: "Balanço Energético Nacional 2022 (BEN 2022)", url: "https://www.epe.gov.br/pt/publicacoes-dados-abertos/publicacoes/balanco-energetico-nacional-2022", year: 2022, publisher: "Empresa de Pesquisa Energética (EPE)" },
      { id: 3, source_key: "ibge", title: "ANFAVEA — Anuário da Indústria Automobilística Brasileira 2023", url: "https://anfavea.com.br/anuario2023", year: 2023, publisher: "ANFAVEA" },
      { id: 4, source_key: "climate_trace", title: "Climate TRACE — Brazil Fossil Fuel Operations", url: "https://climatetrace.org/inventory/brazil/fossil-fuel-operations", year: 2023, publisher: "Climate TRACE Coalition" },
    ],
    sources_used: ["seeg", "mcti", "ibge", "climate_trace"],
  },

  // ── 5. NDC & targets ────────────────────────────────────────────────────────
  {
    id: "ndc",
    keywords: ["ndc", "target", "commitment", "pledge", "goal", "2030", "paris", "agreement", "reduce", "reduction", "nationally determined"],
    headline: "Brazil's NDC Commitments & 2030 Targets",
    body: `Brazil submitted its **updated Nationally Determined Contribution (NDC)** to the UNFCCC in November 2022 [1], strengthening its climate pledge. The new target commits Brazil to a **50% reduction in GHG emissions by 2030** compared to 2005 levels — up from the previous −43% target [1].

The 2005 baseline was **2.80 GtCO₂e** [2], meaning Brazil's 2030 absolute target is approximately **1.32 GtCO₂e**. With 2022 emissions at 2.36 Gt, the country needs to cut emissions by an additional **1.04 Gt** in eight years [2][3].

The NDC's key sectoral levers are: (1) **eliminating illegal deforestation by 2028** [1] — the single largest available reduction; (2) **restoring 12 million hectares** of degraded forests by 2030; (3) **achieving 45–50% renewable energy** in the overall energy matrix (not just electricity); and (4) **scaling low-carbon agriculture** through the ABC+ plan [4].

Brazil also submitted a conditional target of **−53% by 2030** dependent on international climate finance, particularly REDD+ payments for forest conservation [1]. The Just Transition Task Force estimates Brazil requires **USD 37 billion/year** in international support to achieve this conditional level [4]. Current international climate finance flows to Brazil are estimated at USD 7–9 billion/year [3].`,
    key_stats: [
      { label: "2030 unconditional target", value: "−50% vs 2005", delta: "≈1.32 GtCO₂e absolute", delta_dir: "down", citation: 1 },
      { label: "2030 conditional target", value: "−53% vs 2005", delta: "subject to intl. finance", delta_dir: "down", citation: 1 },
      { label: "Remaining reduction needed", value: "1.04 GtCO₂e", delta: "from 2022 baseline", delta_dir: "neutral", citation: 2 },
      { label: "Forest restoration goal", value: "12 M ha", delta: "by 2030", delta_dir: "neutral", citation: 4 },
    ],
    citations: [
      { id: 1, source_key: "unfccc", title: "Brazil Updated NDC — Contribution to the Paris Agreement (Nov 2022)", url: "https://unfccc.int/sites/default/files/NDC/2022-11/Brazil%20First%20NDC%202022%20adjustment.pdf", year: 2022, publisher: "Government of Brazil / UNFCCC" },
      { id: 2, source_key: "mcti", title: "Brazil's National GHG Inventory — 2005 Reference Year", url: "https://www.gov.br/mcti/pt-br/acompanhe-o-mcti/cgcl/inventario-nacional-de-emissoes-de-gases-de-efeito-estufa", year: 2020, publisher: "MCTI" },
      { id: 3, source_key: "seeg", title: "SEEG — Análise das Metas do Brasil no Acordo de Paris (2023)", url: "https://seeg.eco.br/analise-metas", year: 2023, publisher: "Observatório do Clima / SEEG" },
      { id: 4, source_key: "mma", title: "Brazil Climate Finance Needs Assessment — Just Transition Task Force", url: "https://www.gov.br/mma/pt-br/assuntos/clima/financiamento", year: 2023, publisher: "MMA" },
    ],
    sources_used: ["unfccc", "mcti", "seeg", "mma"],
  },
];

// ── Query function ─────────────────────────────────────────────────────────────

export function queryBrazilData(userInput: string): MockResponse {
  const q = userInput.toLowerCase();
  const scored = MOCK_RESPONSES.map((r) => ({
    response: r,
    score: r.keywords.filter((kw) => q.includes(kw)).length,
  }));
  const best = scored.sort((a, b) => b.score - a.score)[0];
  // Return the best match, or the overview as fallback.
  return best.score > 0 ? best.response : MOCK_RESPONSES[0];
}

export const SUGGESTED_QUESTIONS = [
  "What are Brazil's total greenhouse gas emissions?",
  "How much does deforestation contribute to Brazil's emissions?",
  "What are Brazil's NDC commitments for 2030?",
  "Explain Brazil's agriculture sector emissions",
  "How clean is Brazil's energy sector?",
];
