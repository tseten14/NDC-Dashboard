/**
 * Illustrative theory-of-change for urban transport (NDC / data-driven transitions framing).
 * Maps interventions → system attributes → behaviour → mode shift → intended outcomes.
 * Measured outcomes (e.g. transport CO₂) are tracked separately on the Dashboard via Climate TRACE.
 */

export type PathwayNodeKind =
  | "intervention"
  | "attribute"
  | "behaviour"
  | "aggregate"
  | "shift"
  | "outcome";

export interface PathwayNode {
  id: string;
  kind: PathwayNodeKind;
  label: string;
  /** Optional document search hints for linking to policy corpus */
  documentHints?: string[];
}

export interface PathwayEdge {
  from: string;
  to: string;
}

export interface TransportPathwayModel {
  id: string;
  title: string;
  subtitle: string;
  sector: "Transport" | "Multi-sector";
  ndcTargetHint: string;
  nodes: PathwayNode[];
  edges: PathwayEdge[];
  measuredOutcomeNote: string;
}

export const URBAN_TRANSPORT_PATHWAY: TransportPathwayModel = {
  id: "transport-urban-toc",
  title: "Urban transport intervention pathway",
  subtitle:
    "Illustrative logic model: how policy instruments can flow through behaviour to intended environmental and social outcomes. Aligns with NDC Align / data-driven transitions methodology.",
  sector: "Transport",
  ndcTargetHint: "Uganda NDC 2022 — Transport: −29% below 2030 BAU (~6.8 MtCO₂e)",
  measuredOutcomeNote:
    "Observed transport emissions and progress vs the NDC ceiling are shown on the Dashboard (Climate TRACE). This diagram explains intended causal links, not attributed reductions.",
  nodes: [
    { id: "i1", kind: "intervention", label: "30 km/h zones", documentHints: ["speed", "traffic", "road safety"] },
    { id: "i2", kind: "intervention", label: "All-weather cycle parking", documentHints: ["cycling", "non-motorised", "transport"] },
    { id: "i3", kind: "intervention", label: "Dynamic traffic lights", documentHints: ["traffic", "transport", "urban"] },
    { id: "i4", kind: "intervention", label: "Fuel taxes", documentHints: ["tax", "fuel", "fiscal"] },
    { id: "i5", kind: "intervention", label: "Increase peak-hour charges", documentHints: ["toll", "congestion", "transport"] },
    { id: "a1", kind: "attribute", label: "Traffic safety" },
    { id: "a2", kind: "attribute", label: "Cycle parking availability" },
    { id: "a3", kind: "attribute", label: "Average cycling speed" },
    { id: "a4", kind: "attribute", label: "Fuel prices" },
    { id: "a5", kind: "attribute", label: "Road tolls" },
    { id: "b1", kind: "behaviour", label: "Safety" },
    { id: "b2", kind: "behaviour", label: "Convenience" },
    { id: "b3", kind: "behaviour", label: "Status" },
    { id: "b4", kind: "behaviour", label: "Health" },
    { id: "b5", kind: "behaviour", label: "Affordability" },
    { id: "p1", kind: "aggregate", label: "People" },
    { id: "s1", kind: "shift", label: "Driving → Cycling" },
    { id: "o1", kind: "outcome", label: "Reduced CO₂" },
    { id: "o2", kind: "outcome", label: "Reduced NOx" },
    { id: "o3", kind: "outcome", label: "Road maintenance savings" },
    { id: "o4", kind: "outcome", label: "Reduced air pollution" },
    { id: "o5", kind: "outcome", label: "Reduced noise" },
    { id: "o6", kind: "outcome", label: "Reduced healthcare costs" },
  ],
  edges: [
    { from: "i1", to: "a1" },
    { from: "i2", to: "a2" },
    { from: "i3", to: "a3" },
    { from: "i4", to: "a4" },
    { from: "i5", to: "a5" },
    { from: "a1", to: "b1" },
    { from: "a2", to: "b2" },
    { from: "a3", to: "b2" },
    { from: "a3", to: "b3" },
    { from: "a3", to: "b4" },
    { from: "a4", to: "b5" },
    { from: "a5", to: "b5" },
    { from: "b1", to: "p1" },
    { from: "b2", to: "p1" },
    { from: "b3", to: "p1" },
    { from: "b4", to: "p1" },
    { from: "b5", to: "p1" },
    { from: "p1", to: "s1" },
    { from: "s1", to: "o1" },
    { from: "s1", to: "o2" },
    { from: "s1", to: "o3" },
    { from: "s1", to: "o4" },
    { from: "s1", to: "o5" },
    { from: "s1", to: "o6" },
  ],
};

export const PATHWAY_MODELS = [URBAN_TRANSPORT_PATHWAY];
