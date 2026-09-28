/**
 * Planning concepts associated with NDC sectors. These are not funded projects
 * or measured reductions. A policy-wide target is not a project-specific result.
 * Keep the browser and API catalogue identical; populate numerical fields only
 * with an independently sourced project appraisal and its reporting period.
 */
const concepts = [
  ["m1", "t1", "afolu", "Payment for Ecosystem Services (PES)", "Consider payments that support forest conservation."],
  ["m2", "t1", "afolu", "Bioenergy Woodlot Plantations", "Consider woodlots that reduce pressure on natural forests."],
  ["m8", "t1", "afolu", "Improved Charcoal Kilns", "Consider more efficient charcoal production."],
  ["m3", "t4", "energy", "Mini-Grid Solar Deployment", "Consider solar electricity for communities without grid access."],
  ["m4", "t4", "energy", "Improved Cookstove Distribution", "Consider cleaner cooking technologies and fuels."],
  ["m5", "t5", "transport", "E-Buses & Bus Rapid Transit", "Consider public transport and alternatives to private motor vehicles."],
  ["m9", "t5", "transport", "Road Fuel Efficiency Standards", "Consider measures to reduce fuel use in road transport."],
  ["m6", "t6", "waste", "Green Cities Waste Management", "Consider waste collection, treatment and methane reduction."],
  ["m7", "t8", "agriculture", "Agroforestry Integration Programme", "Consider integrating trees into agricultural landscapes."],
];

export const MITIGATION_CONCEPTS = concepts.map(([id, targetId, sectorId, title, description]) => ({
  id, targetId, sectorId, title, description,
  emissionsReductionPotential: null,
  emissionsReductionUnit: "",
  costEstimate: null,
  costCurrency: "USD",
  costMagnitude: "",
  confidence: "low",
  financeProvenance: {
    abatementSource: "No verified project-specific emissions reduction evidence is connected.",
    costSource: "No verified project cost evidence is connected.",
  },
}));
