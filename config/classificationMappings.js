/**
 * Maps the supported reporting categories to exact Climate TRACE subsectors.
 *
 * This is a reviewed partial crosswalk. Categories outside it stay unavailable
 * because a plausible label is not enough to claim a complete IPCC total.
 */
export const CLASSIFICATION_MAPPINGS = Object.freeze({
  "1.A.1": { label: "Energy Industries", subsector: "electricity-generation", scope: "Electricity generation only; other energy industries are excluded." },
  "1.A.3": { label: "Transport", subsector: "road-transportation", scope: "Road transportation only; other transport modes are excluded." },
  "2.A.1": { label: "Cement Production", subsector: "cement", scope: "Climate TRACE cement estimates; process and combustion boundaries may differ from IPCC reporting." },
  "3.A.1": { label: "Enteric Fermentation", subsector: "enteric-fermentation-cattle-pasture", scope: "Cattle on pasture only; other livestock systems and species are excluded." },
  "3.C.7": { label: "Rice Cultivation", subsector: "rice-cultivation", scope: "Climate TRACE rice cultivation estimates; this is not an official IPCC category total." },
  "4.D.1": { label: "Domestic Wastewater Treatment and Discharge", subsector: "domestic-wastewater-treatment-and-discharge", scope: "Climate TRACE domestic wastewater estimates; reporting boundaries may differ." },
});

export function classificationMapping(code) {
  return typeof code === "string" && Object.hasOwn(CLASSIFICATION_MAPPINGS, code)
    ? CLASSIFICATION_MAPPINGS[code]
    : null;
}
