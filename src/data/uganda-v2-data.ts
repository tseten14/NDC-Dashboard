/* ═══════════════════════════════════════════════════════════════
   Uganda Integrated NDC–Development Explorer  •  v2.0 schema
   Causal chains, indicators (typology), interlinkages
   Source: Uganda Updated NDC 2022, NDP IV (FY2025/26–2029/30),
           Tenfold Growth Strategy (2025–2040)
   ═══════════════════════════════════════════════════════════════ */

export type IndicatorType =
  | "BIOPHYSICAL_STATE"
  | "ACTIVITY_BEHAVIOUR"
  | "ECONOMIC_OUTPUT"
  | "MODELLED_DERIVED";

export type MRVMethod =
  | "SATELLITE_REMOTE_SENSING"
  | "ADMINISTRATIVE_STATISTICAL"
  | "MODELLING_EXPERT"
  | "HYBRID";

export type SectorV2 = "AFOLU" | "Energy" | "Water" | "Transport" | "Waste" | "IPPU";
export type EvidenceType = "EMPIRICAL" | "MODELLED" | "MIXED" | "EXPERT_JUDGEMENT";
export type Confidence = "Low" | "Medium" | "High";

export interface NDCTargetV2 {
  ndc_target_id: string;
  sector: SectorV2;
  target_description: string;
  target_type: "Mitigation" | "Adaptation" | "CrossCutting";
  timeframes: string[];
  linked_indicator_ids: string[];
  linked_ndp_programme_ids: string[];
  linked_tenfold_objective_ids: string[];
}

export interface IndicatorV2 {
  indicator_id: string;
  indicator_name: string;
  description: string;
  indicator_type: IndicatorType;
  unit: string;
  baseline?: { value: string; year: string };
  source_documents: string[];
  used_in_targets: string[];
  ndp_alignment: { programme_id: string; programme_result: string };
  tenfold_alignment: { anchor_area: string; economic_relevance: string };
  mrv: {
    mrv_method: MRVMethod;
    primary_data_sources: string[];
    data_owner: string;
    update_frequency: string;
    confidence_level: Confidence;
  };
  sector: SectorV2;
}

export interface NDPProgrammeV2 {
  programme_id: string;
  programme_name: string;
  strategic_objective: string;
  key_results: string[];
  linked_indicator_ids: string[];
}

export interface TenfoldObjective {
  tenfold_objective_id: string;
  anchor_area: string;
  strategic_intent: string;
  relevant_indicators: string[];
  economic_channels: string[];
}

export interface Interlinkage {
  interlinkage_id: string;
  source_indicator_id: string;
  target_indicator_id: string;
  transmission_mechanism: string;
  evidence_type: EvidenceType;
  confidence: Confidence;
  relevant_sectors: SectorV2[];
}

export interface CausalStep {
  step: number;
  effect: string;
  indicator_id: string;
  indicator_type: IndicatorType;
  mrv_method: MRVMethod;
}

export interface CausalChain {
  causal_chain_id: string;
  title: string;
  trigger_intervention: { sector: SectorV2; intervention_type: string };
  steps: CausalStep[];
  answers_policy_question: string;
  article6_hook?: string;
}

/* ── NDC Targets ── */
export const ndcTargetsV2: NDCTargetV2[] = [
  { ndc_target_id: "NDC_AFOLU_01", sector: "AFOLU", target_description: "Increase forest cover and reduce deforestation by 2030", target_type: "Mitigation", timeframes: ["2025", "2030"], linked_indicator_ids: ["IND_FOREST_COVER", "IND_FOREST_LOSS_RATE", "IND_CHARCOAL_DEMAND"], linked_ndp_programme_ids: ["NDP_NR_ENV"], linked_tenfold_objective_ids: ["TF_NATURAL_CAPITAL"] },
  { ndc_target_id: "NDC_AFOLU_02", sector: "AFOLU", target_description: "Restore wetlands and improve climate-resilient land use", target_type: "Adaptation", timeframes: ["2025", "2030"], linked_indicator_ids: ["IND_WETLAND_EXTENT", "IND_AGRO_PRODUCTIVITY"], linked_ndp_programme_ids: ["NDP_NR_ENV", "NDP_AGRO"], linked_tenfold_objective_ids: ["TF_AGRO_IND"] },
  { ndc_target_id: "NDC_ENERGY_01", sector: "Energy", target_description: "Expand renewable electricity generation and reduce traditional biomass reliance", target_type: "Mitigation", timeframes: ["2025", "2030"], linked_indicator_ids: ["IND_RE_CAPACITY", "IND_CLEAN_COOKING"], linked_ndp_programme_ids: ["NDP_ENERGY"], linked_tenfold_objective_ids: ["TF_HUMAN_CAPITAL", "TF_NATURAL_CAPITAL"] },
  { ndc_target_id: "NDC_WATER_01", sector: "Water", target_description: "Improve water security and watershed protection for production", target_type: "Adaptation", timeframes: ["2025", "2030"], linked_indicator_ids: ["IND_WATER_AVAILABILITY", "IND_WETLAND_EXTENT"], linked_ndp_programme_ids: ["NDP_WATER_ENV"], linked_tenfold_objective_ids: ["TF_AGRO_IND"] },
  { ndc_target_id: "NDC_TRANSPORT_01", sector: "Transport", target_description: "Reduce transport sector emissions through modal shift and efficiency", target_type: "Mitigation", timeframes: ["2030"], linked_indicator_ids: ["IND_TRANSPORT_EMISSIONS", "IND_FUEL_INTENSITY"], linked_ndp_programme_ids: ["NDP_TRANSPORT"], linked_tenfold_objective_ids: ["TF_HUMAN_CAPITAL"] },
  { ndc_target_id: "NDC_WASTE_01", sector: "Waste", target_description: "Reduce methane emissions from solid and liquid waste streams", target_type: "Mitigation", timeframes: ["2030"], linked_indicator_ids: ["IND_WASTE_DIVERSION", "IND_METHANE_CAPTURE"], linked_ndp_programme_ids: ["NDP_URBAN"], linked_tenfold_objective_ids: ["TF_HUMAN_CAPITAL"] },
  { ndc_target_id: "NDC_IPPU_01", sector: "IPPU", target_description: "Reduce industrial process emissions through cleaner production", target_type: "Mitigation", timeframes: ["2030"], linked_indicator_ids: ["IND_INDUSTRIAL_EMISSIONS"], linked_ndp_programme_ids: ["NDP_TRADE"], linked_tenfold_objective_ids: ["TF_AGRO_IND"] },
];

/* ── Indicators ── */
export const indicatorsV2: IndicatorV2[] = [
  // AFOLU
  { indicator_id: "IND_FOREST_COVER", indicator_name: "Forest cover", description: "Proportion of national land area under forest cover", indicator_type: "BIOPHYSICAL_STATE", unit: "% land area", source_documents: ["NDC_2022", "NDP_IV"], used_in_targets: ["NDC_AFOLU_01"], ndp_alignment: { programme_id: "NDP_NR_ENV", programme_result: "Sustainable natural resource management" }, tenfold_alignment: { anchor_area: "Natural Capital", economic_relevance: "Foundation for agriculture and tourism" }, mrv: { mrv_method: "SATELLITE_REMOTE_SENSING", primary_data_sources: ["Sentinel-2", "National Forest Inventory"], data_owner: "Ministry of Water and Environment", update_frequency: "Annual", confidence_level: "High" }, sector: "AFOLU" },
  { indicator_id: "IND_FOREST_LOSS_RATE", indicator_name: "Forest loss rate", description: "Annual rate of forest area lost", indicator_type: "BIOPHYSICAL_STATE", unit: "ha/year", source_documents: ["NDC_2022"], used_in_targets: ["NDC_AFOLU_01"], ndp_alignment: { programme_id: "NDP_NR_ENV", programme_result: "Reduced land degradation" }, tenfold_alignment: { anchor_area: "Natural Capital", economic_relevance: "Reduced ecosystem service loss" }, mrv: { mrv_method: "SATELLITE_REMOTE_SENSING", primary_data_sources: ["Hansen GFC", "MWE GIS"], data_owner: "Ministry of Water and Environment", update_frequency: "Annual", confidence_level: "High" }, sector: "AFOLU" },
  { indicator_id: "IND_CHARCOAL_DEMAND", indicator_name: "Charcoal demand", description: "National household and commercial charcoal consumption", indicator_type: "ECONOMIC_OUTPUT", unit: "tonnes/year", source_documents: ["NDC_2022"], used_in_targets: ["NDC_AFOLU_01"], ndp_alignment: { programme_id: "NDP_ENERGY", programme_result: "Reduced biomass dependence" }, tenfold_alignment: { anchor_area: "Natural Capital", economic_relevance: "Reduced pressure on forests" }, mrv: { mrv_method: "ADMINISTRATIVE_STATISTICAL", primary_data_sources: ["UBOS surveys", "MEMD energy balance"], data_owner: "Ministry of Energy & Mineral Development", update_frequency: "Annual", confidence_level: "Medium" }, sector: "AFOLU" },
  { indicator_id: "IND_WETLAND_EXTENT", indicator_name: "Wetland extent", description: "Area of intact wetlands nationally", indicator_type: "BIOPHYSICAL_STATE", unit: "km²", source_documents: ["NDP_IV"], used_in_targets: ["NDC_AFOLU_02", "NDC_WATER_01"], ndp_alignment: { programme_id: "NDP_NR_ENV", programme_result: "Restored ecosystems" }, tenfold_alignment: { anchor_area: "Natural Capital", economic_relevance: "Water regulation for agriculture" }, mrv: { mrv_method: "HYBRID", primary_data_sources: ["Sentinel-2", "Wetlands Department"], data_owner: "Ministry of Water and Environment", update_frequency: "Biennial", confidence_level: "Medium" }, sector: "AFOLU" },
  { indicator_id: "IND_AGRO_PRODUCTIVITY", indicator_name: "Agricultural productivity", description: "Yield per hectare across major staple crops", indicator_type: "ECONOMIC_OUTPUT", unit: "tonnes/ha", source_documents: ["NDP_IV"], used_in_targets: ["NDC_AFOLU_02"], ndp_alignment: { programme_id: "NDP_AGRO", programme_result: "Higher commercial agricultural output" }, tenfold_alignment: { anchor_area: "Agro-Industrialisation", economic_relevance: "Export and food security base" }, mrv: { mrv_method: "ADMINISTRATIVE_STATISTICAL", primary_data_sources: ["UBOS Agriculture Survey"], data_owner: "Ministry of Agriculture (MAAIF)", update_frequency: "Annual", confidence_level: "Medium" }, sector: "AFOLU" },
  { indicator_id: "IND_AFOLU_EMISSIONS", indicator_name: "AFOLU net emissions", description: "Modelled net GHG emissions from AFOLU sector", indicator_type: "MODELLED_DERIVED", unit: "MtCO₂e", source_documents: ["NDC_2022"], used_in_targets: ["NDC_AFOLU_01"], ndp_alignment: { programme_id: "NDP_NR_ENV", programme_result: "Climate-resilient land use" }, tenfold_alignment: { anchor_area: "Natural Capital", economic_relevance: "Carbon-finance eligibility" }, mrv: { mrv_method: "MODELLING_EXPERT", primary_data_sources: ["IPCC 2006", "MWE GHG Inventory"], data_owner: "Ministry of Water and Environment", update_frequency: "Annual", confidence_level: "Medium" }, sector: "AFOLU" },

  // Energy
  { indicator_id: "IND_CLEAN_COOKING", indicator_name: "Clean cooking adoption", description: "Share of households with primary access to clean cooking solutions", indicator_type: "ACTIVITY_BEHAVIOUR", unit: "% of households", source_documents: ["NDC_2022", "NDP_IV"], used_in_targets: ["NDC_ENERGY_01"], ndp_alignment: { programme_id: "NDP_ENERGY", programme_result: "Expanded access to modern energy" }, tenfold_alignment: { anchor_area: "Human Capital & Productivity", economic_relevance: "Health, labour productivity, household savings" }, mrv: { mrv_method: "ADMINISTRATIVE_STATISTICAL", primary_data_sources: ["MEMD surveys", "UBOS DHS"], data_owner: "Ministry of Energy & Mineral Development", update_frequency: "Annual", confidence_level: "High" }, sector: "Energy" },
  { indicator_id: "IND_RE_CAPACITY", indicator_name: "Renewable electricity capacity", description: "Installed renewable generation capacity (grid + off-grid)", indicator_type: "ACTIVITY_BEHAVIOUR", unit: "MW", source_documents: ["NDC_2022", "NDP_IV"], used_in_targets: ["NDC_ENERGY_01"], ndp_alignment: { programme_id: "NDP_ENERGY", programme_result: "Reliable, sustainable energy supply" }, tenfold_alignment: { anchor_area: "Industrial Competitiveness", economic_relevance: "Power for industry and exports" }, mrv: { mrv_method: "ADMINISTRATIVE_STATISTICAL", primary_data_sources: ["ERA registry", "UEDCL"], data_owner: "Electricity Regulatory Authority", update_frequency: "Quarterly", confidence_level: "High" }, sector: "Energy" },

  // Water
  { indicator_id: "IND_WATER_AVAILABILITY", indicator_name: "Water availability in agricultural zones", description: "Composite index of surface and ground water availability", indicator_type: "BIOPHYSICAL_STATE", unit: "index 0–1", source_documents: ["NDP_IV"], used_in_targets: ["NDC_WATER_01"], ndp_alignment: { programme_id: "NDP_WATER_ENV", programme_result: "Improved water security for production" }, tenfold_alignment: { anchor_area: "Agro-Industrialisation", economic_relevance: "Yield stability and export reliability" }, mrv: { mrv_method: "HYBRID", primary_data_sources: ["MWE monitoring stations", "Hydromet models"], data_owner: "Ministry of Water and Environment", update_frequency: "Quarterly", confidence_level: "Medium" }, sector: "Water" },

  // Transport
  { indicator_id: "IND_TRANSPORT_EMISSIONS", indicator_name: "Transport sector emissions", description: "GHG emissions from road, rail, water transport", indicator_type: "MODELLED_DERIVED", unit: "MtCO₂e", source_documents: ["NDC_2022"], used_in_targets: ["NDC_TRANSPORT_01"], ndp_alignment: { programme_id: "NDP_TRANSPORT", programme_result: "Lower-carbon mobility" }, tenfold_alignment: { anchor_area: "Industrial Competitiveness", economic_relevance: "Logistics cost reduction" }, mrv: { mrv_method: "MODELLING_EXPERT", primary_data_sources: ["MoWT registry", "Fuel sales"], data_owner: "Ministry of Works and Transport", update_frequency: "Annual", confidence_level: "Medium" }, sector: "Transport" },
  { indicator_id: "IND_FUEL_INTENSITY", indicator_name: "Fleet fuel intensity", description: "Average fuel consumption per vehicle-km", indicator_type: "ACTIVITY_BEHAVIOUR", unit: "L/100 km", source_documents: ["NDC_2022"], used_in_targets: ["NDC_TRANSPORT_01"], ndp_alignment: { programme_id: "NDP_TRANSPORT", programme_result: "Efficient fleet" }, tenfold_alignment: { anchor_area: "Industrial Competitiveness", economic_relevance: "Reduced import bill" }, mrv: { mrv_method: "ADMINISTRATIVE_STATISTICAL", primary_data_sources: ["MoWT vehicle registry"], data_owner: "Ministry of Works and Transport", update_frequency: "Annual", confidence_level: "Medium" }, sector: "Transport" },

  // Waste
  { indicator_id: "IND_WASTE_DIVERSION", indicator_name: "Waste diversion rate", description: "Share of municipal waste diverted from landfill", indicator_type: "ACTIVITY_BEHAVIOUR", unit: "%", source_documents: ["NDC_2022"], used_in_targets: ["NDC_WASTE_01"], ndp_alignment: { programme_id: "NDP_URBAN", programme_result: "Sustainable urbanisation" }, tenfold_alignment: { anchor_area: "Human Capital & Productivity", economic_relevance: "Healthier cities, circular economy" }, mrv: { mrv_method: "ADMINISTRATIVE_STATISTICAL", primary_data_sources: ["KCCA records", "Local govt reports"], data_owner: "Ministry of Local Government", update_frequency: "Annual", confidence_level: "Medium" }, sector: "Waste" },
  { indicator_id: "IND_METHANE_CAPTURE", indicator_name: "Methane capture from waste", description: "CH₄ captured at landfills and treatment plants", indicator_type: "MODELLED_DERIVED", unit: "tCO₂e/year", source_documents: ["NDC_2022"], used_in_targets: ["NDC_WASTE_01"], ndp_alignment: { programme_id: "NDP_URBAN", programme_result: "Reduced urban emissions" }, tenfold_alignment: { anchor_area: "Natural Capital", economic_relevance: "Carbon-finance opportunity" }, mrv: { mrv_method: "MODELLING_EXPERT", primary_data_sources: ["IPCC FOD model"], data_owner: "Ministry of Water and Environment", update_frequency: "Annual", confidence_level: "Low" }, sector: "Waste" },

  // IPPU
  { indicator_id: "IND_INDUSTRIAL_EMISSIONS", indicator_name: "Industrial process emissions", description: "GHG from cement, lime, chemicals", indicator_type: "MODELLED_DERIVED", unit: "MtCO₂e", source_documents: ["NDC_2022"], used_in_targets: ["NDC_IPPU_01"], ndp_alignment: { programme_id: "NDP_TRADE", programme_result: "Cleaner industrial growth" }, tenfold_alignment: { anchor_area: "Industrial Competitiveness", economic_relevance: "Export-grade clean manufacturing" }, mrv: { mrv_method: "MODELLING_EXPERT", primary_data_sources: ["MTIC plant registry", "IPCC Tier 2"], data_owner: "Ministry of Trade, Industry and Cooperatives", update_frequency: "Annual", confidence_level: "Medium" }, sector: "IPPU" },
];

/* ── NDP IV programmes (v2-tagged for indicator linkage) ── */
export const ndpProgrammesV2: NDPProgrammeV2[] = [
  { programme_id: "NDP_NR_ENV", programme_name: "Natural Resources, Environment, Climate Change, Land & Water Management", strategic_objective: "Promote sustainable use and management of natural resources", key_results: ["Improved ecosystem integrity", "Reduced land degradation"], linked_indicator_ids: ["IND_FOREST_COVER", "IND_FOREST_LOSS_RATE", "IND_WETLAND_EXTENT", "IND_AFOLU_EMISSIONS"] },
  { programme_id: "NDP_ENERGY", programme_name: "Sustainable Energy Development", strategic_objective: "Reliable, affordable and sustainable energy", key_results: ["Expanded clean cooking", "Higher RE share"], linked_indicator_ids: ["IND_CLEAN_COOKING", "IND_RE_CAPACITY", "IND_CHARCOAL_DEMAND"] },
  { programme_id: "NDP_AGRO", programme_name: "Agro-Industrialization", strategic_objective: "Transform agriculture to commercial scale", key_results: ["Higher productivity", "Resilient yields"], linked_indicator_ids: ["IND_AGRO_PRODUCTIVITY"] },
  { programme_id: "NDP_WATER_ENV", programme_name: "Water Resources Management & Development", strategic_objective: "Sustainable water resources", key_results: ["Water security", "Watershed integrity"], linked_indicator_ids: ["IND_WATER_AVAILABILITY", "IND_WETLAND_EXTENT"] },
  { programme_id: "NDP_TRANSPORT", programme_name: "Transport & Integrated Logistics", strategic_objective: "Modern, efficient transport", key_results: ["Lower transport emissions"], linked_indicator_ids: ["IND_TRANSPORT_EMISSIONS", "IND_FUEL_INTENSITY"] },
  { programme_id: "NDP_URBAN", programme_name: "Sustainable Urbanization & Housing", strategic_objective: "Resilient and inclusive urbanisation", key_results: ["Improved waste systems"], linked_indicator_ids: ["IND_WASTE_DIVERSION", "IND_METHANE_CAPTURE"] },
  { programme_id: "NDP_TRADE", programme_name: "Trade, Industry & Cooperatives", strategic_objective: "Industrialisation and trade competitiveness", key_results: ["Cleaner industry"], linked_indicator_ids: ["IND_INDUSTRIAL_EMISSIONS"] },
];

/* ── Tenfold objectives ── */
export const tenfoldObjectives: TenfoldObjective[] = [
  { tenfold_objective_id: "TF_NATURAL_CAPITAL", anchor_area: "Natural Capital", strategic_intent: "Preserve and leverage forests, land and ecosystems for sustained economic growth", relevant_indicators: ["IND_FOREST_COVER", "IND_WETLAND_EXTENT", "IND_AFOLU_EMISSIONS", "IND_METHANE_CAPTURE"], economic_channels: ["Agricultural productivity", "Tourism development", "Export resilience"] },
  { tenfold_objective_id: "TF_HUMAN_CAPITAL", anchor_area: "Human Capital & Productivity", strategic_intent: "Healthier, more productive workforce via clean energy and services", relevant_indicators: ["IND_CLEAN_COOKING", "IND_WASTE_DIVERSION"], economic_channels: ["Health", "Labour productivity", "Household savings"] },
  { tenfold_objective_id: "TF_AGRO_IND", anchor_area: "Agro-Industrialisation", strategic_intent: "Anchor agro-industrial growth in resilient natural systems", relevant_indicators: ["IND_AGRO_PRODUCTIVITY", "IND_WATER_AVAILABILITY", "IND_INDUSTRIAL_EMISSIONS"], economic_channels: ["Yields", "Exports", "Value addition"] },
  { tenfold_objective_id: "TF_INDUSTRIAL_COMP", anchor_area: "Industrial Competitiveness", strategic_intent: "Energy- and logistics-enabled industrial scale-up", relevant_indicators: ["IND_RE_CAPACITY", "IND_TRANSPORT_EMISSIONS", "IND_FUEL_INTENSITY"], economic_channels: ["Industrial power", "Logistics costs"] },
];

/* ── Interlinkages ── */
export const interlinkages: Interlinkage[] = [
  { interlinkage_id: "IL_COOK_FOREST", source_indicator_id: "IND_CLEAN_COOKING", target_indicator_id: "IND_CHARCOAL_DEMAND", transmission_mechanism: "Higher clean cooking adoption substitutes charcoal as primary fuel", evidence_type: "EMPIRICAL", confidence: "High", relevant_sectors: ["Energy", "AFOLU"] },
  { interlinkage_id: "IL_CHARCOAL_LOSS", source_indicator_id: "IND_CHARCOAL_DEMAND", target_indicator_id: "IND_FOREST_LOSS_RATE", transmission_mechanism: "Reduced charcoal demand lowers pressure on forest stocks and illegal logging", evidence_type: "MIXED", confidence: "High", relevant_sectors: ["AFOLU", "Energy"] },
  { interlinkage_id: "IL_LOSS_COVER", source_indicator_id: "IND_FOREST_LOSS_RATE", target_indicator_id: "IND_FOREST_COVER", transmission_mechanism: "Lower annual loss rates stabilise and grow national forest cover", evidence_type: "EMPIRICAL", confidence: "High", relevant_sectors: ["AFOLU"] },
  { interlinkage_id: "IL_COVER_AFOLU", source_indicator_id: "IND_FOREST_COVER", target_indicator_id: "IND_AFOLU_EMISSIONS", transmission_mechanism: "Greater forest cover increases carbon stock and lowers net AFOLU emissions", evidence_type: "MODELLED", confidence: "Medium", relevant_sectors: ["AFOLU"] },
  { interlinkage_id: "IL_AFOLU_AGRO", source_indicator_id: "IND_FOREST_COVER", target_indicator_id: "IND_AGRO_PRODUCTIVITY", transmission_mechanism: "Forest ecosystem services (water regulation, soil retention) raise yields", evidence_type: "MIXED", confidence: "Medium", relevant_sectors: ["AFOLU"] },
  { interlinkage_id: "IL_WETLAND_WATER", source_indicator_id: "IND_WETLAND_EXTENT", target_indicator_id: "IND_WATER_AVAILABILITY", transmission_mechanism: "Intact wetlands buffer hydrology and improve dry-season water availability", evidence_type: "EMPIRICAL", confidence: "High", relevant_sectors: ["AFOLU", "Water"] },
  { interlinkage_id: "IL_WATER_AGRO", source_indicator_id: "IND_WATER_AVAILABILITY", target_indicator_id: "IND_AGRO_PRODUCTIVITY", transmission_mechanism: "Reliable water availability stabilises yields under climate variability", evidence_type: "EMPIRICAL", confidence: "High", relevant_sectors: ["Water", "AFOLU"] },
  { interlinkage_id: "IL_RE_INDUSTRY", source_indicator_id: "IND_RE_CAPACITY", target_indicator_id: "IND_INDUSTRIAL_EMISSIONS", transmission_mechanism: "RE supply displaces fossil-fired industrial power, lowering process-related emissions", evidence_type: "MODELLED", confidence: "Medium", relevant_sectors: ["Energy", "IPPU"] },
  { interlinkage_id: "IL_FUEL_TRANSPORT", source_indicator_id: "IND_FUEL_INTENSITY", target_indicator_id: "IND_TRANSPORT_EMISSIONS", transmission_mechanism: "Lower fleet fuel intensity directly reduces transport sector emissions", evidence_type: "EMPIRICAL", confidence: "High", relevant_sectors: ["Transport"] },
  { interlinkage_id: "IL_WASTE_METHANE", source_indicator_id: "IND_WASTE_DIVERSION", target_indicator_id: "IND_METHANE_CAPTURE", transmission_mechanism: "Diversion + organics capture increases CH₄ recovered vs. vented", evidence_type: "MIXED", confidence: "Medium", relevant_sectors: ["Waste"] },
];

/* ── Causal chains (5 steps each) ── */
export const causalChains: CausalChain[] = [
  {
    causal_chain_id: "CC_COOKING_FOREST_PROD",
    title: "Clean cooking → forests → agricultural productivity",
    trigger_intervention: { sector: "Energy", intervention_type: "Clean cooking subsidy & distribution" },
    answers_policy_question: "How does an energy intervention contribute to NDP-IV economic outcomes via AFOLU?",
    article6_hook: "Suitable for Article 6.2 cooperative approaches and 6.4 methodologies on biomass displacement; emissions reductions cleanly attributable.",
    steps: [
      { step: 1, effect: "Increase in clean cooking adoption", indicator_id: "IND_CLEAN_COOKING", indicator_type: "ACTIVITY_BEHAVIOUR", mrv_method: "ADMINISTRATIVE_STATISTICAL" },
      { step: 2, effect: "Reduction in charcoal demand", indicator_id: "IND_CHARCOAL_DEMAND", indicator_type: "ECONOMIC_OUTPUT", mrv_method: "ADMINISTRATIVE_STATISTICAL" },
      { step: 3, effect: "Reduced illegal logging and forest loss", indicator_id: "IND_FOREST_LOSS_RATE", indicator_type: "BIOPHYSICAL_STATE", mrv_method: "SATELLITE_REMOTE_SENSING" },
      { step: 4, effect: "Increase in forest carbon stock; lower AFOLU net emissions", indicator_id: "IND_AFOLU_EMISSIONS", indicator_type: "MODELLED_DERIVED", mrv_method: "MODELLING_EXPERT" },
      { step: 5, effect: "Improved agricultural resilience and tourism potential", indicator_id: "IND_AGRO_PRODUCTIVITY", indicator_type: "ECONOMIC_OUTPUT", mrv_method: "ADMINISTRATIVE_STATISTICAL" },
    ],
  },
  {
    causal_chain_id: "CC_WATERSHED_AGRO",
    title: "Watershed protection → water security → agro-industrial stability",
    trigger_intervention: { sector: "AFOLU", intervention_type: "Forest & wetland restoration in priority catchments" },
    answers_policy_question: "How do natural-capital investments stabilise agro-industrial exports?",
    article6_hook: "Adaptation-led; secondary mitigation hook through avoided wetland degradation; bundling possible with REDD+ frameworks.",
    steps: [
      { step: 1, effect: "Wetland and forest area restored", indicator_id: "IND_WETLAND_EXTENT", indicator_type: "BIOPHYSICAL_STATE", mrv_method: "HYBRID" },
      { step: 2, effect: "Improved hydrological regulation", indicator_id: "IND_WATER_AVAILABILITY", indicator_type: "BIOPHYSICAL_STATE", mrv_method: "HYBRID" },
      { step: 3, effect: "Reduced climate variability impacts on cropland", indicator_id: "IND_AGRO_PRODUCTIVITY", indicator_type: "ECONOMIC_OUTPUT", mrv_method: "ADMINISTRATIVE_STATISTICAL" },
      { step: 4, effect: "Stabilised agro-export volumes", indicator_id: "IND_AGRO_PRODUCTIVITY", indicator_type: "ECONOMIC_OUTPUT", mrv_method: "ADMINISTRATIVE_STATISTICAL" },
      { step: 5, effect: "Lower net AFOLU emissions from avoided degradation", indicator_id: "IND_AFOLU_EMISSIONS", indicator_type: "MODELLED_DERIVED", mrv_method: "MODELLING_EXPERT" },
    ],
  },
  {
    causal_chain_id: "CC_RE_INDUSTRY",
    title: "Renewable scale-up → industrial competitiveness → cleaner exports",
    trigger_intervention: { sector: "Energy", intervention_type: "Utility-scale solar + grid reliability" },
    answers_policy_question: "How does RE deployment translate into Tenfold export and industrial competitiveness gains?",
    article6_hook: "Direct mitigation outcomes from grid emission factor displacement; eligible for ITMO transfers under 6.2.",
    steps: [
      { step: 1, effect: "Installed RE capacity grows", indicator_id: "IND_RE_CAPACITY", indicator_type: "ACTIVITY_BEHAVIOUR", mrv_method: "ADMINISTRATIVE_STATISTICAL" },
      { step: 2, effect: "Reliable, lower-carbon power for industry", indicator_id: "IND_RE_CAPACITY", indicator_type: "ACTIVITY_BEHAVIOUR", mrv_method: "ADMINISTRATIVE_STATISTICAL" },
      { step: 3, effect: "Industrial process emissions decline", indicator_id: "IND_INDUSTRIAL_EMISSIONS", indicator_type: "MODELLED_DERIVED", mrv_method: "MODELLING_EXPERT" },
      { step: 4, effect: "Higher value-addition manufacturing capacity", indicator_id: "IND_INDUSTRIAL_EMISSIONS", indicator_type: "ECONOMIC_OUTPUT", mrv_method: "ADMINISTRATIVE_STATISTICAL" },
      { step: 5, effect: "Cleaner export-grade goods, improved trade balance", indicator_id: "IND_INDUSTRIAL_EMISSIONS", indicator_type: "ECONOMIC_OUTPUT", mrv_method: "ADMINISTRATIVE_STATISTICAL" },
    ],
  },
  {
    causal_chain_id: "CC_TRANSPORT_EFF",
    title: "Fleet efficiency → transport emissions → logistics cost",
    trigger_intervention: { sector: "Transport", intervention_type: "Fuel-efficiency standards + modal shift" },
    answers_policy_question: "How do transport sector reforms support both NDC and Tenfold competitiveness?",
    article6_hook: "Strong fit for sectoral crediting under 6.4 once baseline fleet intensity is established.",
    steps: [
      { step: 1, effect: "Fleet fuel intensity declines", indicator_id: "IND_FUEL_INTENSITY", indicator_type: "ACTIVITY_BEHAVIOUR", mrv_method: "ADMINISTRATIVE_STATISTICAL" },
      { step: 2, effect: "Modal shift to rail and water for freight", indicator_id: "IND_FUEL_INTENSITY", indicator_type: "ACTIVITY_BEHAVIOUR", mrv_method: "ADMINISTRATIVE_STATISTICAL" },
      { step: 3, effect: "Transport sector emissions fall", indicator_id: "IND_TRANSPORT_EMISSIONS", indicator_type: "MODELLED_DERIVED", mrv_method: "MODELLING_EXPERT" },
      { step: 4, effect: "Lower logistics costs for exporters", indicator_id: "IND_TRANSPORT_EMISSIONS", indicator_type: "ECONOMIC_OUTPUT", mrv_method: "ADMINISTRATIVE_STATISTICAL" },
      { step: 5, effect: "Improved industrial competitiveness", indicator_id: "IND_INDUSTRIAL_EMISSIONS", indicator_type: "ECONOMIC_OUTPUT", mrv_method: "ADMINISTRATIVE_STATISTICAL" },
    ],
  },
  {
    causal_chain_id: "CC_WASTE_METHANE",
    title: "Waste diversion → methane capture → urban resilience",
    trigger_intervention: { sector: "Waste", intervention_type: "Organics diversion + landfill gas capture" },
    answers_policy_question: "How do urban waste reforms deliver mitigation and human-capital co-benefits?",
    article6_hook: "Methane abatement is high-value under 6.4; strong donor and carbon-market appetite.",
    steps: [
      { step: 1, effect: "Increased waste diversion from landfill", indicator_id: "IND_WASTE_DIVERSION", indicator_type: "ACTIVITY_BEHAVIOUR", mrv_method: "ADMINISTRATIVE_STATISTICAL" },
      { step: 2, effect: "Higher CH₄ capture at sites", indicator_id: "IND_METHANE_CAPTURE", indicator_type: "MODELLED_DERIVED", mrv_method: "MODELLING_EXPERT" },
      { step: 3, effect: "Reduced urban GHG burden", indicator_id: "IND_METHANE_CAPTURE", indicator_type: "MODELLED_DERIVED", mrv_method: "MODELLING_EXPERT" },
      { step: 4, effect: "Improved urban environmental health", indicator_id: "IND_WASTE_DIVERSION", indicator_type: "ACTIVITY_BEHAVIOUR", mrv_method: "ADMINISTRATIVE_STATISTICAL" },
      { step: 5, effect: "Productivity gains via reduced disease burden", indicator_id: "IND_AGRO_PRODUCTIVITY", indicator_type: "ECONOMIC_OUTPUT", mrv_method: "ADMINISTRATIVE_STATISTICAL" },
    ],
  },
];

/* ── Lookup helpers ── */
export const getIndicator = (id: string) => indicatorsV2.find(i => i.indicator_id === id);
export const getNDCTarget = (id: string) => ndcTargetsV2.find(t => t.ndc_target_id === id);
export const getProgrammeV2 = (id: string) => ndpProgrammesV2.find(p => p.programme_id === id);
export const getTenfold = (id: string) => tenfoldObjectives.find(t => t.tenfold_objective_id === id);
export const getCausalChain = (id: string) => causalChains.find(c => c.causal_chain_id === id);

export function chainsForSectorAndIntervention(sector: SectorV2 | "All", interventionQuery: string): CausalChain[] {
  const q = interventionQuery.trim().toLowerCase();
  return causalChains.filter(c => {
    const sectorMatch = sector === "All" || c.trigger_intervention.sector === sector;
    const queryMatch = !q || c.trigger_intervention.intervention_type.toLowerCase().includes(q) || c.title.toLowerCase().includes(q);
    return sectorMatch && queryMatch;
  });
}

export function indicatorsTouchedByChain(chain: CausalChain): IndicatorV2[] {
  const ids = Array.from(new Set(chain.steps.map(s => s.indicator_id)));
  return ids.map(id => getIndicator(id)).filter(Boolean) as IndicatorV2[];
}

export function ndcTargetsTouchedByChain(chain: CausalChain): NDCTargetV2[] {
  const indicatorIds = new Set(chain.steps.map(s => s.indicator_id));
  return ndcTargetsV2.filter(t => t.linked_indicator_ids.some(id => indicatorIds.has(id)));
}

export const indicatorTypeLabel: Record<IndicatorType, string> = {
  BIOPHYSICAL_STATE: "Biophysical state",
  ACTIVITY_BEHAVIOUR: "Activity / behaviour",
  ECONOMIC_OUTPUT: "Economic output",
  MODELLED_DERIVED: "Modelled / derived",
};

export const mrvMethodLabel: Record<MRVMethod, string> = {
  SATELLITE_REMOTE_SENSING: "Satellite remote sensing",
  ADMINISTRATIVE_STATISTICAL: "Administrative / statistical",
  MODELLING_EXPERT: "Modelling / expert",
  HYBRID: "Hybrid",
};
